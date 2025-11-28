import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import Settings from "./Settings";

export default function Dashboard() {
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  const [habits, setHabits] = useState([]);
  const [progress, setProgress] = useState({});
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitFrequency, setNewHabitFrequency] = useState("daily");
  const [newHabitWindowDays, setNewHabitWindowDays] = useState(7);
  const [newHabitWindowUnit, setNewHabitWindowUnit] = useState("days");
  const [newHabitTimesPerDay, setNewHabitTimesPerDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const todayIso = new Date().toISOString().slice(0, 10);

  function getWeekRange(isoDate) {
    const d = new Date(isoDate);
    const day = d.getUTCDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = (day + 6) % 7;
    const start = new Date(d);
    start.setUTCDate(d.getUTCDate() - diffToMonday);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    const toIso = (date) => date.toISOString().slice(0, 10);
    return { startIso: toIso(start), endIso: toIso(end) };
  }

  function isWithin(dateStr, startIso, endIso) {
    return dateStr >= startIso && dateStr <= endIso;
  }

  function getCustomRange(windowDays) {
    const d = new Date(todayIso);
    const start = new Date(d);
    start.setUTCDate(d.getUTCDate() - (Math.max(1, windowDays) - 1));
    const toIso = (date) => date.toISOString().slice(0, 10);
    return { startIso: toIso(start), endIso: todayIso };
  }

  function getCustomRangeMonths(windowMonths) {
    const d = new Date(todayIso);
    const start = new Date(d);
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - (Math.max(1, windowMonths) - 1));
    const end = new Date(d);
    const toIso = (date) => date.toISOString().slice(0, 10);
    return { startIso: toIso(start), endIso: toIso(end) };
  }

  function computeCount(habit, rows) {
    if (habit.frequency === "weekly") {
      const { startIso, endIso } = getWeekRange(todayIso);
      return rows
        .filter((row) => row.date && isWithin(row.date, startIso, endIso))
        .reduce((sum, row) => sum + (Number(row.done) || 0), 0);
    }

    if (habit.frequency === "monthly") {
      const { startIso, endIso } = getCustomRangeMonths(1);
      return rows
        .filter((row) => row.date && isWithin(row.date, startIso, endIso))
        .reduce((sum, row) => sum + (Number(row.done) || 0), 0);
    }

    if (habit.frequency === "custom") {
      const windowDays = habit.custom_window_days || 1;
      const windowUnit = habit.custom_window_unit || "days";
      const { startIso, endIso } =
        windowUnit === "months"
          ? getCustomRangeMonths(windowDays)
          : getCustomRange(windowDays);
      return rows
        .filter((row) => row.date && isWithin(row.date, startIso, endIso))
        .reduce((sum, row) => sum + (Number(row.done) || 0), 0);
    }

    const todayRow = rows.find(
      (row) => row.date === todayIso || row.date?.startsWith(todayIso)
    );
    return todayRow ? Number(todayRow.done) || 0 : 0;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadHabits() {
      setLoading(true);
      setError("");

      try {
        const habitsFromApi = await api.getHabits();
        if (cancelled) return;
        setHabits(habitsFromApi);

        const progressMap = {};

        await Promise.all(
          habitsFromApi.map(async (h) => {
            const rows = await api.getCompletions(h.id);
            progressMap[h.id] = computeCount(h, rows);
          })
        );

        if (!cancelled) setProgress(progressMap);
      } catch (e) {
        console.error("Failed to load habits:", e);
        if (!cancelled) {
          setError(e.message || "Failed to load habits");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHabits();
    return () => {
      cancelled = true;
    };
  }, [todayIso]);

  async function handleAddHabit(e) {
    e?.preventDefault();
    if (!newHabitName.trim()) return;

    const parsedTimes = Number(newHabitTimesPerDay);
    const safeTimesPerDay = Number.isFinite(parsedTimes)
      ? Math.max(1, Math.min(Math.round(parsedTimes), 24))
      : 1;
    const parsedWindow = Number(newHabitWindowDays);
    const safeWindowDays = Number.isFinite(parsedWindow)
      ? Math.max(1, Math.min(Math.round(parsedWindow), 365))
      : 1;
    const safeWindowUnit = ["days", "months"].includes(newHabitWindowUnit)
      ? newHabitWindowUnit
      : "days";

    setSaving(true);
    setError("");

    try {
      const created = await api.addHabit({
        name: newHabitName.trim(),
        frequency: newHabitFrequency,
        timesPerDay: safeTimesPerDay,
        customWindowDays: newHabitFrequency === "custom" ? safeWindowDays : 1,
        customWindowUnit:
          newHabitFrequency === "custom" ? safeWindowUnit : "days",
      });

      setHabits((prev) => [...prev, created]);
      setProgress((prev) => ({ ...prev, [created.id]: 0 }));
      setNewHabitName("");
      setNewHabitFrequency("daily");
      setNewHabitWindowDays(7);
      setNewHabitWindowUnit("days");
      setNewHabitTimesPerDay(1);
    } catch (e) {
      console.error("Failed to add habit:", e);
      setError(e.message || "Failed to add habit");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjust(habitId, delta = 1) {
    setSaving(true);
    setError("");

    try {
      await api.toggleHabit(habitId, todayIso, delta);
      const rows = await api.getCompletions(habitId);
      const habit = habits.find((h) => h.id === habitId);
      const count = habit ? computeCount(habit, rows) : 0;

      setProgress((prev) => ({
        ...prev,
        [habitId]: count,
      }));
    } catch (e) {
      console.error("Failed to update progress:", e);
      setError(e.message || "Failed to update progress");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(habitId) {
    if (!window.confirm("Delete this habit?")) return;

    setSaving(true);
    setError("");

    try {
      await api.deleteHabit(habitId);
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      setProgress((prev) => {
        const copy = { ...prev };
        delete copy[habitId];
        return copy;
      });
    } catch (e) {
      console.error("Failed to delete habit:", e);
      setError(e.message || "Failed to delete habit");
    } finally {
      setSaving(false);
    }
  }

  const totalTarget = habits.reduce(
    (sum, h) => sum + (h.times_per_day || 1),
    0
  );
  const totalDone = habits.reduce((sum, h) => {
    const target = h.times_per_day || 1;
    const count = Math.min(progress[h.id] || 0, target);
    return sum + count;
  }, 0);

  if (showSettings) {
    return <Settings onBack={() => setShowSettings(false)} />;
  }

  // --- Styles ---
  const container = {
    minHeight: "100vh",
    margin: 0,
    padding: "1.5rem 1rem 3rem",
    fontFamily: "'Poppins', 'Space Grotesk', system-ui, -apple-system, sans-serif",
    background: "var(--theme-bg, #0f172a)",
    color: "var(--theme-fg, #e5e7eb)",
    display: "flex",
    justifyContent: "center",
  };

  const inner = {
    width: "100%",
    maxWidth: 1100,
  };

  const headerRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.25rem",
    gap: "1rem",
  };

  const dateText = {
    fontSize: "0.8rem",
    color: "var(--theme-muted, #cbd5e1)",
    letterSpacing: "0.04em",
  };

  const titleText = {
    fontSize: "1.5rem",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    color: "var(--theme-fg, #0b1220)",
  };

  const sparkle = {
    display: "inline-block",
    width: 18,
    height: 18,
    borderRadius: "999px",
    background:
      "conic-gradient(from 90deg, var(--theme-accent2, #22c55e), #06b6d4, #6366f1, #f97316, var(--theme-accent2, #22c55e))",
  };

  const userChip = {
    padding: "0.25rem 0.65rem",
    borderRadius: 999,
    background:
      "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(45, 212, 191, 0.18))",
    fontSize: "0.85rem",
    marginBottom: "0.3rem",
  };

  const iconBtn = {
    border: "none",
    borderRadius: 999,
    padding: "0.35rem 0.75rem",
    fontSize: "0.9rem",
    backgroundColor: "rgba(226, 232, 240, 0.12)",
    color: "#e2e8f0",
    cursor: "pointer",
    boxShadow: "0 0 0 1px rgba(148, 163, 184, 0.25)",
  };

  const statusCard = {
    background: "var(--theme-card, rgba(255,255,255,0.06))",
    borderRadius: 18,
    padding: "0.9rem 1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
  };

  const pillText = {
    fontSize: "0.85rem",
    color: "var(--theme-fg, #0b1220)",
    fontWeight: 700,
  };

  const progressDot = (donePercent) => ({
    width: 10,
    height: 10,
    borderRadius: "999px",
    marginRight: 8,
    background: donePercent >= 1 && totalTarget > 0 ? "var(--theme-accent2, #22c55e)" : "#fbbf24",
    boxShadow: "0 0 0 6px rgba(251,191,36,0.15)",
  });

  const card = (isDone) => ({
    background: "var(--theme-card, rgba(255,255,255,0.06))",
    borderRadius: 18,
    padding: "1rem 1rem 1rem 0.95rem",
    boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    border: `1px solid ${isDone ? "var(--theme-accent2, rgba(34,197,94,0.4))" : "rgba(99,102,241,0.35)"}`,
    backdropFilter: "blur(6px)",
  });

  const habitName = {
    fontWeight: 700,
    fontSize: "1.05rem",
    marginBottom: "0.12rem",
    color: "var(--theme-fg, #0b1220)",
  };

  const habitMeta = {
    fontSize: "0.8rem",
    color: "var(--theme-muted, #475569)",
  };

  const cardHighlight = {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 0 0, rgba(255,255,255,0.08), transparent 55%)",
    pointerEvents: "none",
  };

  const buttonsRow = {
    display: "flex",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
    gap: "0.4rem",
  };

  const smallBtn = (variant = "light") => ({
    border: "none",
    borderRadius: 10,
    padding: "0.35rem 0.6rem",
    fontSize: "0.8rem",
    cursor: "pointer",
    background:
      variant === "primary"
        ? "linear-gradient(135deg, #6366f1, #22c55e)"
        : "rgba(226,232,240,0.1)",
    color: variant === "primary" ? "#0b1220" : "#e2e8f0",
    fontWeight: 700,
    border: variant === "primary" ? "none" : "1px solid rgba(226,232,240,0.15)",
  });

  const deleteBtn = {
    border: "none",
    borderRadius: 10,
    padding: "0.35rem 0.6rem",
    fontSize: "0.8rem",
    cursor: "pointer",
    backgroundColor: "rgba(248,113,113,0.14)",
    color: "#fecdd3",
    border: "1px solid rgba(248,113,113,0.25)",
  };

  const addForm = {
    background: "var(--theme-card, rgba(255,255,255,0.08))",
    borderRadius: 18,
    padding: "1.1rem",
    boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "0.6rem",
    border: "1px solid var(--theme-border, rgba(226,232,240,0.08))",
  };

  const input = {
    width: "100%",
    padding: "0.55rem 0.8rem",
    borderRadius: 9,
    border: "1px solid var(--theme-border, rgba(226,232,240,0.15))",
    fontSize: "0.9rem",
    outline: "none",
    backgroundColor: "var(--theme-inputBg, rgba(15,23,42,0.5))",
    color: "var(--theme-fg, #0b1220)",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
  };

  const primaryBtn = {
    marginTop: "0.2rem",
    width: "100%",
    padding: "0.7rem 0.8rem",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #22c55e, #3b82f6)",
    color: "#0b1220",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(34,197,94,0.25)",
  };

  const progressBarWrapper = {
    marginTop: 6,
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(226,232,240,0.18)",
    overflow: "hidden",
  };

  const progressBarFill = (percent) => ({
    width: `${Math.max(0, Math.min(percent * 100, 100))}%`,
    height: "100%",
    background: "linear-gradient(90deg, #22c55e, #14b8a6, #6366f1)",
    transition: "width 150ms ease-out",
  });

  const twoColGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1rem",
    alignItems: "start",
    marginBottom: "1rem",
  };

  const habitsGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "0.9rem",
    marginTop: "0.7rem",
  };

  const inputRow = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "0.5rem",
    width: "100%",
  };

  const donePercent = totalTarget ? totalDone / totalTarget : 0;

  return (
    <div style={container}>
      <div style={inner}>
        <div style={headerRow}>
          <div>
            <div style={dateText}>Today</div>
            <div style={titleText}>
              <span style={sparkle}></span>
              <span>Habit Rhythm</span>
            </div>
          </div>
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.35rem" }}>
            <div style={userChip}>
              {user?.username ? `Hi, ${user.username}` : "Welcome"}
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                type="button"
                style={iconBtn}
                onClick={() => setShowSettings(true)}
                title="Settings"
              >
                ⚙️
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "rgba(248,113,113,0.12)",
              color: "#fecdd3",
              padding: "0.55rem 0.75rem",
              borderRadius: 10,
              fontSize: "0.85rem",
              marginBottom: "0.5rem",
              border: "1px solid rgba(248,113,113,0.25)",
            }}
          >
            {error}
          </div>
        )}

        <div style={twoColGrid}>
          <div style={statusCard}>
            <div>
            <div style={{ fontSize: "0.85rem", color: "var(--theme-fg, #0b1220)" }}>
              Progress snapshot
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--theme-fg, #0b1220)" }}>
              {totalTarget === 0
                ? "No habits yet"
                : `${totalDone} of ${totalTarget} actions`}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--theme-fg, #0b1220)", marginTop: 2 }}>
              {Math.round(donePercent * 100)}% complete
            </div>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={progressDot(donePercent)}></div>
              <span style={pillText}>
                {loading
                  ? "Loading..."
                  : donePercent >= 1 && totalTarget > 0
                  ? "Nice work!"
                  : "Keep going"}
              </span>
            </div>
          </div>

          <form style={addForm} onSubmit={handleAddHabit}>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc" }}>
              Add a habit
            </div>
            <input
              style={{ ...input, textAlign: "center" }}
              placeholder="e.g. Read, Stretch, Drink water..."
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              disabled={saving}
            />
            <div style={inputRow}>
              <select
                style={{ ...input, textAlign: "center" }}
                value={newHabitFrequency}
                onChange={(e) => setNewHabitFrequency(e.target.value)}
                disabled={saving}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
              <input
                type="number"
                min={1}
                max={24}
                style={{ ...input, textAlign: "center" }}
                value={newHabitTimesPerDay}
                onChange={(e) => setNewHabitTimesPerDay(e.target.value)}
                disabled={saving}
                placeholder={
                  newHabitFrequency === "weekly"
                    ? "Times per week"
                    : newHabitFrequency === "monthly"
                    ? "Times per month"
                    : newHabitFrequency === "custom"
                    ? "Times per window"
                    : "Times per day"
                }
              />
            </div>
            {newHabitFrequency === "custom" && (
              <div style={inputRow}>
                <input
                  type="number"
                  min={1}
                  max={365}
                  style={{ ...input, textAlign: "center" }}
                  value={newHabitWindowDays}
                  onChange={(e) => setNewHabitWindowDays(e.target.value)}
                  disabled={saving}
                  placeholder="Window length"
                />
                <select
                  style={{ ...input, textAlign: "center" }}
                  value={newHabitWindowUnit}
                  onChange={(e) => setNewHabitWindowUnit(e.target.value)}
                  disabled={saving}
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </select>
              </div>
            )}
            <button type="submit" style={primaryBtn} disabled={saving}>
              {saving ? "Saving..." : "Add habit"}
            </button>
          </form>
        </div>

        {!loading && totalTarget === 0 && !error && (
          <div
            style={{
              fontSize: "0.9rem",
              color: "#cbd5e1",
              marginTop: "0.4rem",
            }}
          >
            Start small: add 1-2 habits you want to be consistent with.
          </div>
        )}

        <div style={{ marginTop: "1.1rem", fontWeight: 700, color: "#f8fafc" }}>
          Your habits
        </div>

        <div style={habitsGrid}>
          {habits.map((h) => {
            const target = h.times_per_day || 1;
            const customWindow = h.custom_window_days || 1;
            const customUnit = h.custom_window_unit || "days";
            const count = progress[h.id] || 0;
            const clampedCount = Math.min(count, target);
            const isDone = clampedCount >= target;
            const percent = target ? clampedCount / target : 0;
            const resetDelta = -Math.min(clampedCount, target);
            const frequencyLabel =
              h.frequency === "weekly"
                ? `${target}x this week`
                : h.frequency === "monthly"
                ? `${target}x this month`
                : h.frequency === "custom"
                ? `${target}x every ${customWindow} ${
                    customUnit === "months" ? "month" : "day"
                  }${customWindow > 1 ? "s" : ""}`
                : `${target}x per day`;

            return (
              <div key={h.id} style={card(isDone)}>
                <div style={cardHighlight} />
                <div style={{ position: "relative", zIndex: 1, width: "60%" }}>
                  <div style={habitName}>{h.name}</div>
                  <div style={habitMeta}>
                    {frequencyLabel} · {percent >= 1 ? "Completed" : "In progress"}
                  </div>
                  <div style={progressBarWrapper}>
                    <div style={progressBarFill(percent)} />
                  </div>
                </div>
              <div style={buttonsRow}>
                <button
                  type="button"
                  style={smallBtn("light")}
                  onClick={() => handleAdjust(h.id, -1)}
                  disabled={clampedCount <= 0 || saving}
                >
                  -1
                </button>
                <button
                  type="button"
                  style={smallBtn("primary")}
                  onClick={() => handleAdjust(h.id, isDone ? resetDelta : 1)}
                  disabled={saving}
                >
                  {isDone ? "Reset" : `+1 (${clampedCount}/${target})`}
                </button>
                <button
                  type="button"
                  style={deleteBtn}
                  onClick={() => handleDelete(h.id)}
                  disabled={saving}
                >
                  Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

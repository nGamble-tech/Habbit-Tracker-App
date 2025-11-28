import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();

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
    // Move to first day of the month (windowMonths - 1) months ago
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

    // daily -> per day
    const todayRow = rows.find(
      (row) => row.date === todayIso || row.date?.startsWith(todayIso)
    );
    return todayRow ? Number(todayRow.done) || 0 : 0;
  }

  // Load habits + today's progress counts from backend
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

      // Re-fetch completions for accurate weekly/daily aggregation
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

  function handleLogout() {
    if (window.confirm("Logout?")) {
      logout();
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

  // --- Styles (soft, colorful, mobile-friendly) ---
  const container = {
    minHeight: "100vh",
    margin: 0,
    padding: "1.5rem 1rem 2.75rem",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    background:
      "linear-gradient(160deg, #eef2ff 0%, #e0f2fe 40%, #fdf2ff 100%)",
    color: "#0f172a",
    display: "flex",
    justifyContent: "center",
  };

  const inner = {
    width: "100%",
    maxWidth: 520,
  };

  const headerRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.25rem",
  };

  const dateText = {
    fontSize: "0.8rem",
    color: "#64748b",
  };

  const titleText = {
    fontSize: "1.3rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
  };

  const sparkle = {
    display: "inline-block",
    width: 18,
    height: 18,
    borderRadius: "999px",
    background:
      "radial-gradient(circle at 30% 30%, #f9fafb 0%, #a5b4fc 40%, #6366f1 100%)",
  };

  const userChip = {
    padding: "0.25rem 0.65rem",
    borderRadius: 999,
    background:
      "linear-gradient(135deg, rgba(129, 140, 248, 0.15), rgba(59, 130, 246, 0.15))",
    fontSize: "0.8rem",
    marginBottom: "0.3rem",
  };

  const logoutBtn = {
    border: "none",
    borderRadius: 999,
    padding: "0.35rem 0.75rem",
    fontSize: "0.8rem",
    backgroundColor: "#f9fafb",
    color: "#0f172a",
    cursor: "pointer",
    boxShadow: "0 0 0 1px rgba(148, 163, 184, 0.35)",
  };

  const statusCard = {
    background:
      "linear-gradient(145deg, rgba(129,140,248,0.16), rgba(56,189,248,0.12))",
    borderRadius: 18,
    padding: "0.75rem 0.9rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.85rem",
    boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
  };

  const pillText = {
    fontSize: "0.8rem",
    color: "#0f172a",
  };

  const progressDot = (donePercent) => ({
    width: 8,
    height: 8,
    borderRadius: "999px",
    marginRight: 6,
    background: donePercent >= 1 && totalTarget > 0 ? "#22c55e" : "#facc15",
  });

  const card = (isDone) => ({
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: "0.9rem 0.9rem 0.9rem 0.8rem",
    marginTop: "0.7rem",
    boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    borderLeft: `4px solid ${isDone ? "#22c55e" : "#6366f1"}`,
  });

  const habitName = {
    fontWeight: 600,
    fontSize: "1rem",
    marginBottom: "0.12rem",
  };

  const habitMeta = {
    fontSize: "0.8rem",
    color: "#6b7280",
  };

  const cardHighlight = {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 0 0, rgba(248,250,252,0.8), transparent 55%)",
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
    backgroundColor: variant === "primary" ? "#6366f1" : "#e5e7eb",
    color: variant === "primary" ? "#f8fafc" : "#0f172a",
    fontWeight: 600,
  });

  const deleteBtn = {
    border: "none",
    borderRadius: 10,
    padding: "0.35rem 0.6rem",
    fontSize: "0.8rem",
    cursor: "pointer",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
  };

  const addForm = {
    marginTop: "1.2rem",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: "0.9rem",
    boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.6rem",
  };

  const input = {
    width: "100%",
    padding: "0.6rem 0.85rem",
    borderRadius: 999,
    border: "1px solid #d1d5db",
    fontSize: "0.9rem",
    outline: "none",
    backgroundColor: "#f9fafb",
  };

  const primaryBtn = {
    width: "100%",
    padding: "0.7rem 0.8rem",
    borderRadius: 999,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #3b82f6)",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
  };

  const progressBarWrapper = {
    marginTop: 6,
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  };

  const progressBarFill = (percent) => ({
    width: `${Math.max(0, Math.min(percent * 100, 100))}%`,
    height: "100%",
    background: "linear-gradient(90deg, #6366f1, #22c55e)",
    transition: "width 150ms ease-out",
  });

  const donePercent = totalTarget ? totalDone / totalTarget : 0;

  return (
    <div style={container}>
      <div style={inner}>
        {/* Header */}
        <div style={headerRow}>
          <div>
            <div style={dateText}>Today</div>
            <div style={titleText}>
              <span style={sparkle}></span>
              <span>Daily Habits</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={userChip}>
              {user?.username ? `Hi, ${user.username}` : "Welcome"}
            </div>
            <button style={logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {/* Status / progress */}
        <div style={statusCard}>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#0f172a" }}>
              Progress for today
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 600 }}>
              {totalTarget === 0
                ? "No habits yet"
                : `${totalDone} of ${totalTarget} actions`}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: 2 }}>
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

        {/* Error message */}
        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              padding: "0.55rem 0.75rem",
              borderRadius: 10,
              fontSize: "0.85rem",
              marginTop: "0.5rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Empty state text */}
        {!loading && totalTarget === 0 && !error && (
          <div
            style={{
              fontSize: "0.9rem",
              color: "#6b7280",
              marginTop: "0.6rem",
            }}
          >
            Start small: add 1-2 habits you want to be consistent with.
          </div>
        )}

        {/* Habit cards */}
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
              ? `${target}x every ${customWindow} ${customUnit === "months" ? "month" : "day"}${customWindow > 1 ? "s" : ""}`
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
                  style={smallBtn("light")}
                  onClick={() => handleAdjust(h.id, -1)}
                  disabled={clampedCount <= 0 || saving}
                >
                  -1
                </button>
                <button
                  style={smallBtn("primary")}
                  onClick={() => handleAdjust(h.id, isDone ? resetDelta : 1)}
                  disabled={saving}
                >
                  {isDone ? "Reset" : `+1 (${clampedCount}/${target})`}
                </button>
                <button
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

        {/* Add habit */}
        <form style={addForm} onSubmit={handleAddHabit}>
          <div style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}>
            Add a new habit
          </div>
          <input
            style={{ ...input, textAlign: "center" }}
            placeholder="e.g. Read, Stretch, Drink water..."
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            disabled={saving}
          />
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
          {newHabitFrequency === "custom" && (
            <input
              type="number"
              min={1}
              max={365}
              style={{ ...input, textAlign: "center" }}
              value={newHabitWindowDays}
              onChange={(e) => setNewHabitWindowDays(e.target.value)}
              disabled={saving}
              placeholder="Window length in days or months"
            />
          )}
          {newHabitFrequency === "custom" && (
            <select
              style={{ ...input, textAlign: "center" }}
              value={newHabitWindowUnit}
              onChange={(e) => setNewHabitWindowUnit(e.target.value)}
              disabled={saving}
            >
              <option value="days">Days</option>
              <option value="months">Months</option>
            </select>
          )}
          <button type="submit" style={primaryBtn} disabled={saving}>
            {saving ? "Saving..." : "Save habit"}
          </button>
        </form>
      </div>
    </div>
  );
}

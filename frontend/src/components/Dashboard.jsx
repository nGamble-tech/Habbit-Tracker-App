import { useEffect, useMemo, useState } from "react";

export default function Dashboard({ onLogout }) {
  const [habits, setHabits] = useState(() => JSON.parse(localStorage.getItem("habits")) || []);
  const [archived, setArchived] = useState(() => JSON.parse(localStorage.getItem("archivedHabits")) || []);
  const [dailyCompletion, setDailyCompletion] = useState(() => JSON.parse(localStorage.getItem("dailyCompletion")) || {});
  const [today] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitGoal, setNewHabitGoal] = useState("");

  // 🌤️ Dynamic background
  useEffect(() => {
    const hour = new Date().getHours();
    let gradient = "";
    if (hour >= 5 && hour < 12)
      gradient = "linear-gradient(135deg, #f3f6ff 0%, #eaf8f3 100%)";
    else if (hour >= 12 && hour < 18)
      gradient = "linear-gradient(135deg, #eae9ff 0%, #f7f7ff 100%)";
    else
      gradient = "linear-gradient(135deg, #e5e5f9 0%, #dcdcf5 100%)";

    document.body.style.background = gradient;
    document.body.style.transition = "background 1s ease";
  }, []);

  // Persist data
  useEffect(() => {
    localStorage.setItem("habits", JSON.stringify(habits));
    localStorage.setItem("archivedHabits", JSON.stringify(archived));
    localStorage.setItem("dailyCompletion", JSON.stringify(dailyCompletion));
  }, [habits, archived, dailyCompletion]);

  const todayKey = today.toISOString().slice(0, 10);
  const monthYearLabel = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const currentDayIndex = today.getDay();

  // ✅ Auto-update completion state
  useEffect(() => {
    const completedToday = archived.some((a) =>
      a.completedAt?.startsWith(new Date().toLocaleDateString())
    );
    const allDone = habits.length > 0 && habits.every((h) => h.count >= h.goal);

    setDailyCompletion((prev) => {
      const newState = { ...prev };
      if (completedToday || allDone) newState[todayKey] = "complete";
      else if (habits.length === 0 && !completedToday) delete newState[todayKey];
      return newState;
    });
  }, [habits, archived, todayKey]);

  // ---------------- Logic ----------------
  const increment = (id) =>
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id && h.count < h.goal ? { ...h, count: h.count + 1 } : h
      )
    );

  const decrement = (id) =>
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id && h.count > 0 ? { ...h, count: h.count - 1 } : h
      )
    );

  const confirmAddHabit = () => {
    if (!newHabitName.trim() || !newHabitGoal || newHabitGoal <= 0) {
      alert("Please enter valid habit details.");
      return;
    }
    setHabits((p) => [...p, { id: Date.now(), name: newHabitName, goal: +newHabitGoal, count: 0 }]);
    setShowModal(false);
    setNewHabitName("");
    setNewHabitGoal("");
  };

  const archiveHabit = (habit) => {
    const completedAt = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
    setArchived((p) => [...p, { ...habit, completedAt }]);
    setHabits((p) => p.filter((h) => h.id !== habit.id));
  };

  const restoreHabit = (id) => {
    const habit = archived.find((h) => h.id === id);
    if (!habit) return;
    setArchived((p) => p.filter((h) => h.id !== id));
    setHabits((p) => [...p, { ...habit, count: 0, completedAt: undefined }]);
  };

  const deleteArchived = (id) => {
    const habitToDelete = archived.find((h) => h.id === id);
    const remaining = archived.filter((h) => h.id !== id);
    setArchived(remaining);

    // 🧩 Remove green ring if last archive for that date is deleted
    if (habitToDelete?.completedAt) {
      const dateKey = new Date(habitToDelete.completedAt.split(" ")[0]).toISOString().slice(0, 10);
      const stillHasThatDay = remaining.some((r) =>
        r.completedAt?.startsWith(habitToDelete.completedAt.split(" ")[0])
      );
      if (!stillHasThatDay) {
        setDailyCompletion((prev) => {
          const copy = { ...prev };
          delete copy[dateKey];
          return copy;
        });
      }
    }
  };

  const clearArchives = () => {
    if (window.confirm("Clear all archived items?")) {
      setArchived([]);
      setDailyCompletion({});
    }
  };

  // ✅ Safe Logout (Preserves dashboard data)
  const logout = () => {
    if (window.confirm("Logout?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("username");
      alert("✅ Logged out successfully — your dashboard data is safe!");
      onLogout ? onLogout() : window.location.reload();
    }
  };

  const totalProgress =
    habits.length > 0
      ? Math.round(
          (habits.reduce((s, h) => s + Math.min(h.count / h.goal, 1), 0) / habits.length) * 100
        )
      : 0;

  const ringStyleForDay = (isoKey, isToday) => {
    const status = dailyCompletion[isoKey];
    const base = {
      width: 30,
      height: 30,
      borderRadius: "50%",
      margin: "6px auto 0",
      border: "2px solid transparent",
    };
    if (status === "complete") return { ...base, borderColor: "#22c55e" };
    if (status === "incomplete") return { ...base, borderColor: "#ef4444" };
    return isToday ? { ...base, borderColor: "#9D8CFF" } : base;
  };

  // 📅 Generate week days + date numbers
  const weekDates = useMemo(() => {
    const d = new Date(today);
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - d.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      return {
        key: day.toISOString().slice(0, 10),
        label: days[i],
        dateNum: day.getDate(),
      };
    });
  }, [today]);

  // ---------------- Render ----------------
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        paddingTop: "3rem",
        fontFamily: "'Times New Roman', serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 2000, padding: 20 }}>
        <h1 style={{ fontSize: 32, textAlign: "center", marginBottom: 10 }}>Daily Habits</h1>

        <div style={{ textAlign: "center", marginBottom: 20, fontSize: 20, fontWeight: 600 }}>
          {monthYearLabel}
        </div>

        {/* Logout Button */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <button onClick={logout} style={ghostBtn}>
            Logout
          </button>
        </div>

        {/* Week Rings + Dates */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            textAlign: "center",
            marginBottom: 30,
            fontWeight: 600,
          }}
        >
          {weekDates.map((d, i) => {
            const isToday = i === currentDayIndex;
            return (
              <div key={d.key}>
                <div style={{ color: isToday ? "#9D8CFF" : "#555", fontSize: 18 }}>{d.label}</div>
                <div style={{ fontSize: 14, color: "#555" }}>{d.dateNum}</div>
                <div style={ringStyleForDay(d.key, isToday)}></div>
              </div>
            );
          })}
        </div>

        {/* Progress Circle */}
        <h2 style={{ textAlign: "center", marginBottom: 25, fontSize: 26 }}>Today</h2>
        <div style={{ position: "relative", width: 250, height: 250, margin: "0 auto" }}>
          <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
            <path
              d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32"
              fill="none"
              stroke="#e5e5e5"
              strokeWidth="2.5"
            />
            <path
              d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32"
              fill="none"
              stroke="#9D8CFF"
              strokeWidth="4"
              strokeDasharray={`${totalProgress}, 100`}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            {totalProgress}%
          </div>
        </div>

        {/* Habits */}
        {habits.map((h) => {
          const done = h.count >= h.goal;
          return (
            <div
              key={h.id}
              style={{
                marginTop: 25,
                background: "#fff",
                borderRadius: 16,
                padding: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>{h.name}</h3>
                <p style={{ margin: 0, color: "#777" }}>Goal: {h.goal}</p>
              </div>
              {done ? (
                <button onClick={() => archiveHabit(h)} style={doneBtn}>
                  ✓
                </button>
              ) : (
                <div>
                  <div style={countBubble}>{h.count}</div>
                  <button onClick={() => decrement(h.id)} style={miniBtn}>
                    −
                  </button>
                  <button onClick={() => increment(h.id)} style={miniBtn}>
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <button onClick={() => setShowModal(true)} style={addMainBtn}>
          + Add Habit
        </button>

        {/* Modal */}
        {showModal && (
          <div style={modalOverlay}>
            <div style={modalBox}>
              <h2>Add New Habit</h2>
              <input
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                style={inputStyle}
                placeholder="Habit Name"
              />
              <input
                type="number"
                value={newHabitGoal}
                onChange={(e) => setNewHabitGoal(e.target.value)}
                style={inputStyle}
                placeholder="Daily Goal"
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => setShowModal(false)} style={cancelBtn}>
                  Cancel
                </button>
                <button onClick={confirmAddHabit} style={addBtn}>
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Archive */}
        <button onClick={() => setShowArchive(!showArchive)} style={ghostBtn}>
          {showArchive ? "Hide Archive" : `Show Archive (${archived.length})`}
        </button>
        {showArchive && (
          <div style={{ marginTop: 14, background: "#fff", borderRadius: 12, padding: 16 }}>
            <h3>
              Archived ({archived.length}){" "}
              <button onClick={clearArchives} style={dangerGhostBtn}>
                Clear All
              </button>
            </h3>
            {archived.length === 0
              ? "No archived habits yet."
              : archived.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "8px 0",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <b>{a.name}</b>
                      <div style={{ fontSize: 13, color: "#777" }}>
                        Completed on {a.completedAt}
                      </div>
                    </div>
                    <div>
                      <button onClick={() => restoreHabit(a.id)} style={ghostBtn}>
                        ↩ Restore
                      </button>
                      <button onClick={() => deleteArchived(a.id)} style={dangerGhostBtn}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Styles --- */
const miniBtn = { border: "none", borderRadius: "50%", width: 34, height: 34, cursor: "pointer" };
const doneBtn = { background: "#22c55e", color: "#fff", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 22, cursor: "pointer" };
const countBubble = { background: "#f1f1f1", borderRadius: "50%", width: 40, height: 40, lineHeight: "40px", textAlign: "center", fontWeight: 600 };
const addMainBtn = { background: "#9D8CFF", color: "#fff", border: "none", width: "100%", padding: "15px 0", borderRadius: 14, marginTop: 25, cursor: "pointer", fontSize: 18 };
const ghostBtn = { background: "transparent", border: "1px solid #dcd9ff", color: "#9D8CFF", padding: "6px 10px", borderRadius: 8, cursor: "pointer", marginLeft: 6 };
const dangerGhostBtn = { ...ghostBtn, borderColor: "#ffd5d5", color: "#ef4444" };
const cancelBtn = { background: "#ddd", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer" };
const addBtn = { background: "#9D8CFF", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: 8, border: "1.5px solid #ccc", marginBottom: 10 };
const modalOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "center", alignItems: "center" };
const modalBox = { background: "#fff", borderRadius: 16, padding: 20, width: "90%", maxWidth: 420 };

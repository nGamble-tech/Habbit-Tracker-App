import { useEffect, useState } from "react";

export default function Dashboard({ onLogout }) {
  const [habits, setHabits] = useState(() => {
    const saved = localStorage.getItem("habits");
    return saved ? JSON.parse(saved) : [];
  });

  const [archived, setArchived] = useState(() => {
    const saved = localStorage.getItem("archivedHabits");
    return saved ? JSON.parse(saved) : [];
  });

  const [today] = useState(new Date());
  const [username, setUsername] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitGoal, setNewHabitGoal] = useState("");

  // Set background
  useEffect(() => {
    document.body.style.background =
      "linear-gradient(180deg, #f8f9fa 0%, #eef0f6 100%)";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
  }, []);

  // ✅ Dynamically load username from all possible sources
  useEffect(() => {
    const tokenData = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    const savedName = localStorage.getItem("username");

    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.username) {
          setUsername(parsed.username);
          return;
        } else if (parsed.user && parsed.user.username) {
          setUsername(parsed.user.username);
          return;
        }
      } catch {
        console.warn("Failed to parse user data.");
      }
    }

    if (savedName) {
      setUsername(savedName);
      return;
    }

    if (tokenData) {
      try {
        const payload = JSON.parse(atob(tokenData.split(".")[1]));
        if (payload.username) {
          setUsername(payload.username);
          return;
        }
      } catch {
        console.warn("Failed to decode token username.");
      }
    }

    setUsername("Guest");
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem("habits", JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem("archivedHabits", JSON.stringify(archived));
  }, [archived]);

  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const currentDayIndex = today.getDay();

  const increment = (id) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id && h.count < h.goal ? { ...h, count: h.count + 1 } : h
      )
    );
  };

  const decrement = (id) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id && h.count > 0 ? { ...h, count: h.count - 1 } : h
      )
    );
  };

  const addHabit = () => setShowModal(true);

  const confirmAddHabit = () => {
    if (!newHabitName.trim() || !newHabitGoal || newHabitGoal <= 0) {
      alert("Please enter valid habit details.");
      return;
    }

    setHabits((prev) => [
      ...prev,
      { id: Date.now(), name: newHabitName, goal: Number(newHabitGoal), count: 0 },
    ]);

    setShowModal(false);
    setNewHabitName("");
    setNewHabitGoal("");
  };

  const archiveHabit = (habit) => {
    const completedAt = new Date().toLocaleString();
    setArchived((prev) => [...prev, { ...habit, completedAt }]);
    setHabits((prev) => prev.filter((h) => h.id !== habit.id));
  };

  const restoreHabit = (id) => {
    const habit = archived.find((h) => h.id === id);
    if (!habit) return;
    setArchived((prev) => prev.filter((h) => h.id !== id));
    setHabits((prev) => [
      ...prev,
      { ...habit, count: 0, completedAt: undefined },
    ]);
  };

  const logout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.clear();
      if (onLogout) onLogout();
      else window.location.reload();
    }
  };

  const totalProgress =
    habits.length > 0
      ? Math.round(
          (habits.reduce(
            (sum, h) => sum + Math.min(h.count / h.goal, 1),
            0
          ) /
            habits.length) *
            100
        )
      : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "3rem",
        fontFamily: "'Poppins', sans-serif",
        color: "#1f1f1f",
        width: "100vw",
      }}
    >
      <div style={{ width: "100%", maxWidth: 800, padding: 30, position: "relative" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 25,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: "600" }}>My Habits</h1>

          {/* Profile */}
          <div style={{ position: "relative" }}>
            <div
              onClick={() => setShowMenu(!showMenu)}
              style={{
                backgroundColor: "#6c63ff",
                color: "#fff",
                width: 46,
                height: 46,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "18px",
                cursor: "pointer",
                userSelect: "none",
                boxShadow: "0 3px 10px rgba(108,99,255,0.4)",
              }}
            >
              {username ? username[0].toUpperCase() : "U"}
            </div>

            {/* Dropdown Menu */}
            {showMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "60px",
                  right: 0,
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 6px 14px rgba(0,0,0,0.15)",
                  padding: "14px 18px",
                  minWidth: "180px",
                  animation: "fadeIn 0.3s ease",
                  zIndex: 10,
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    fontWeight: "600",
                    fontSize: "16px",
                  }}
                >
                  {username || "Guest"}
                </p>
                <p style={{ margin: "0 0 10px", color: "#777", fontSize: "14px" }}>
                  @{username?.toLowerCase() || "guest"}
                </p>
                <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "8px 0" }} />
                <button
                  onClick={logout}
                  style={{
                    backgroundColor: "#6c63ff",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 14px",
                    width: "100%",
                    fontSize: 15,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Week Days */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 30,
            textAlign: "center",
            fontWeight: "600",
            fontSize: 18,
          }}
        >
          {days.map((d, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div
                style={{
                  color: i === currentDayIndex ? "#6c63ff" : "#777",
                  position: "relative",
                }}
              >
                {d}
                {i === currentDayIndex && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#6c63ff",
                      margin: "6px auto 0",
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Progress Circle */}
        <h2 style={{ textAlign: "center", marginBottom: 30, fontSize: 28 }}>Today</h2>
        <div
          style={{
            position: "relative",
            width: 240,
            height: 240,
            margin: "0 auto 50px",
          }}
        >
          <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#6c63ff" />
              </linearGradient>
            </defs>
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="2.5"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="url(#progressGradient)"
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

        {/* Habit List */}
        {habits.length === 0 && (
          <p style={{ textAlign: "center", color: "#999", fontSize: 18 }}>
            No active habits. Add one below!
          </p>
        )}

        {habits.map((habit) => {
          const progress = Math.min(
            Math.round((habit.count / habit.goal) * 100),
            100
          );
          const done = progress >= 100;

          return (
            <div
              key={habit.id}
              style={{
                marginBottom: 30,
                backgroundColor: "#fff",
                padding: 22,
                borderRadius: 20,
                border: "2px solid #e5e5ff",
                boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 18,
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 20 }}>{habit.name}</h3>
                <p style={{ color: "#777", margin: 0 }}>
                  Goal: {habit.goal} per day
                </p>
              </div>

              <div style={{ textAlign: "center" }}>
                {done ? (
                  <button
                    onClick={() => archiveHabit(habit)}
                    style={{
                      backgroundColor: "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: 44,
                      height: 44,
                      fontSize: 22,
                      cursor: "pointer",
                    }}
                  >
                    ✓
                  </button>
                ) : (
                  <>
                    <div
                      style={{
                        backgroundColor: "#f1f1f1",
                        borderRadius: "50%",
                        width: 44,
                        height: 44,
                        lineHeight: "44px",
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      {habit.count}
                    </div>
                    <div>
                      <button onClick={() => decrement(habit.id)} style={miniBtn}>
                        −
                      </button>
                      <button onClick={() => increment(habit.id)} style={miniBtn}>
                        +
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Habit */}
        <button
          onClick={addHabit}
          style={{
            width: "100%",
            backgroundColor: "#6c63ff",
            border: "none",
            color: "white",
            borderRadius: 16,
            padding: "18px 0",
            fontSize: 20,
            cursor: "pointer",
            marginBottom: 40,
            boxShadow: "0 4px 12px rgba(108,99,255,0.3)",
          }}
        >
          + Add Habit
        </button>

        {/* Modal */}
        {showModal && (
          <div style={modalOverlay}>
            <div style={modalBox}>
              <h2 style={{ marginTop: 0, color: "#333" }}>Add New Habit</h2>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Habit Name</label>
                <input
                  type="text"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="e.g., Drink water"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Daily Goal</label>
                <input
                  type="number"
                  value={newHabitGoal}
                  onChange={(e) => setNewHabitGoal(e.target.value)}
                  placeholder="e.g., 5"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => setShowModal(false)} style={cancelBtn}>
                  Cancel
                </button>
                <button onClick={confirmAddHabit} style={addBtn}>
                  Add Habit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Archived */}
        {archived.length > 0 && (
          <div>
            <h2 style={{ textAlign: "center", marginBottom: 20 }}>Archived</h2>
            {archived.map((h) => (
              <div
                key={h.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>{h.name}</strong>
                    <div style={{ fontSize: 14, color: "#777" }}>
                      Completed on {h.completedAt}
                    </div>
                  </div>
                  <button
                    onClick={() => restoreHabit(h.id)}
                    style={{
                      background: "none",
                      color: "#4CAF50",
                      border: "none",
                      fontSize: 18,
                      cursor: "pointer",
                    }}
                  >
                    ↩ Restore
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

/* ---- Styles ---- */
const miniBtn = {
  backgroundColor: "#e0e0e0",
  color: "#333",
  border: "none",
  borderRadius: "50%",
  width: 34,
  height: 34,
  fontSize: 22,
  margin: "0 4px",
  cursor: "pointer",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
};

const modalBox = {
  backgroundColor: "#fff",
  borderRadius: 20,
  width: "95%",
  maxWidth: 520,
  padding: "30px 28px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
  animation: "fadeIn 0.3s ease",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1.5px solid #ccc",
  fontSize: 15,
  outline: "none",
};

const labelStyle = {
  display: "block",
  fontWeight: 600,
  marginBottom: 8,
  color: "#555",
};

const cancelBtn = {
  backgroundColor: "#e0e0e0",
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: 500,
};

const addBtn = {
  backgroundColor: "#6c63ff",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: 500,
  boxShadow: "0 3px 10px rgba(108,99,255,0.4)",
};

/* Fade animation */
const styles = document.createElement("style");
styles.innerHTML = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}`;
document.head.appendChild(styles);

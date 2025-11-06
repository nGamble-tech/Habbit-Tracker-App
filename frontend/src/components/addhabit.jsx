// frontend/src/components/AddHabit.jsx
import { useState } from "react";
import { api } from "../api";

export default function AddHabit({ onBack, onHabitAdded }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const createHabit = async (name, frequency = "daily") => {
    setLoading(true);
    setErr("");
    try {
      await api.addHabit({ name, frequency });
      if (onHabitAdded) onHabitAdded();
      alert(`✅ "${name}" added!`);
    } catch (e) {
      setErr(e.message || "Failed to add habit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "2rem auto",
        padding: 20,
        fontFamily: "Inter, sans-serif",
        backgroundColor: "#121212",
        color: "#fff",
        borderRadius: 16,
      }}
    >
      {/* Header */}
      <h2 style={{ marginBottom: 20 }}>Add a new habit</h2>

      {/* Custom Habit Buttons */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 30,
        }}
      >
        <button
          onClick={() => {
            const custom = prompt("Enter your custom habit name:");
            if (custom) createHabit(custom);
          }}
          style={buttonStyle}
        >
          <span style={{ fontSize: 20, marginRight: 10 }}>➕</span>
          Create a custom habit
        </button>

        <button
          onClick={() => alert("✨ Browse inspiring habit ideas!")}
          style={{ ...buttonStyle, backgroundColor: "#242424" }}
        >
          <span style={{ fontSize: 18, marginRight: 10 }}>🔮</span>
          Get inspired
        </button>
      </div>

      {/* Healthy Habits */}
      <h4 style={{ margin: "10px 0" }}>Healthy habits</h4>
      <div style={{ ...sectionStyle }}>
        {[
          { name: "Drink water", emoji: "💧" },
          { name: "Eat vegetables", emoji: "🥕" },
          { name: "Brush teeth", emoji: "🦷" },
        ].map((h) => (
          <button
            key={h.name}
            style={habitButton}
            onClick={() => createHabit(h.name)}
          >
            <span style={{ marginRight: 10 }}>{h.emoji}</span>
            {h.name}
          </button>
        ))}
      </div>

      {/* Unhealthy Habits */}
      <h4 style={{ margin: "15px 0 10px" }}>Unhealthy habits</h4>
      <div style={{ ...sectionStyle }}>
        {[
          { name: "Reduce social media", emoji: "📱" },
          { name: "Reduce alcohol", emoji: "🍺" },
          { name: "Eat fewer sweets", emoji: "🧁" },
        ].map((h) => (
          <button
            key={h.name}
            style={habitButton}
            onClick={() => createHabit(h.name)}
          >
            <span style={{ marginRight: 10 }}>{h.emoji}</span>
            {h.name}
          </button>
        ))}
      </div>

      {/* Footer */}
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {loading && <p style={{ color: "gray" }}>Saving...</p>}
      <button
        onClick={onBack}
        style={{
          ...buttonStyle,
          backgroundColor: "#2e2e2e",
          marginTop: 25,
        }}
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}

/* ---------- Inline Styles ---------- */
const buttonStyle = {
  backgroundColor: "#1e1e1e",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "14px 16px",
  textAlign: "left",
  fontSize: "16px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};

const sectionStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  backgroundColor: "#1a1a1a",
  borderRadius: 12,
  padding: 10,
};

const habitButton = {
  ...buttonStyle,
  backgroundColor: "transparent",
  border: "none",
  justifyContent: "flex-start",
};

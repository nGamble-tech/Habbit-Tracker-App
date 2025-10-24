import { useEffect, useState } from "react";
import { api } from "../api";

export default function Dashboard({ onLogout }) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [reminder, setReminder] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await api.getHabits();
      setHabits(data);
    } catch (e) {
      setErr(e.message || "Failed to load habits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addHabit = async (e) => {
    e.preventDefault();
    try {
      await api.addHabit({ name, frequency, reminder_time: reminder || null });
      setName(""); setReminder(""); setFrequency("daily");
      await load();
    } catch (e) {
      alert(e.message || "Failed to add habit");
    }
  };

  const markDone = async (id) => {
    try {
      await api.markDone(id);
      await load();
    } catch (e) {
      alert(e.message || "Failed to mark done");
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "2rem auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Your Habits</h2>
        <button onClick={() => { localStorage.removeItem("token"); onLogout(); }}>Logout</button>
      </div>

      {loading ? <p>Loading...</p> : err ? <p style={{ color: "crimson" }}>{err}</p> : (
        habits.length ? (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {habits.map(h => (
              <li key={h.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{h.name}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {h.frequency} {h.reminder_time ? `• reminder ${h.reminder_time}` : ""}
                    </div>
                  </div>
                  <button onClick={() => markDone(h.id)}>Mark Done</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p>No habits yet. Add one below.</p>
      )}

      <h3 style={{ marginTop: 24 }}>Add Habit</h3>
      <form onSubmit={addHabit} style={{ display: "grid", gridTemplateColumns: "1fr 180px 160px 120px", gap: 8 }}>
        <input placeholder="Habit name" value={name} onChange={(e) => setName(e.target.value)} required />
        <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
          <option value="daily">daily</option>
          <option value="weekly">weekly</option>
        </select>
        <input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}

import { useEffect, useState } from "react";

export default function Settings({ onBack }) {
  const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "true");
  const [notifications, setNotifications] = useState(
    localStorage.getItem("notifications") === "true"
  );
  const [email, setEmail] = useState(localStorage.getItem("alertEmail") || "");
  const [username, setUsername] = useState("Guest");

  // ✅ Load username properly from localStorage (token payload or saved key)
  useEffect(() => {
    const userData = localStorage.getItem("user");
    const storedName = localStorage.getItem("username");

    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        // handles both {username} and {user:{username}}
        const name =
          parsed.username || parsed.user?.username || storedName || "Guest";
        setUsername(name);
      } catch {
        setUsername(storedName || "Guest");
      }
    } else if (storedName) {
      setUsername(storedName);
    } else {
      setUsername("Guest");
    }
  }, []);

  // ✅ Persist settings
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    localStorage.setItem("notifications", notifications);
    localStorage.setItem("alertEmail", email);
  }, [darkMode, notifications, email]);

  // ✅ Adjust background color for dark/light
  useEffect(() => {
    document.body.style.background = darkMode
      ? "linear-gradient(180deg, #1c1c1c 0%, #2e2e2e 100%)"
      : "linear-gradient(180deg, #f8f9fa 0%, #eef0f6 100%)";
    document.body.style.color = darkMode ? "#f1f1f1" : "#1f1f1f";
  }, [darkMode]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "3rem",
        fontFamily: "'Poppins', sans-serif",
        color: darkMode ? "#f1f1f1" : "#1f1f1f",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400, padding: 20 }}>
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            fontSize: 22,
            cursor: "pointer",
            color: darkMode ? "#a78bfa" : "#6c63ff",
            marginBottom: 10,
          }}
        >
          ← Back
        </button>

        <h1
          style={{
            textAlign: "center",
            backgroundColor: darkMode ? "#444" : "#dcdcdc",
            borderRadius: 12,
            padding: "10px 0",
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          Settings
        </h1>

        {/* Profile Section */}
        <div
          style={{
            backgroundColor: darkMode ? "#6c63ff33" : "#e0d9ff",
            borderRadius: 50,
            padding: "20px 10px",
            textAlign: "center",
            margin: "25px 0",
          }}
        >
          <h2 style={{ margin: "0 0 5px", fontSize: 20 }}>{username}</h2>
          <p style={{ margin: 0, color: "#555" }}>
            {email ? email : "No email set"}
          </p>
        </div>

        {/* Preferences */}
        <div
          style={{
            backgroundColor: darkMode ? "#6c63ff33" : "#d6ccff",
            borderRadius: 20,
            padding: 20,
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          }}
        >
          {/* Notifications */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              🔔 <span>Push Notifications</span>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
            />
          </div>

          {/* Dark Mode */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              🌙 <span>Dark Mode</span>
            </div>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
          </div>

          {/* Email Input */}
          <div style={{ marginTop: 20 }}>
            <label style={{ fontWeight: 600 }}>Alert Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. johndoe@gmail.com"
              style={{
                width: "100%",
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1.5px solid #ccc",
                outline: "none",
                fontSize: 15,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

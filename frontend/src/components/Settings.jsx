import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { applyTheme, getStoredTheme } from "../styles/theme";

export default function Settings({ onBack }) {
  const { user, login, logout } = useAuth();

  const [theme, setTheme] = useState(getStoredTheme());
  const [reminderTime, setReminderTime] = useState(
    localStorage.getItem("reminder_time") || ""
  );
  const [newUsername, setNewUsername] = useState(
    localStorage.getItem("username") || ""
  );
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(
    localStorage.getItem("push_enabled") === "true"
  );
  const [pushEndpoint, setPushEndpoint] = useState(
    localStorage.getItem("push_endpoint") || ""
  );

  // Prime profile data
  useEffect(() => {
    (async () => {
      try {
        const profile = await api.getProfile();
        if (profile?.username) {
          setNewUsername(profile.username);
          localStorage.setItem("username", profile.username);
        }
        if (profile?.theme) {
          setTheme(profile.theme);
          localStorage.setItem("theme", profile.theme);
        }
        if (profile?.reminder_time !== undefined) {
          setReminderTime(profile.reminder_time || "");
          localStorage.setItem("reminder_time", profile.reminder_time || "");
        }
      } catch (e) {
        console.warn("Profile fetch failed:", e);
      }
    })();
  }, []);

  // Apply theme when saved/changed
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const saveAppearance = async () => {
    setBusy(true);
    setStatus("");
    try {
      const updated = await api.updateProfile({ theme });
      localStorage.setItem("theme", updated.theme);
      if (login) login({ ...(user || {}), ...updated });
      setStatus("Appearance saved");
    } catch (e) {
      setStatus(e.message || "Failed to save appearance");
    } finally {
      setBusy(false);
    }
  };

  const saveReminder = async () => {
    setBusy(true);
    setStatus("");
    try {
      const updated = await api.updateProfile({ reminderTime: reminderTime || null });
      localStorage.setItem("reminder_time", updated.reminder_time || "");
      if (login) login({ ...(user || {}), ...updated });
      setStatus("Reminder saved");
    } catch (e) {
      setStatus(e.message || "Failed to save reminder");
    } finally {
      setBusy(false);
    }
  };

  async function registerPush() {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Notifications not granted");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const { publicKey } = await api.getVapidPublicKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey || ""),
      });
      await api.subscribePush(sub);
      localStorage.setItem("push_enabled", "true");
      localStorage.setItem("push_endpoint", sub.endpoint);
      setPushEnabled(true);
      setPushEndpoint(sub.endpoint);
      setStatus("Push enabled");
    } catch (e) {
      console.error("Push enable failed:", e);
      setStatus(e.message || "Failed to enable push");
      setPushEnabled(false);
    }
  }

  async function disablePush() {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.unsubscribePush(sub.endpoint);
          await sub.unsubscribe();
        }
      }
    } catch (e) {
      console.warn("Failed to unsubscribe push:", e);
    } finally {
      localStorage.removeItem("push_enabled");
      localStorage.removeItem("push_endpoint");
      setPushEnabled(false);
      setPushEndpoint("");
      setStatus("Push disabled");
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const saveUsername = async () => {
    if (!newUsername.trim()) return setStatus("Enter a username");
    setBusy(true);
    setStatus("");
    try {
      const res = await api.updateUsername(newUsername.trim());
      if (res.token) localStorage.setItem("token", res.token);
      if (login) login({ ...(user || {}), ...(res.user || {}), theme, reminder_time: reminderTime });
      localStorage.setItem("username", newUsername.trim());
      setStatus("Username updated");
    } catch (e) {
      setStatus(e.message || "Failed to update username");
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return setStatus("Fill all password fields");
    }
    if (newPassword !== confirmPassword) {
      return setStatus("New passwords do not match");
    }
    setBusy(true);
    setStatus("");
    try {
      await api.changePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus("Password updated (re-login may be required)");
    } catch (e) {
      setStatus(e.message || "Failed to change password");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete your account and all data?")) return;
    setBusy(true);
    setStatus("");
    try {
      await api.deleteAccountAuth();
      logout();
    } catch (e) {
      setStatus(e.message || "Failed to delete account");
    } finally {
      setBusy(false);
    }
  };

  const sendTestPush = async () => {
    setStatus("Sending test push...");
    try {
      await api.sendTestPush();
      setStatus("Test push sent (check your device)");
    } catch (e) {
      setStatus(e.message || "Failed to send test push");
    }
  };

  const card = {
    background: "var(--theme-card, rgba(255,255,255,0.06))",
    border: "1px solid var(--theme-border, rgba(226,232,240,0.12))",
    borderRadius: 16,
    padding: "1rem",
    boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
    color: "var(--theme-fg, #e2e8f0)",
  };

  const label = { fontWeight: 600, fontSize: "0.9rem", marginBottom: 6 };
  const input = {
    width: "100%",
    padding: "0.55rem 0.8rem",
    borderRadius: 10,
    border: "1px solid var(--theme-border, rgba(226,232,240,0.2))",
    background: "var(--theme-inputBg, rgba(15,23,42,0.55))",
    color: "var(--theme-fg, #e2e8f0)",
    boxSizing: "border-box",
  };
  const row = { display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" };
  const btn = {
    border: "none",
    borderRadius: 10,
    padding: "0.6rem 0.8rem",
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        height: "100dvh",
        padding: "1.5rem",
        background: "var(--theme-bg, #0f172a)",
        color: "var(--theme-fg, #e2e8f0)",
        fontFamily: "'Poppins', 'Space Grotesk', system-ui, sans-serif",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontWeight: 800 }}>Settings</h2>
          <button
            type="button"
            onClick={onBack}
            style={{ ...btn, background: "rgba(226,232,240,0.12)", color: "var(--theme-fg, #e2e8f0)" }}
          >
            ← Back
          </button>
        </div>

        <div style={card}>
          <div style={label}>Appearance</div>
          <div style={row}>
            <select
              style={input}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              disabled={busy}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System Settings</option>
            </select>
            <button
              type="button"
              onClick={saveAppearance}
              disabled={busy}
              style={{ ...btn, background: "linear-gradient(135deg,#22c55e,#3b82f6)", color: "#0b1220" }}
            >
              Save appearance
            </button>
          </div>
        </div>

        <div style={card}>
          <div style={label}>Daily reminder</div>
          <div style={row}>
            <input
              style={{ ...input, maxWidth: 160 }}
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              disabled={busy}
            />
            <button
              type="button"
              onClick={saveReminder}
              disabled={busy}
              style={{ ...btn, background: "linear-gradient(135deg,#22c55e,#3b82f6)", color: "#0b1220" }}
            >
              Save reminder
            </button>
          </div>
        </div>

        <div style={card}>
          <div style={label}>Change username</div>
          <div style={row}>
            <input
              style={input}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              disabled={busy}
            />
            <button
              type="button"
              onClick={saveUsername}
              disabled={busy}
              style={{ ...btn, background: "linear-gradient(135deg,#6366f1,#22c55e)", color: "#0b1220" }}
            >
              Update
            </button>
          </div>
        </div>

        <div style={card}>
          <div style={label}>Change password</div>
          <div style={row}>
            <input
              style={input}
              type="password"
              placeholder="Old password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              disabled={busy}
            />
            <input
              style={input}
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={busy}
            />
            <input
              style={input}
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={busy}
            />
            <button
              type="button"
              onClick={savePassword}
              disabled={busy}
              style={{ ...btn, background: "linear-gradient(135deg,#22c55e,#10b981)", color: "#0b1220" }}
            >
              Save password
            </button>
          </div>
        </div>

        <div style={card}>
          <div style={label}>Account</div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={busy}
              style={{
                ...btn,
                background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                color: "#fff",
                fontWeight: 800,
              }}
            >
              Delete account
            </button>
            <button
              type="button"
              onClick={logout}
              disabled={busy}
              style={{ ...btn, background: "rgba(226,232,240,0.12)", color: "var(--theme-fg, #e2e8f0)" }}
            >
              Logout
            </button>
            <button
              type="button"
              onClick={sendTestPush}
              disabled={busy}
              style={{ ...btn, background: "linear-gradient(135deg,#22c55e,#3b82f6)", color: "#0b1220" }}
            >
              Send test push
            </button>
          </div>
        </div>

        <div style={card}>
          <div style={label}>Notifications</div>
          <div style={row}>
            <button
              type="button"
              onClick={pushEnabled ? disablePush : registerPush}
              disabled={busy}
              style={{
                ...btn,
                background: pushEnabled
                  ? "linear-gradient(135deg,#ef4444,#b91c1c)"
                  : "linear-gradient(135deg,#22c55e,#3b82f6)",
                color: pushEnabled ? "#fff" : "#0b1220",
                fontWeight: 700,
              }}
            >
              {pushEnabled ? "Disable push" : "Enable push"}
            </button>
            {pushEndpoint && (
              <span style={{ color: "var(--theme-muted,#94a3b8)", fontSize: "0.8rem" }}>
                Registered
              </span>
            )}
          </div>
        </div>

        {status && (
          <div
            style={{
              ...card,
              background: "linear-gradient(135deg, #22c55e, #3b82f6)",
              color: "#0b1220",
              border: "none",
              fontWeight: 800,
              boxShadow: "0 10px 30px rgba(34,197,94,0.35)",
            }}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

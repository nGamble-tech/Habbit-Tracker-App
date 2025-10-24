import { useState } from "react";
import { api } from "../api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // or register
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const fn = mode === "login" ? api.login : api.register;
      const res = await fn(username, password);
      if (res?.token) {
        localStorage.setItem("token", res.token);
        onLogin();
      } else {
        setErr("No token returned");
      }
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "6rem auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
      <h2 style={{ marginBottom: 16 }}>{mode === "login" ? "Login" : "Register"}</h2>
      <form onSubmit={submit}>
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} required
               style={{ width: "100%", margin: "6px 0 12px", padding: 8 }} />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
               style={{ width: "100%", margin: "6px 0 12px", padding: 8 }} />

        {err && <div style={{ color: "crimson", marginBottom: 8 }}>{err}</div>}

        <button disabled={loading} type="submit" style={{ width: "100%", padding: 10 }}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
        </button>
      </form>

      <div style={{ marginTop: 12, fontSize: 14 }}>
        {mode === "login" ? (
          <span>
            New here?{" "}
            <button onClick={() => setMode("register")} style={{ border: "none", background: "none", color: "#1976d2", cursor: "pointer" }}>
              Register
            </button>
          </span>
        ) : (
          <span>
            Have an account?{" "}
            <button onClick={() => setMode("login")} style={{ border: "none", background: "none", color: "#1976d2", cursor: "pointer" }}>
              Login
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

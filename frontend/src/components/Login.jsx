// src/components/Login.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { PageTransition, FadeIn, PopButton } from "./motionWrappers";

export default function Login() {
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");

    try {
      const fn = mode === "login" ? api.login : api.register;
      const res = await fn(username, password);
      const token = res?.token || res?.accessToken || res?.jwt;

      if (token) {
        localStorage.setItem("token", token);

        // backend returns { token, user: { id, username } } 
        const userPayload = res.user || { username };
        login(userPayload);
      } else {
        setErr("No token returned: " + JSON.stringify(res));
      }
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.data?.message ||
        (e?.status ? `HTTP ${e.status}` : e?.message) ||
        "Request failed";
      console.error("Auth error:", e);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <PageTransition>
      <div
        style={{
          minHeight: "100dvh",
          height: "100dvh",
          width: "100vw",
          overflow: "hidden",
          position: "relative",
          fontFamily: "'Poppins', 'Space Grotesk', system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 10% 20%, rgba(99,102,241,0.35), transparent 25%), radial-gradient(circle at 80% 0%, rgba(34,197,94,0.3), transparent 22%), linear-gradient(135deg, #0f172a, #0b1220)",
          color: "#e2e8f0",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              width: 280,
              height: 280,
              background: "radial-gradient(circle, rgba(14,165,233,0.45), transparent 60%)",
              top: "12%",
              left: "8%",
              filter: "blur(30px)",
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 0.45, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            style={{
              position: "absolute",
              width: 240,
              height: 240,
              background: "radial-gradient(circle, rgba(94,234,212,0.35), transparent 60%)",
              bottom: "10%",
              right: "12%",
              filter: "blur(30px)",
            }}
          />
        </div>

        <FadeIn>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              borderRadius: 18,
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              padding: "1.75rem",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.06), transparent 35%)",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(226,232,240,0.85)" }}>Welcome to</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc" }}>Habit Rhythm</div>
                </div>
                <div
                  style={{
                    padding: "0.35rem 0.6rem",
                    borderRadius: 999,
                    background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(34,197,94,0.3))",
                    fontWeight: 700,
                    color: "#0b1220",
                  }}
                >
                  {mode === "login" ? "Login" : "Register"}
                </div>
              </div>

              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem", marginTop: "0.4rem" }}>
                <div>
                  <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "rgba(226,232,240,0.9)" }}>
                    Username
                  </label>
                  <motion.input
                    whileFocus={{ scale: 1.01, boxShadow: "0 0 0 1px rgba(94,234,212,0.4)" }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "0.75rem 0.85rem",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#f8fafc",
                      fontSize: "0.95rem",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "rgba(226,232,240,0.9)" }}>
                    Password
                  </label>
                  <motion.input
                    whileFocus={{ scale: 1.01, boxShadow: "0 0 0 1px rgba(94,234,212,0.4)" }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "0.75rem 0.85rem",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#f8fafc",
                      fontSize: "0.95rem",
                      outline: "none",
                    }}
                  />
                </div>

                {err && (
                  <div
                    style={{
                      color: "#fda4af",
                      fontSize: "0.85rem",
                      background: "rgba(248,113,113,0.12)",
                      border: "1px solid rgba(248,113,113,0.3)",
                      padding: "0.5rem 0.65rem",
                      borderRadius: 10,
                    }}
                  >
                    {err}
                  </div>
                )}

                <PopButton
                  disabled={loading}
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "0.75rem 0.85rem",
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg, #22c55e, #3b82f6)",
                    color: "#0b1220",
                    fontWeight: 800,
                    fontSize: "1rem",
                    cursor: "pointer",
                    boxShadow: "0 12px 30px rgba(34,197,94,0.35)",
                  }}
                >
                  {loading
                    ? "Please wait..."
                    : mode === "login"
                    ? "Login"
                    : "Create account"}
                </PopButton>
              </form>

              <div style={{ marginTop: 14, fontSize: "0.9rem", color: "rgba(226,232,240,0.9)", textAlign: "center" }}>
                {mode === "login" ? (
                  <span>
                    New here?{" "}
                    <button
                      onClick={() => setMode("register")}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#a5f3fc",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                      }}
                    >
                      Register
                    </button>
                  </span>
                ) : (
                  <span>
                    Have an account?{" "}
                    <button
                      onClick={() => setMode("login")}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#a5f3fc",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                      }}
                    >
                      Login
                    </button>
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}

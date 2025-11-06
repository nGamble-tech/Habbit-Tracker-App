import { useState } from "react";
import { api } from "../api";

export default function Login({ onLogin }) {
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
        onLogin?.();
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
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        position: "relative",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          zIndex: 0,
          filter: "brightness(1)",
        }}
      >
        <source src="/5190557-uhd_4096_2160_25fps.mp4" type="video/mp4" />
      </video>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.12)",
          zIndex: 1,
        }}
      ></div>

    

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          height: "100%",
          paddingTop: "8%",
          paddingRight: "6%",
        }}
      >
        <div
          style={{
            width: "90%",
            maxWidth: 280,
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            padding: "1.3rem",
            borderRadius: "18px",
            boxShadow: "0 8px 25px rgba(0, 0, 0, 0.08)",
            textAlign: "center",
            color: "#111",
          }}
        >
          <h2
            style={{
              marginBottom: "0.5rem",
              fontSize: "1.5rem",
              fontWeight: "700",
              color: "#111",
            }}
          >
            {mode === "login" ? "Login" : "Register"}
          </h2>

          <form onSubmit={submit}>
            <div style={{ textAlign: "left", marginBottom: 12 }}>
              <label style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.6)",
                  background: "rgba(255,255,255,0.35)",
                  fontSize: "0.9rem",
                  color: "#111",
                  outlineColor: "#007BFF",
                }}
              />
            </div>

            <div style={{ textAlign: "left", marginBottom: 12 }}>
              <label style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.6)",
                  background: "rgba(255,255,255,0.35)",
                  fontSize: "0.9rem",
                  color: "#111",
                  outlineColor: "#007BFF",
                }}
              />
            </div>

            {err && (
              <div
                style={{
                  color: "crimson",
                  marginBottom: 10,
                  fontSize: "0.85rem",
                  textAlign: "center",
                }}
              >
                {err}
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "rgba(30, 144, 255, 0.9)",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.95rem",
                transition: "background 0.3s ease",
              }}
              onMouseOver={(e) =>
                (e.target.style.backgroundColor = "rgba(0, 123, 255, 0.9)")
              }
              onMouseOut={(e) =>
                (e.target.style.backgroundColor = "rgba(30, 144, 255, 0.9)")
              }
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Login"
                : "Create account"}
            </button>
          </form>

          <div style={{ marginTop: 12, fontSize: "0.85rem" }}>
            {mode === "login" ? (
              <span>
                New here?{" "}
                <button
                  onClick={() => setMode("register")}
                  style={{
                    border: "none",
                    background: "none",
                    color: "#007BFF",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.85rem",
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
                    color: "#007BFF",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.85rem",
                  }}
                >
                  Login
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

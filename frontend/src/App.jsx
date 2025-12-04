// src/App.jsx
import { useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { applyTheme, getStoredTheme } from "./styles/theme";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

export default function App() {
  const { user } = useAuth();

  // Apply theme on app load, defaulting to system preference
  useEffect(() => {
    const current = getStoredTheme();
    applyTheme(current);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (getStoredTheme() === "system") {
        applyTheme("system");
      }
    };
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return user ? (
    <Dashboard />
  ) : (
    <Login />
  );
}

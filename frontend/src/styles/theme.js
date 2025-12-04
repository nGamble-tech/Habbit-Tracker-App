export function getStoredTheme() {
  return localStorage.getItem("theme") || "system";
}

export function applyTheme(mode) {
  const root = document.documentElement;
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "system" ? (prefersDark ? "dark" : "light") : mode;

  const themes = {
    light: {
      bg: "#f8fafc",
      fg: "#0b1220",
      card: "#ffffff",
      border: "rgba(15,23,42,0.12)",
      muted: "#475569",
      accent: "#2563eb",
      accent2: "#22c55e",
      inputBg: "#ffffff",
    },
    dark: {
      bg: "#0b1220",
      fg: "#e2e8f0",
      card: "rgba(255,255,255,0.06)",
      border: "rgba(226,232,240,0.12)",
      muted: "#cbd5e1",
      accent: "#6366f1",
      accent2: "#22c55e",
      inputBg: "rgba(15,23,42,0.5)",
    },
  };

  const theme = themes[resolved] || themes.dark;
  Object.entries(theme).forEach(([k, v]) => {
    root.style.setProperty(`--theme-${k}`, v);
  });
  document.body.style.background = theme.bg;
  document.body.style.color = theme.fg;

  // Persist the preference (including "system")
  localStorage.setItem("theme", mode);
}

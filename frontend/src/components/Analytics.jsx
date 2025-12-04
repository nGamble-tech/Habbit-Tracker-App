import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { PageTransition, FadeIn } from "./motionWrappers";

export default function Analytics({ onBack }) {
  const [summary, setSummary] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [summaryData, heatmapData] = await Promise.all([
          api.getAnalyticsSummary(),
          api.getAnalyticsHeatmap(),
        ]);
        if (cancelled) return;
        setSummary(summaryData);
        setHeatmap(heatmapData);
      } catch (e) {
        console.error("Analytics load failed", e);
        if (!cancelled) setError(e.message || "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayIso = new Date().toISOString().slice(0, 10);

  const last7 = useMemo(() => {
    if (!summary?.dailyCounts) return [];
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const iso = d.toISOString().slice(0, 10);
      arr.push({ iso, count: summary.dailyCounts[iso] || 0 });
    }
    return arr;
  }, [summary]);

  const recentHeatmap = useMemo(() => {
    if (!heatmap?.length) return [];
    return heatmap.slice(-28); // last 4 weeks
  }, [heatmap]);

  const monthDays = useMemo(() => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const firstDay = new Date(Date.UTC(year, month, 1));
    const nextMonth = new Date(Date.UTC(year, month + 1, 1));
    const days = [];
    for (let d = new Date(firstDay); d < nextMonth; d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, []);

  const maxDaily = useMemo(() => {
    if (!summary?.dailyCounts) return 1;
    return Math.max(1, ...Object.values(summary.dailyCounts).map((n) => Number(n) || 0));
  }, [summary]);

  function intensity(count) {
    if (count <= 0) return "rgba(226,232,240,0.14)";
    if (count === 1) return "#bbf7d0";
    if (count === 2) return "#4ade80";
    if (count <= 4) return "#22c55e";
    return "#15803d";
  }

  function calendarColor(iso) {
    const count = summary?.dailyCounts?.[iso] || 0;
    if (count === 0) return "#fecdd3"; // red-ish
    if (count < 1) return "#fde68a";
    if (count < 2) return "#bef264";
    return "#34d399";
  }

  const styles = {
    page: {
      minHeight: "100dvh",
      height: "100dvh",
      background: "var(--theme-bg, #0f172a)",
      color: "var(--theme-fg, #e2e8f0)",
      padding: "1.5rem 1rem 3rem",
      fontFamily: "'Poppins', 'Space Grotesk', system-ui, sans-serif",
      display: "flex",
      justifyContent: "center",
      overflowY: "auto",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
    },
    inner: {
      width: "100%",
      maxWidth: 1100,
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
    },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "1rem",
    },
    card: {
      background: "var(--theme-card, rgba(255,255,255,0.06))",
      borderRadius: 18,
      padding: "1rem 1.1rem",
      boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
      border: "1px solid rgba(226,232,240,0.08)",
    },
    gridTwo: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      gap: "0.9rem",
      alignItems: "stretch",
    },
    chip: {
      padding: "0.35rem 0.75rem",
      borderRadius: 999,
      background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(34,197,94,0.2))",
      fontSize: "0.9rem",
      fontWeight: 700,
      color: "#0b1220",
      display: "inline-flex",
      gap: "0.4rem",
      alignItems: "center",
    },
  };

  return (
    <PageTransition>
      <div style={styles.page}>
        <div style={styles.inner}>
          <FadeIn>
            <div style={styles.headerRow}>
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--theme-muted, #cbd5e1)" }}>
                  Analytics
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc" }}>
                  Habit Stats Dashboard
                </div>
              </div>
              <button
                type="button"
                onClick={onBack}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: "0.5rem 0.9rem",
                  background: "linear-gradient(135deg, #22c55e, #3b82f6)",
                  color: "#0b1220",
                  cursor: "pointer",
                  fontWeight: 800,
                  boxShadow: "0 10px 24px rgba(34,197,94,0.35)",
                }}
              >
                ← Back to dashboard
              </button>
            </div>
          </FadeIn>

        {error && (
          <div
            style={{
              backgroundColor: "rgba(248,113,113,0.12)",
              color: "#fecdd3",
              padding: "0.55rem 0.75rem",
              borderRadius: 10,
              fontSize: "0.85rem",
              border: "1px solid rgba(248,113,113,0.25)",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={styles.card}>Loading analytics...</div>
        ) : (
          <>
            <div style={styles.gridTwo}>
              <div style={styles.card}>
                <div style={styles.chip}>🔥 Streak stats</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.7rem", marginTop: "0.8rem" }}>
                  <StatBlock label="Current" value={summary?.streaks?.current || 0} />
                  <StatBlock label="Longest" value={summary?.streaks?.longest || 0} />
                  <StatBlock
                    label="Avg / habit"
                    value={(summary?.streaks?.average || 0).toFixed(1)}
                  />
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.chip}>✅ Weekly snapshot</div>
                <div style={{ marginTop: "0.8rem", fontSize: "0.95rem", fontWeight: 700 }}>
                  {summary?.totalCompletionsThisWeek || 0} actions this week
                </div>
                <div style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                  {summary?.totalCompletionsThisMonth || 0} this month
                </div>
                <Sparkline data={last7} />
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.chip}>🗓 Weekly heatmap</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 6,
                  marginTop: "0.9rem",
                }}
              >
                {recentHeatmap.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${cell.count} completions`}
                    style={{
                      width: "100%",
                      paddingTop: "100%",
                      borderRadius: 8,
                      background: intensity(cell.count),
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        color: "rgba(15,23,42,0.75)",
                        fontWeight: 700,
                      }}
                    >
                      {new Date(cell.date).getUTCDate()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.gridTwo}>
              <div style={styles.card}>
                <div style={styles.chip}>📈 Completion trend</div>
                <div style={{ marginTop: "0.8rem" }}>
                  <Sparkline data={last7} />
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.chip}>🏆 Habit performance</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginTop: "0.7rem" }}>
                  {summary?.habits?.map((h) => (
                    <div key={h.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 700 }}>
                        <span>{h.name}</span>
                        <span>{Math.round((h.completionRate || 0) * 100)}%</span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: 8,
                          borderRadius: 999,
                          background: "rgba(226,232,240,0.16)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, Math.round((h.completionRate || 0) * 100))}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #22c55e, #14b8a6, #6366f1)",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                        Streak: {h.streak || 0} · Longest: {h.longest || 0}
                      </div>
                    </div>
                  ))}
                  {!summary?.habits?.length && (
                    <div style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                      No habits yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.chip}>📅 Monthly calendar</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(36px, 1fr))",
                  gap: 6,
                  marginTop: "0.8rem",
                }}
              >
                {monthDays.map((iso) => (
                  <div
                    key={iso}
                    title={`${iso}: ${summary?.dailyCounts?.[iso] || 0} completions`}
                    style={{
                      padding: "0.6rem 0.2rem",
                      textAlign: "center",
                      borderRadius: 10,
                      background: calendarColor(iso),
                      color: "#0b1220",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                    }}
                  >
                    {new Date(iso).getUTCDate()}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </PageTransition>
  );
}

function StatBlock({ label, value }) {
  return (
    <div
      style={{
        background: "rgba(226,232,240,0.08)",
        borderRadius: 12,
        padding: "0.7rem 0.8rem",
        border: "1px solid rgba(226,232,240,0.1)",
      }}
    >
      <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function Sparkline({ data }) {
  const max = Math.max(1, ...(data || []).map((d) => d.count || 0));
  const points = (data || []).map((d, idx) => {
    const x = (idx / Math.max(1, data.length - 1)) * 100;
    const y = 100 - ((d.count || 0) / max) * 100;
    return `${x},${y}`;
  });

  return (
    <svg viewBox="0 0 100 100" style={{ width: "100%", height: 120 }}>
      <polyline
        fill="none"
        stroke="#22c55e"
        strokeWidth="3"
        points={points.join(" ")}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((d, idx) => {
        const x = (idx / Math.max(1, data.length - 1)) * 100;
        const y = 100 - ((d.count || 0) / max) * 100;
        return (
          <circle key={d.iso} cx={x} cy={y} r="1.8" fill="#38bdf8">
            <title>
              {d.iso}: {d.count}
            </title>
          </circle>
        );
      })}
      <text x="0" y="108" fontSize="6" fill="#cbd5e1">
        Last 7 days · max {max}
      </text>
    </svg>
  );
}

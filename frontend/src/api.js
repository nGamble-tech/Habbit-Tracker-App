// frontend/src/api.js

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && getToken()) {
    headers.Authorization = `Bearer ${getToken()}`;
  }

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data;
}

export const api = {
  // Authentication
  login: (username, password) =>
    request("/auth/login", {
      method: "POST",
      body: { username, password },
      auth: false,
    }),

  register: (username, password) =>
    request("/auth/register", {
      method: "POST",
      body: { username, password },
      auth: false,
    }),

  // Habits
  getHabits: () => request("/habits"),
  addHabit: (habit) => request("/habits", { method: "POST", body: habit }),
  updateHabit: (id, body) =>
    request(`/habits/${id}`, { method: "PATCH", body }),
  markDone: (id) => request(`/habits/${id}/done`, { method: "POST" }),
  deleteHabit: (id) => request(`/habits/${id}`, { method: "DELETE" }),

  // Calendar / per-day counts
  toggleHabit: (id, date, delta) =>
    request(`/habits/${id}/toggle`, {
      method: "POST",
      body: { date, delta },
    }),

  getCompletions: (habitId) => request(`/habits/${habitId}/completions`),

  // User settings
  getProfile: () => request("/me"),
  updateProfile: (body) => request("/me", { method: "PATCH", body }),
  deleteAccount: () => request("/me", { method: "DELETE" }),

  // Auth maintenance
  updateUsername: (newUsername) =>
    request("/auth/update-username", { method: "POST", body: { newUsername } }),
  changePassword: (oldPassword, newPassword) =>
    request("/auth/change-password", { method: "POST", body: { oldPassword, newPassword } }),
  validateToken: () => request("/auth/validate"),
  deleteAccountAuth: () => request("/auth/delete-account", { method: "DELETE" }),

  // Push subscriptions
  getVapidPublicKey: () => request("/push/public-key", { auth: false }),
  subscribePush: (subscription) =>
    request("/push/subscribe", { method: "POST", body: subscription }),
  unsubscribePush: (endpoint) =>
    request("/push/unsubscribe", { method: "POST", body: { endpoint } }),
  sendTestPush: () => request("/push/send-test", { method: "POST" }),

  // Analytics
  getAnalyticsSummary: () => request("/analytics/summary"),
  getAnalyticsHeatmap: () => request("/analytics/heatmap"),
  getHabitAnalytics: (id) => request(`/analytics/habit/${id}`),

  // Archiving
  archiveHabit: (id) => request(`/habits/${id}/archive`, { method: "PATCH" }),
  unarchiveHabit: (id) => request(`/habits/${id}/unarchive`, { method: "PATCH" }),
  getArchivedHabits: () => request("/habits/archived"),

  // Daily check
  dailyCheck: () => request("/habits/daily-check", { method: "POST" }),
};

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
  // 🧠 Authentication
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

  // 📋 Habits
  getHabits: () => request("/habits"),
  addHabit: (habit) => request("/habits", { method: "POST", body: habit }),
  markDone: (id) => request(`/habits/${id}/done`, { method: "POST" }),
  deleteHabit: (id) => request(`/habits/${id}`, { method: "DELETE" }),

  // 🗓️ NEW Calendar endpoints
  toggleHabit: (id, date) =>
    request(`/habits/${id}/toggle`, {
      method: "POST",
      body: { date },
    }),

  getCompletions: (habitId) =>
    request(`/habits/${habitId}/completions`),
};

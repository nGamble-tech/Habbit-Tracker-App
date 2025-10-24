const API = import.meta.env.VITE_API_URL;

function getToken() {
  return localStorage.getItem("token") || "";
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // handle expired/invalid token
  if (res.status === 401) {
    localStorage.removeItem("token");
    throw new Error("Unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: { username, password }, auth: false }),
  register: (username, password) =>
    request("/auth/register", { method: "POST", body: { username, password }, auth: false }),
  getHabits: () => request("/habits"),
  addHabit: (habit) => request("/habits", { method: "POST", body: habit }),
  markDone: (id) => request(`/habits/${id}/done`, { method: "POST" }),
};

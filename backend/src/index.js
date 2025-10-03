import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import Database from 'better-sqlite3';

const app = express();
app.use(cors());
app.use(express.json());

// ---- DB init ----
const db = new Database(process.env.DB_FILE || './data.db');
db.pragma('journal_mode = WAL');

// create tables if not exist
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  frequency TEXT DEFAULT 'daily',
  reminder_time TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS streaks (
  habit_id INTEGER PRIMARY KEY,
  current INTEGER DEFAULT 0,
  longest INTEGER DEFAULT 0,
  last_completed TEXT,
  FOREIGN KEY(habit_id) REFERENCES habits(id)
);
`);

// ---- Helpers ----
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ---- Routes ----
app.get('/health', (req, res) => res.json({ ok: true, api: 'habit-tracker', ts: Date.now() }));

// Auth: register
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const hash = await argon2.hash(password);
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const info = stmt.run(username, hash);
    const token = signToken({ id: info.lastInsertRowid, username });
    res.status(201).json({ token, user: { id: info.lastInsertRowid, username } });
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'username already exists' });
    res.status(500).json({ error: 'registration failed' });
  }
});

// Auth: login
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await argon2.verify(user.password_hash, password);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  const token = signToken({ id: user.id, username: user.username });
  res.json({ token, user: { id: user.id, username: user.username } });
});

// Habits: list (by user)
app.get('/habits', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(req.user.id);
  res.json(rows);
});

// Habits: create
app.post('/habits', auth, (req, res) => {
  const { name, frequency = 'daily', reminder_time = null } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const info = db.prepare('INSERT INTO habits (user_id, name, frequency, reminder_time) VALUES (?, ?, ?, ?)').run(req.user.id, name, frequency, reminder_time);
  // init streak
  db.prepare('INSERT INTO streaks (habit_id, current, longest) VALUES (?, 0, 0)').run(info.lastInsertRowid);
  res.status(201).json({ id: info.lastInsertRowid, name, frequency, reminder_time });
});

// Habits: update
app.put('/habits/:id', auth, (req, res) => {
  const { name, frequency, reminder_time } = req.body || {};
  const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!habit) return res.status(404).json({ error: 'habit not found' });
  db.prepare('UPDATE habits SET name = COALESCE(?, name), frequency = COALESCE(?, frequency), reminder_time = COALESCE(?, reminder_time) WHERE id = ?')
    .run(name, frequency, reminder_time, habit.id);
  res.json({ ok: true });
});

// Habits: delete
app.delete('/habits/:id', auth, (req, res) => {
  const info = db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  db.prepare('DELETE FROM streaks WHERE habit_id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'habit not found' });
  res.json({ ok: true });
});

// Mark Done → update streak
app.post('/habits/:id/done', auth, (req, res) => {
  const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!habit) return res.status(404).json({ error: 'habit not found' });

  const s = db.prepare('SELECT * FROM streaks WHERE habit_id = ?').get(habit.id) || { current: 0, longest: 0, last_completed: null };
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // simple streak logic: increment if last_completed is yesterday or today; reset otherwise
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let current = s.current || 0;
  if (s.last_completed === today) {
    // already marked today; keep same
  } else if (s.last_completed === yesterday || s.last_completed === null) {
    current = current + 1 || 1;
  } else {
    current = 1;
  }
  const longest = Math.max(current, s.longest || 0);

  db.prepare('INSERT INTO streaks (habit_id, current, longest, last_completed) VALUES (?, ?, ?, ?) ON CONFLICT(habit_id) DO UPDATE SET current = excluded.current, longest = excluded.longest, last_completed = excluded.last_completed')
    .run(habit.id, current, longest, today);

  res.json({ habitId: habit.id, current, longest, last_completed: today });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

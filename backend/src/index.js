// backend/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ----- Setup paths -----
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Database path
const dbFile = process.env.DB_FILE
  ? path.resolve(process.env.DB_FILE)
  : path.join(rootDir, 'data', 'data.db');

// Ensure /data directory exists
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

// ----- Express App -----
const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ----- Database Setup -----
const db = new Database(dbFile);
db.pragma('journal_mode = WAL');

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
  times_per_day INTEGER DEFAULT 1,
  custom_window_days INTEGER DEFAULT 1,
  custom_window_unit TEXT DEFAULT 'days',
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS streaks (
  habit_id INTEGER PRIMARY KEY,
  current INTEGER DEFAULT 0,
  longest INTEGER DEFAULT 0,
  last_completed TEXT,
  FOREIGN KEY(habit_id) REFERENCES habits(id)
);

CREATE TABLE IF NOT EXISTS completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  done INTEGER DEFAULT 0,
  FOREIGN KEY(habit_id) REFERENCES habits(id)
);
`);

// Ensure newer columns exist when running against an older DB file
function ensureColumn(table, column, definition) {
  const columns = db.prepare('PRAGMA table_info(' + table + ')').all();
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

ensureColumn('habits', 'times_per_day', 'INTEGER DEFAULT 1');
ensureColumn('habits', 'custom_window_days', 'INTEGER DEFAULT 1');
ensureColumn('habits', 'custom_window_unit', "TEXT DEFAULT 'days'");

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

// ----- Routes -----

// Register new user
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });

  try {
    const hash = await argon2.hash(password);
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const info = stmt.run(username, hash);
    const token = signToken({ id: info.lastInsertRowid, username });
    res.status(201).json({ token, user: { id: info.lastInsertRowid, username } });
  } catch (e) {
    if (String(e).includes('UNIQUE'))
      return res.status(409).json({ error: 'username already exists' });
    res.status(500).json({ error: 'registration failed' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  const ok = await argon2.verify(user.password_hash, password);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const token = signToken({ id: user.id, username: user.username });
  res.json({ token, user: { id: user.id, username: user.username } });
});

// Get all habits for user
app.get('/habits', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(req.user.id);
  res.json(rows);
});

// Add new habit
app.post('/habits', auth, (req, res) => {
  const {
    name,
    frequency = 'daily',
    reminder_time = null,
    timesPerDay = 1,
    customWindowDays = 1,
    customWindowUnit = 'days',
  } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const parsedTimes = Number(timesPerDay);
  const safeTimesPerDay = Number.isFinite(parsedTimes)
    ? Math.max(1, Math.min(Math.round(parsedTimes), 24))
    : 1;
  const parsedWindow = Number(customWindowDays);
  const safeWindowDays = Number.isFinite(parsedWindow)
    ? Math.max(1, Math.min(Math.round(parsedWindow), 365))
    : 1;
  const safeWindowUnit = ['days', 'months'].includes(String(customWindowUnit))
    ? String(customWindowUnit)
    : 'days';

  const info = db.prepare(
    'INSERT INTO habits (user_id, name, frequency, reminder_time, times_per_day, custom_window_days, custom_window_unit) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, name, frequency, reminder_time, safeTimesPerDay, safeWindowDays, safeWindowUnit);

  db.prepare('INSERT INTO streaks (habit_id, current, longest) VALUES (?, 0, 0)')
    .run(info.lastInsertRowid);

  res.status(201).json({
    id: info.lastInsertRowid,
    name,
    frequency,
    reminder_time,
    times_per_day: safeTimesPerDay,
    custom_window_days: safeWindowDays,
    custom_window_unit: safeWindowUnit,
  });
});

// Delete habit
app.delete('/habits/:id', auth, (req, res) => {
  const info = db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  db.prepare('DELETE FROM streaks WHERE habit_id = ?').run(req.params.id);
  db.prepare('DELETE FROM completions WHERE habit_id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'habit not found' });
  res.json({ ok: true });
});

// Update habit (times_per_day, custom_window_days, custom_window_unit)
app.patch('/habits/:id', auth, (req, res) => {
  const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!habit) return res.status(404).json({ error: 'habit not found' });

  const { timesPerDay, customWindowDays, customWindowUnit } = req.body || {};
  if (timesPerDay === undefined && customWindowDays === undefined && customWindowUnit === undefined) {
    return res.status(400).json({ error: 'nothing to update' });
  }

  let safeTimesPerDay = habit.times_per_day;
  let safeWindowDays = habit.custom_window_days || 1;
  let safeWindowUnit = habit.custom_window_unit || 'days';

  if (timesPerDay !== undefined) {
    const parsedTimes = Number(timesPerDay);
    if (!Number.isFinite(parsedTimes) || parsedTimes < 1) {
      return res.status(400).json({ error: 'timesPerDay must be >= 1' });
    }
    safeTimesPerDay = Math.max(1, Math.min(Math.round(parsedTimes), 24));
  }

  if (customWindowDays !== undefined) {
    const parsedWindow = Number(customWindowDays);
    if (!Number.isFinite(parsedWindow) || parsedWindow < 1) {
      return res.status(400).json({ error: 'customWindowDays must be >= 1' });
    }
    safeWindowDays = Math.max(1, Math.min(Math.round(parsedWindow), 365));
  }

  if (customWindowUnit !== undefined) {
    const unit = String(customWindowUnit);
    if (!['days', 'months'].includes(unit)) {
      return res.status(400).json({ error: 'customWindowUnit must be days or months' });
    }
    safeWindowUnit = unit;
  }

  db.prepare('UPDATE habits SET times_per_day = ?, custom_window_days = ?, custom_window_unit = ? WHERE id = ? AND user_id = ?')
    .run(safeTimesPerDay, safeWindowDays, safeWindowUnit, req.params.id, req.user.id);

  res.json({
    ...habit,
    times_per_day: safeTimesPerDay,
    custom_window_days: safeWindowDays,
    custom_window_unit: safeWindowUnit,
  });
});

// Toggle completion for a specific date (supports increments for multi-per-day habits)
app.post('/habits/:id/toggle', auth, (req, res) => {
  const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!habit) return res.status(404).json({ error: 'habit not found' });

  const date = req.body?.date || new Date().toISOString().slice(0, 10);
  const target = habit.times_per_day || 1;
  const deltaFromBody = Number(req.body?.delta);
  const hasDelta = Number.isFinite(deltaFromBody);

  const existing = db.prepare('SELECT * FROM completions WHERE habit_id = ? AND date = ?')
    .get(habit.id, date);

  const currentCount = existing ? Number(existing.done) || 0 : 0;
  const nextCount = hasDelta
    ? currentCount + deltaFromBody
    : (currentCount >= target ? 0 : currentCount + 1);
  const clamped = Math.max(0, Math.min(nextCount, target));

  if (clamped === 0 && existing) {
    db.prepare('DELETE FROM completions WHERE id = ?').run(existing.id);
  } else if (clamped === 0 && !existing) {
    // nothing to delete
  } else if (existing) {
    db.prepare('UPDATE completions SET done = ? WHERE id = ?')
      .run(clamped, existing.id);
  } else {
    db.prepare('INSERT INTO completions (habit_id, date, done) VALUES (?, ?, ?)')
      .run(habit.id, date, clamped);
  }

  res.json({
    date,
    count: clamped,
    target,
    completed: clamped >= target,
  });
});

// Get completions (recent history for calendar views)
app.get('/habits/:id/completions', auth, (req, res) => {
  const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!habit) return res.status(404).json({ error: 'habit not found' });

  const rows = db.prepare(
    'SELECT date, done FROM completions WHERE habit_id = ? ORDER BY date DESC LIMIT 31'
  ).all(req.params.id);
  res.json(rows);
});

// ----- Start Server -----
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

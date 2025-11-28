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
import webpush from 'web-push';

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
  password_hash TEXT NOT NULL,
  theme TEXT DEFAULT 'calm',
  reminder_time TEXT
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
  notify_enabled INTEGER DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  UNIQUE(user_id, endpoint),
  FOREIGN KEY(user_id) REFERENCES users(id)
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
ensureColumn('habits', 'notify_enabled', 'INTEGER DEFAULT 0');
ensureColumn('users', 'theme', "TEXT DEFAULT 'calm'");
ensureColumn('users', 'reminder_time', 'TEXT');

// ----- Web Push Setup -----
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    'mailto:niger.gamble@gmail.com',
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

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

function passwordStrong(pw) {
  if (typeof pw !== 'string') return false;
  if (pw.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  return hasLetter && hasNumber;
}

// ----- Routes -----

// Register new user
app.post('/auth/register', async (req, res) => {
  const { username, password, theme = 'calm', reminderTime = null } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });
  if (!passwordStrong(password)) {
    return res.status(400).json({ error: 'password too weak (min 8 chars, letters and numbers)' });
  }

  try {
    const hash = await argon2.hash(password);
    const stmt = db.prepare('INSERT INTO users (username, password_hash, theme, reminder_time) VALUES (?, ?, ?, ?)');
    const info = stmt.run(username, hash, theme, reminderTime);
    const token = signToken({ id: info.lastInsertRowid, username });
    res.status(201).json({
      token,
      user: { id: info.lastInsertRowid, username, theme, reminder_time: reminderTime },
    });
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
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      theme: user.theme || 'calm',
      reminder_time: user.reminder_time || null,
    },
  });
});

// Validate token (diagnostics)
app.get('/auth/validate', auth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// Update username (requires login)
app.post('/auth/update-username', auth, (req, res) => {
  const { newUsername } = req.body || {};
  if (!newUsername) return res.status(400).json({ error: 'newUsername required' });
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(newUsername);
  if (exists) return res.status(409).json({ error: 'username already taken' });
  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(newUsername, req.user.id);
  const token = signToken({ id: req.user.id, username: newUsername });
  res.json({ ok: true, token, user: { id: req.user.id, username: newUsername } });
});

// Change password (requires oldPassword)
app.post('/auth/change-password', auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'oldPassword and newPassword required' });
  }
  if (!passwordStrong(newPassword)) {
    return res.status(400).json({ error: 'password too weak (min 8 chars, letters and numbers)' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  const ok = await argon2.verify(user.password_hash, oldPassword);
  if (!ok) return res.status(401).json({ error: 'old password incorrect' });
  const newHash = await argon2.hash(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
  res.json({ ok: true });
});

// Delete account (requires recent login via token)
app.delete('/auth/delete-account', auth, (req, res) => {
  db.prepare('DELETE FROM completions WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ?)').run(req.user.id);
  db.prepare('DELETE FROM streaks WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ?)').run(req.user.id);
  db.prepare('DELETE FROM habits WHERE user_id = ?').run(req.user.id);
  db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(req.user.id);
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'user not found' });
  res.json({ ok: true });
});

// Push subscription endpoints (store/delete)
app.get('/push/public-key', (req, res) => {
  const pub = process.env.VAPID_PUBLIC_KEY || 'YOUR_PUBLIC_VAPID_KEY';
  res.json({ publicKey: pub });
});

app.post('/push/subscribe', auth, (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'invalid subscription' });
  }
  db.prepare(
    'INSERT OR REPLACE INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, endpoint, keys.p256dh, keys.auth);
  res.json({ ok: true });
});

app.post('/push/unsubscribe', auth, (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
    .run(req.user.id, endpoint);
  res.json({ ok: true });
});

// Send a test push to the current user
app.post('/push/send-test', auth, (req, res) => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'VAPID keys not configured on server' });
  }
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(req.user.id);
  if (!subs.length) return res.status(404).json({ error: 'no subscription found' });

  const payload = JSON.stringify({
    title: 'Habit Reminder (Test)',
    body: 'If you see this, push is working!',
  });

  Promise.all(
    subs.map((s) =>
      webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        },
        payload
      ).catch((err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(s.id);
        } else {
          console.warn('Push send failed:', err?.body || err);
        }
      })
    )
  )
    .then(() => res.json({ ok: true }))
    .catch(() => res.status(500).json({ error: 'Failed to send test push' }));
});

// Get all habits for user
app.get('/habits', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(req.user.id);
  res.json(rows);
});

// Current user profile
app.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, theme, reminder_time FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json(user);
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
    notifyEnabled = 0,
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
  const safeNotify = notifyEnabled ? 1 : 0;

  const info = db.prepare(
    'INSERT INTO habits (user_id, name, frequency, reminder_time, times_per_day, custom_window_days, custom_window_unit, notify_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, name, frequency, reminder_time, safeTimesPerDay, safeWindowDays, safeWindowUnit, safeNotify);

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
    notify_enabled: safeNotify,
  });
});

// Delete habit
app.delete('/habits/:id', auth, (req, res) => {
  // Delete children first to avoid FK issues when foreign_keys is ON
  db.prepare('DELETE FROM completions WHERE habit_id = ?').run(req.params.id);
  db.prepare('DELETE FROM streaks WHERE habit_id = ?').run(req.params.id);
  const info = db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'habit not found' });
  res.json({ ok: true });
});

// Update habit (times_per_day, custom_window_days, custom_window_unit)
app.patch('/habits/:id', auth, (req, res) => {
  const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!habit) return res.status(404).json({ error: 'habit not found' });

  const { timesPerDay, customWindowDays, customWindowUnit, notifyEnabled } = req.body || {};
  if (timesPerDay === undefined && customWindowDays === undefined && customWindowUnit === undefined && notifyEnabled === undefined) {
    return res.status(400).json({ error: 'nothing to update' });
  }

  let safeTimesPerDay = habit.times_per_day;
  let safeWindowDays = habit.custom_window_days || 1;
  let safeWindowUnit = habit.custom_window_unit || 'days';
  let safeNotify = habit.notify_enabled || 0;

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

  if (notifyEnabled !== undefined) {
    safeNotify = notifyEnabled ? 1 : 0;
  }

  db.prepare('UPDATE habits SET times_per_day = ?, custom_window_days = ?, custom_window_unit = ?, notify_enabled = ? WHERE id = ? AND user_id = ?')
    .run(safeTimesPerDay, safeWindowDays, safeWindowUnit, safeNotify, req.params.id, req.user.id);

  res.json({
    ...habit,
    times_per_day: safeTimesPerDay,
    custom_window_days: safeWindowDays,
    custom_window_unit: safeWindowUnit,
    notify_enabled: safeNotify,
  });
});

// Update current user (username, password, theme, reminder_time)
app.patch('/me', auth, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'user not found' });

  const {
    username,
    oldPassword,
    newPassword,
    theme,
    reminderTime,
  } = req.body || {};

  let newUsername = user.username;
  if (username && username !== user.username) {
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (exists) return res.status(409).json({ error: 'username already taken' });
    newUsername = username;
  }

const allowedThemes = ['light', 'dark', 'auto', 'calm', 'ocean', 'sunrise'];
  const newTheme = theme && allowedThemes.includes(theme) ? theme : user.theme || 'calm';

  if (newPassword) {
    if (!oldPassword) return res.status(400).json({ error: 'oldPassword required' });
    if (!passwordStrong(newPassword)) {
      return res.status(400).json({ error: 'password too weak (min 8 chars, letters and numbers)' });
    }
    const ok = await argon2.verify(user.password_hash, oldPassword);
    if (!ok) return res.status(401).json({ error: 'old password incorrect' });
    const hash = await argon2.hash(newPassword);
    db.prepare('UPDATE users SET username = ?, password_hash = ?, theme = ?, reminder_time = ? WHERE id = ?')
      .run(newUsername, hash, newTheme, reminderTime ?? user.reminder_time, req.user.id);
  } else {
    db.prepare('UPDATE users SET username = ?, theme = ?, reminder_time = ? WHERE id = ?')
      .run(newUsername, newTheme, reminderTime ?? user.reminder_time, req.user.id);
  }

  res.json({
    id: user.id,
    username: newUsername,
    theme: newTheme,
    reminder_time: reminderTime ?? user.reminder_time,
  });
});

// Delete current user and all related data
app.delete('/me', auth, (req, res) => {
  db.prepare('DELETE FROM completions WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ?)').run(req.user.id);
  db.prepare('DELETE FROM streaks WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ?)').run(req.user.id);
  db.prepare('DELETE FROM habits WHERE user_id = ?').run(req.user.id);
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'user not found' });
  res.json({ ok: true });
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

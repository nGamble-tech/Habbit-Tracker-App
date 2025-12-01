# 🌟 Habit Tracker (Full Stack + PWA + Push Notifications)

A full-stack Habit Tracker app with:

- React + Vite frontend (installable PWA)
- Node.js + Express backend
- SQLite database
- JWT authentication
- Argon2 hashing
- Real Web Push Notifications (VAPID)
- Service Worker support

This README explains everything required to run the app on any machine.

---

# 🚀 1. Backend Setup

## 📦 Install Dependencies

```bash
cd backend
npm install
```

Packages used:

- express
- cors
- dotenv
- sqlite3 / better-sqlite3
- jsonwebtoken
- argon2
- web-push
- nodemon (dev)

If `web-push` is missing:

```bash
npm install web-push
```

---

## ⚙️ Create Backend `.env`

Create a file:

```
backend/.env
```

Paste this:

```env
JWT_SECRET="Our team name"
DB_FILE=./data/data.db

VAPID_PUBLIC_KEY=BBig6Eci9ORed_mYNvKnrOIt0ovJFZMwp_MvbGX0Yu6yGTbOk1vXrfavMREdGQSCZ-iOZNw_GKzhh9kDyqCmokg
VAPID_PRIVATE_KEY=0kB...
```

These keys must match for all of us.

---

## ▶️ Run Backend

```bash
npm run dev
```

Backend runs at:

```
http://localhost:4000
```

---

# 🖥️ 2. Frontend Setup

## 📦 Install Dependencies

```bash
cd frontend
npm install
```

---

## ⚙️ Create Frontend `.env`

Create:

```
frontend/.env
```

Paste:

```env
VITE_API_URL=http://localhost:4000
```

---

## 📂 Required Files in `frontend/public`

These must exist:

```
sw.js
manifest.json
Lightningbolt.png
```

Required for PWA + notifications.

---

## ▶️ Run Frontend

```bash
npm run dev
```

App runs at:

```
http://localhost:5173
```

Open in **Google Chrome**.

---

# 🔔 3. Enable Push Notifications

Inside the app:

1. Open **Settings**
2. Toggle **Enable Notifications**
3. Click **Allow** in the Chrome popup
4. Subscription is saved in SQLite table:  
   `push_subscriptions`

If this table gets a new row → success.

---

# 🧪 4. Test Push Notifications (Postman)

## Step 1 — Get JWT Token from the frontend

1. Open Chrome
2. Press F12 → Application tab
3. Local Storage → `http://localhost:5173`
4. Copy the `"token"` value

---

## Step 2 — Create Postman Request

**POST**

```
http://localhost:4000/push/send-test
```

**Headers:**

```
Authorization: Bearer <your_token_here>
Content-Type: application/json
```

**Body:** none

### ✔ Expected Result:

A system notification pops up saying:

> “Push is working!”

---

# 📱 5. Installing the PWA

### Desktop (Chrome):

- Click the install icon next to the URL bar

### Android:

- Chrome → ⋮ menu → Install App

### iOS (Safari 16.4+):

- Share → Add to Home Screen

Once installed:

- Push notifications work even when closed (Android)
- Opens like a native app

---

# 🎉 Summary Commands

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

Enable notifications → test with Postman → install PWA.

Happy building! 🚀

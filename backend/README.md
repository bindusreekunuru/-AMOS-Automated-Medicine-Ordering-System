# AMOS Backend — Setup Guide

## Project Structure

```
amos-backend/
├── server.js                 # Express app + cron scheduler
├── db.js                     # SQLite setup (reminders + device_tokens tables)
├── scheduler.js              # Reminder checker + FCM sender
├── routes/
│   ├── reminders.js          # CRUD API for reminders
│   └── tokens.js             # Register / remove FCM device tokens
├── frontend-integration.js   # Paste into Reminders.html
├── firebase-messaging-sw.js  # Service worker → copy to web root
├── serviceAccountKey.json    # ← YOU ADD THIS (see Step 2)
└── package.json
```

---

## Step 1 — Install dependencies

```bash
cd amos-backend
npm install
```

---

## Step 2 — Firebase setup

### A. Create a Firebase project
1. Go to https://console.firebase.google.com
2. Create a project (or use an existing one)
3. Enable **Cloud Messaging** in Project Settings → Cloud Messaging

### B. Get the Admin SDK service account key
1. Project Settings → Service Accounts → **Generate new private key**
2. Save the downloaded file as `serviceAccountKey.json` in this folder

### C. Get your Web Push VAPID key
1. Project Settings → Cloud Messaging → **Web Push certificates** → Generate key pair
2. Copy the public key — you'll need it in `frontend-integration.js`

### D. Get your Firebase web config
1. Project Settings → Your apps → Add app (Web)
2. Copy the `firebaseConfig` object

---

## Step 3 — Configure the frontend

Open `frontend-integration.js` and fill in:

```js
const FIREBASE_CONFIG = {
  apiKey:            "...",
  authDomain:        "...",
  projectId:         "...",
  storageBucket:     "...",
  messagingSenderId: "...",
  appId:             "...",
};
const VAPID_KEY = "...";   // your Web Push public key
const API_BASE  = "http://localhost:3001/api";  // change for production
```

Do the same in `firebase-messaging-sw.js` (it needs its own copy of the config).

### Add to Reminders.html

Add this just before `</body>`:

```html
<script type="module" src="frontend-integration.js"></script>
```

Then copy `firebase-messaging-sw.js` to the **root** of your web server.

---

## Step 4 — Start the server

```bash
npm start          # production
npm run dev        # development (auto-restarts with nodemon)
```

The server runs on **port 3001** by default. Set the `PORT` environment variable to change it.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reminders?user_id=` | List all reminders for a user |
| POST | `/api/reminders` | Create a reminder |
| PUT | `/api/reminders/:id` | Update a reminder |
| PATCH | `/api/reminders/:id/toggle` | Toggle done/undone |
| DELETE | `/api/reminders/:id` | Delete a reminder |
| DELETE | `/api/reminders?user_id=` | Clear all reminders for a user |
| POST | `/api/tokens` | Register FCM device token |
| DELETE | `/api/tokens` | Unregister token |
| GET | `/api/health` | Health check |

### POST /api/reminders — request body

```json
{
  "user_id": "default",
  "medicineName": "Paracetamol",
  "date": "2025-06-01",
  "time": "08:00",
  "frequency": "Daily",
  "note": "Take after food"
}
```

---

## How notifications work

1. When the frontend loads, it calls `initPushNotifications()` which asks the browser for permission, registers the service worker, and sends the FCM token to `POST /api/tokens`.
2. The server runs a **cron job every minute** that queries for reminders whose `date` and `time` match the current minute.
3. For each due reminder, it sends an FCM multicast push to all registered tokens for that `user_id`.
4. Recurring reminders (Daily, Twice Daily, Weekly) automatically get the next occurrence inserted into the DB.
5. The service worker intercepts background notifications and shows **Mark Done** and **Snooze** action buttons.

---

## Android channel setup (if building a native wrapper)

Create a notification channel in your Android app with id `amos_reminders` and importance `IMPORTANCE_HIGH` for the notifications to appear with sound and heads-up display.

---

## Production checklist

- [ ] Set `API_BASE` to your deployed URL (e.g. `https://api.yourapp.com`)
- [ ] Use HTTPS — service workers and push notifications require it
- [ ] Add proper user authentication and replace `"default"` user_id with real user IDs
- [ ] Set `PORT` via environment variable
- [ ] Use a process manager like PM2: `pm2 start server.js --name amos`

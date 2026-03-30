/**
 * AMOS Frontend Integration
 * --------------------------
 * Drop this file alongside Reminders.html and import it, OR paste the contents
 * into the existing <script> block in Reminders.html.
 *
 * Prerequisites:
 *  1. Add the Firebase JS SDK to Reminders.html (see README).
 *  2. Replace the config values below with your own Firebase project config.
 *  3. Host a service worker at /firebase-messaging-sw.js (template below).
 */

// ── Firebase config ───────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
const VAPID_KEY  = "YOUR_VAPID_PUBLIC_KEY";  // Firebase Console → Cloud Messaging → Web Push certificates
const API_BASE   = "http://localhost:3001/api";
const USER_ID    = "default"; // Replace with real auth user id when you add auth

// ── Firebase initialisation ───────────────────────────────────────────────────
import { initializeApp }                from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

const firebaseApp = initializeApp(FIREBASE_CONFIG);
const messaging   = getMessaging(firebaseApp);

// ── Request notification permission & register token ─────────────────────────
async function initPushNotifications() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });

    if (token) {
      await fetch(`${API_BASE}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: USER_ID, token }),
      });
      console.log("FCM token registered:", token);
    }
  } catch (err) {
    console.error("Push init error:", err);
  }
}

// Show foreground notifications as a browser notification
onMessage(messaging, (payload) => {
  const { title, body } = payload.notification;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icon.png" });
  }
});

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiRequest(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadReminders() {
  return apiRequest("GET", `/reminders?user_id=${USER_ID}`);
}

async function createReminder(data) {
  return apiRequest("POST", "/reminders", { ...data, user_id: USER_ID });
}

async function updateReminder(id, data) {
  return apiRequest("PUT", `/reminders/${id}`, data);
}

async function toggleReminder(id) {
  return apiRequest("PATCH", `/reminders/${id}/toggle`, {});
}

async function deleteReminder(id) {
  return apiRequest("DELETE", `/reminders/${id}`);
}

async function clearAllReminders() {
  return apiRequest("DELETE", `/reminders?user_id=${USER_ID}`);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
initPushNotifications();

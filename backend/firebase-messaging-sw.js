// firebase-messaging-sw.js
// Place this file at the ROOT of your web server (same level as index.html / Reminders.html)
// so the browser can register it at scope "/"

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
});

const messaging = firebase.messaging();

// Handle background messages (app is closed or tab not in focus)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon:  "/icon.png",
    badge: "/badge.png",
    data:  payload.data,
    actions: [
      { action: "done",   title: "Mark Done" },
      { action: "snooze", title: "Snooze 10 min" },
    ],
  });
});

// Handle notification action button clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "done") {
    const reminderId = event.notification.data?.reminderId;
    if (reminderId) {
      event.waitUntil(
        fetch(`http://localhost:3001/api/reminders/${reminderId}/toggle`, { method: "PATCH" })
      );
    }
  } else if (event.action === "snooze") {
    // Re-open the app so the user can act manually
    event.waitUntil(clients.openWindow("/Reminders.html"));
  } else {
    // Default click — open the reminders page
    event.waitUntil(clients.openWindow("/Reminders.html"));
  }
});

const admin = require("firebase-admin");
const db = require("./db");

// Initialise Firebase Admin SDK once
// Set GOOGLE_APPLICATION_CREDENTIALS env var to your service-account JSON path,
// OR place serviceAccountKey.json in the project root.
if (!admin.apps.length) {
  let serviceAccount;
  try {
    serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : require("./serviceAccountKey.json");
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (err) {
    console.warn("Firebase Admin init skipped (serviceAccountKey.json not found). Push notifications won't send.");
  }
}

const messaging = admin.apps.length ? admin.messaging() : null;

/**
 * Called every minute by the cron job in server.js.
 * Finds reminders due within the current minute and sends push notifications.
 */
async function checkAndSendReminders() {
  if (!messaging) return; // Skip if firebase isn't configured

  const now = new Date();
  // Format current date/time to match DB storage (YYYY-MM-DD, HH:MM)
  const todayDate = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

  try {
    // Find reminders that are due now and haven't been notified yet and aren't done
    const dueRemindersResult = await db.query(
      `SELECT r.*, d.token
       FROM reminders r
       JOIN device_tokens d ON r.user_id = d.user_id
       WHERE r.date = $1
         AND r.time = $2
         AND r.done = 0
         AND r.notified = 0`,
      [todayDate, currentTime]
    );

    const dueReminders = dueRemindersResult.rows;
    if (dueReminders.length === 0) return;

    console.log(`[${new Date().toISOString()}] Sending ${dueReminders.length} reminder notification(s)…`);

    // Group by reminder id to avoid sending duplicate notifications when a user
    // has multiple device tokens
    const byId = {};
    for (const row of dueReminders) {
      if (!byId[row.id]) byId[row.id] = { reminder: row, tokens: [] };
      byId[row.id].tokens.push(row.token);
    }

    for (const [reminderId, { reminder, tokens }] of Object.entries(byId)) {
      await sendNotification(reminder, tokens);

      // Mark as notified so we don't resend in the next tick
      await db.query("UPDATE reminders SET notified = 1 WHERE id = $1", [reminderId]);
    }

    // For recurring reminders, schedule the next occurrence
    await scheduleNextOccurrence(dueReminders);
  } catch (err) {
    console.error("Error in checkAndSendReminders:", err);
  }
}

/**
 * Send a multicast FCM notification to all device tokens for this reminder.
 */
async function sendNotification(reminder, tokens) {
  if (!messaging) return;

  const message = {
    tokens,
    notification: {
      title: `💊 Time for ${reminder.medicine_name}`,
      body: reminder.note
        ? `${reminder.frequency} • ${reminder.note}`
        : `${reminder.frequency} dose reminder`,
    },
    data: {
      reminderId: String(reminder.id),
      medicineName: reminder.medicine_name,
      frequency: reminder.frequency,
    },
    android: {
      priority: "high",
      notification: {
        channelId: "amos_reminders",
        sound: "default",
        icon: "ic_medicine",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(
      `Reminder #${reminder.id} (${reminder.medicine_name}): ` +
      `${response.successCount} sent, ${response.failureCount} failed.`
    );

    // Remove stale tokens that FCM reports as invalid
    for (let idx = 0; idx < response.responses.length; idx++) {
      const resp = response.responses[idx];
      if (!resp.success) {
        const errorCode = resp.error?.code;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          await db.query("DELETE FROM device_tokens WHERE token = $1", [tokens[idx]]);
          console.log(`Removed stale token: ${tokens[idx]}`);
        }
      }
    }
  } catch (err) {
    console.error(`Failed to send notification for reminder #${reminder.id}:`, err.message);
  }
}

/**
 * For Daily / Twice Daily / Weekly reminders, insert the next occurrence
 * so the scheduler will fire again automatically.
 */
async function scheduleNextOccurrence(dueReminders) {
  const seen = new Set();

  for (const row of dueReminders) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);

    let nextDate = null;
    const current = new Date(`${row.date}T${row.time}:00`);

    switch (row.frequency) {
      case "Daily":
        current.setDate(current.getDate() + 1);
        nextDate = current;
        break;
      case "Twice Daily":
        current.setHours(current.getHours() + 12);
        nextDate = current;
        break;
      case "Weekly":
        current.setDate(current.getDate() + 7);
        nextDate = current;
        break;
      default:
        break; // "As Needed" — no auto-recurrence
    }

    if (nextDate) {
      const nextDateStr = nextDate.toISOString().slice(0, 10);
      const nextTimeStr = nextDate.toTimeString().slice(0, 5);

      try {
        // Avoid duplicates
        const existsResult = await db.query(
          "SELECT id FROM reminders WHERE user_id = $1 AND medicine_name = $2 AND date = $3 AND time = $4",
          [row.user_id, row.medicine_name, nextDateStr, nextTimeStr]
        );

        if (existsResult.rows.length === 0) {
          await db.query(
            `INSERT INTO reminders (user_id, medicine_name, date, time, frequency, note)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [row.user_id, row.medicine_name, nextDateStr, nextTimeStr, row.frequency, row.note]
          );

          console.log(
            `Auto-scheduled next ${row.frequency} reminder for ${row.medicine_name} on ${nextDateStr} at ${nextTimeStr}`
          );
        }
      } catch (err) {
        console.error("Error auto-scheduling reminder:", err);
      }
    }
  }
}

module.exports = { checkAndSendReminders };

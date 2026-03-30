const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

// ── GET /api/dashboard ──────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const userId = req.user.id;

  // Active medicines count
  const activeMedicines = db
    .prepare("SELECT COUNT(*) as count FROM medicines WHERE user_id = ?")
    .get(userId).count;

  // Today's reminders count
  const today = new Date().toISOString().slice(0, 10);
  const todayReminders = db
    .prepare(
      "SELECT COUNT(*) as count FROM reminders WHERE user_id = ? AND date = ?"
    )
    .get(userId, today).count;

  // Low stock items (medicines where days left <= 7)
  const medicines = db
    .prepare("SELECT * FROM medicines WHERE user_id = ?")
    .all(userId);

  let lowStock = 0;
  medicines.forEach((m) => {
    const daysLeft =
      m.dosage_per_day > 0
        ? Math.floor(m.tablets_qty / m.dosage_per_day)
        : m.tablets_qty;
    if (daysLeft <= 7) lowStock++;
  });

  // Pending orders count
  const pendingOrders = db
    .prepare(
      "SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status IN ('Pending', 'Ordered', 'Shipped')"
    )
    .get(userId).count;

  // Upcoming reminders (next 3)
  const upcomingReminders = db
    .prepare(
      `SELECT * FROM reminders
       WHERE user_id = ? AND done = 0 AND (date > ? OR (date = ? AND time >= ?))
       ORDER BY date ASC, time ASC
       LIMIT 3`
    )
    .all(
      userId,
      today,
      today,
      new Date().toTimeString().slice(0, 5)
    )
    .map((r) => ({
      id: r.id,
      medicineName: r.medicine_name,
      date: r.date,
      time: r.time,
      frequency: r.frequency,
    }));

  res.json({
    activeMedicines,
    todayReminders,
    lowStock,
    pendingOrders,
    upcomingReminders,
  });
});

module.exports = router;

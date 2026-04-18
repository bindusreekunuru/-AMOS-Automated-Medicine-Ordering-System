const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

// ── GET /api/dashboard ──────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    // We can run these independent queries in parallel
    const [
      activeMedicinesResult,
      medicinesResult,
      pendingOrdersResult
    ] = await Promise.all([
      db.query("SELECT COUNT(*) as count FROM medicines WHERE user_id = $1", [userId]),
      db.query("SELECT * FROM medicines WHERE user_id = $1", [userId]),
      db.query("SELECT COUNT(*) as count FROM orders WHERE user_id = $1 AND status IN ('Pending', 'Ordered', 'Shipped')", [userId])
    ]);

    const activeMedicines = parseInt(activeMedicinesResult.rows[0].count, 10);
    const pendingOrders = parseInt(pendingOrdersResult.rows[0].count, 10);

    const today = new Date().toISOString().slice(0, 10);
    const todayRemindersResult = await db.query(
      "SELECT COUNT(*) as count FROM reminders WHERE user_id = $1 AND date = $2",
      [userId, today]
    );
    const todayReminders = parseInt(todayRemindersResult.rows[0].count, 10);

    // Low stock items (medicines where days left <= 7)
    let lowStock = 0;
    medicinesResult.rows.forEach((m) => {
      const daysLeft =
        m.dosage_per_day > 0
          ? Math.floor(m.tablets_qty / m.dosage_per_day)
          : m.tablets_qty;
      if (daysLeft <= 7) lowStock++;
    });

    // Upcoming reminders (next 3)
    const upcomingRemindersResult = await db.query(
      `SELECT * FROM reminders
       WHERE user_id = $1 AND done = 0 AND (date > $2 OR (date = $3 AND time >= $4))
       ORDER BY date ASC, time ASC
       LIMIT 3`,
      [
        userId,
        today,
        today,
        new Date().toTimeString().slice(0, 5)
      ]
    );

    const upcomingReminders = upcomingRemindersResult.rows.map((r) => ({
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

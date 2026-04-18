const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All reminder routes require authentication
router.use(authenticate);

// GET /api/reminders
router.get("/", async (req, res) => {
  try {
    const reminders = await db.query(
      "SELECT * FROM reminders WHERE user_id = $1 ORDER BY date ASC, time ASC",
      [req.user.id]
    );
    res.json(reminders.rows.map(normalise));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/reminders
router.post("/", async (req, res) => {
  try {
    const { medicineName, date, time, frequency = "Daily", note = "" } = req.body;

    if (!medicineName || !date || !time) {
      return res.status(400).json({ error: "medicineName, date, and time are required." });
    }

    const result = await db.query(
      `INSERT INTO reminders (user_id, medicine_name, date, time, frequency, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, medicineName, date, time, frequency, note]
    );

    res.status(201).json(normalise(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/reminders/:id
router.put("/:id", async (req, res) => {
  try {
    const { medicineName, date, time, frequency, note, done } = req.body;
    const { id } = req.params;

    const existingResult = await db.query(
      "SELECT * FROM reminders WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Reminder not found." });
    }

    const existing = existingResult.rows[0];

    const updatedResult = await db.query(
      `UPDATE reminders
       SET medicine_name = $1,
           date          = $2,
           time          = $3,
           frequency     = $4,
           note          = $5,
           done          = $6,
           notified      = CASE WHEN date != $7 OR time != $8 THEN 0 ELSE notified END
       WHERE id = $9 RETURNING *`,
      [
        medicineName ?? existing.medicine_name,
        date ?? existing.date,
        time ?? existing.time,
        frequency ?? existing.frequency,
        note ?? existing.note,
        done !== undefined ? (done ? 1 : 0) : existing.done,
        date ?? existing.date,
        time ?? existing.time,
        id
      ]
    );

    res.json(normalise(updatedResult.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/reminders/:id/toggle
router.patch("/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const existingResult = await db.query(
      "SELECT * FROM reminders WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Reminder not found." });
    }

    const existing = existingResult.rows[0];
    const newDoneState = existing.done ? 0 : 1;

    const updatedResult = await db.query(
      "UPDATE reminders SET done = $1 WHERE id = $2 RETURNING *",
      [newDoneState, id]
    );

    // If the reminder is now tracked as 'done' (dose taken), decrement stock
    if (newDoneState === 1) {
      try {
        await db.query(
          "UPDATE medicines SET tablets_qty = GREATEST(tablets_qty - 1, 0) WHERE user_id = $1 AND medicine_name = $2",
          [req.user.id, existing.medicine_name]
        );
      } catch (err) {
        console.error("Failed to decrement medicine stock:", err);
      }
    }

    res.json(normalise(updatedResult.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/reminders/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existingResult = await db.query(
      "SELECT * FROM reminders WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Reminder not found." });
    }

    await db.query("DELETE FROM reminders WHERE id = $1", [id]);
    res.json({ success: true, id: Number(id) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/reminders — clear all for current user
router.delete("/", async (req, res) => {
  try {
    await db.query("DELETE FROM reminders WHERE user_id = $1", [req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper: snake_case → camelCase
function normalise(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    medicineName: row.medicine_name,
    date: row.date,
    time: row.time,
    frequency: row.frequency,
    note: row.note,
    done: row.done === 1,
    notified: row.notified === 1,
    createdAt: row.created_at,
  };
}

module.exports = router;

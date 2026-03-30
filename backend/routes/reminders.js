const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All reminder routes require authentication
router.use(authenticate);

// GET /api/reminders
router.get("/", (req, res) => {
  const reminders = db
    .prepare("SELECT * FROM reminders WHERE user_id = ? ORDER BY date ASC, time ASC")
    .all(req.user.id);
  res.json(reminders.map(normalise));
});

// POST /api/reminders
router.post("/", (req, res) => {
  const { medicineName, date, time, frequency = "Daily", note = "" } = req.body;

  if (!medicineName || !date || !time) {
    return res.status(400).json({ error: "medicineName, date, and time are required." });
  }

  const result = db
    .prepare(
      `INSERT INTO reminders (user_id, medicine_name, date, time, frequency, note)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, medicineName, date, time, frequency, note);

  const created = db.prepare("SELECT * FROM reminders WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(normalise(created));
});

// PUT /api/reminders/:id
router.put("/:id", (req, res) => {
  const { medicineName, date, time, frequency, note, done } = req.body;
  const { id } = req.params;

  const existing = db
    .prepare("SELECT * FROM reminders WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);
  if (!existing) return res.status(404).json({ error: "Reminder not found." });

  db.prepare(
    `UPDATE reminders
     SET medicine_name = ?,
         date          = ?,
         time          = ?,
         frequency     = ?,
         note          = ?,
         done          = ?,
         notified      = CASE WHEN date != ? OR time != ? THEN 0 ELSE notified END
     WHERE id = ?`
  ).run(
    medicineName ?? existing.medicine_name,
    date ?? existing.date,
    time ?? existing.time,
    frequency ?? existing.frequency,
    note ?? existing.note,
    done !== undefined ? (done ? 1 : 0) : existing.done,
    date ?? existing.date,
    time ?? existing.time,
    id
  );

  const row = db.prepare("SELECT * FROM reminders WHERE id = ?").get(id);
  res.json(normalise(row));
});

// PATCH /api/reminders/:id/toggle
router.patch("/:id/toggle", (req, res) => {
  const { id } = req.params;
  const existing = db
    .prepare("SELECT * FROM reminders WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);
  if (!existing) return res.status(404).json({ error: "Reminder not found." });

  db.prepare("UPDATE reminders SET done = ? WHERE id = ?").run(existing.done ? 0 : 1, id);
  const row = db.prepare("SELECT * FROM reminders WHERE id = ?").get(id);
  res.json(normalise(row));
});

// DELETE /api/reminders/:id
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const existing = db
    .prepare("SELECT * FROM reminders WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);
  if (!existing) return res.status(404).json({ error: "Reminder not found." });

  db.prepare("DELETE FROM reminders WHERE id = ?").run(id);
  res.json({ success: true, id: Number(id) });
});

// DELETE /api/reminders — clear all for current user
router.delete("/", (req, res) => {
  db.prepare("DELETE FROM reminders WHERE user_id = ?").run(req.user.id);
  res.json({ success: true });
});

// Helper: snake_case → camelCase
function normalise(row) {
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

const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// POST /api/tokens — register / refresh a device token
router.post("/", authenticate, (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token is required." });

  db.prepare(
    `INSERT INTO device_tokens (user_id, token)
     VALUES (?, ?)
     ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id`
  ).run(req.user.id, token);

  res.status(201).json({ success: true });
});

// DELETE /api/tokens — unregister a token
router.delete("/", authenticate, (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token is required." });

  db.prepare("DELETE FROM device_tokens WHERE token = ?").run(token);
  res.json({ success: true });
});

module.exports = router;

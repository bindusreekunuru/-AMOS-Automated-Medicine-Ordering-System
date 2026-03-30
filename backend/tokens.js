const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /api/tokens  – register / refresh a device token
router.post("/", (req, res) => {
  const { user_id = "default", token } = req.body;
  if (!token) return res.status(400).json({ error: "token is required." });

  db.prepare(
    `INSERT INTO device_tokens (user_id, token)
     VALUES (?, ?)
     ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id`
  ).run(user_id, token);

  res.status(201).json({ success: true });
});

// DELETE /api/tokens  – unregister a token (logout / permission revoked)
router.delete("/", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token is required." });

  db.prepare("DELETE FROM device_tokens WHERE token = ?").run(token);
  res.json({ success: true });
});

module.exports = router;

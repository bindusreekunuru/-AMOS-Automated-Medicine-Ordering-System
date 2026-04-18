const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// POST /api/tokens — register / refresh a device token
router.post("/", authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "token is required." });

    await db.query(
      `INSERT INTO device_tokens (user_id, token)
       VALUES ($1, $2)
       ON CONFLICT(token) DO UPDATE SET user_id = EXCLUDED.user_id`,
      [req.user.id, token]
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/tokens — unregister a token
router.delete("/", authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "token is required." });

    await db.query("DELETE FROM device_tokens WHERE token = $1", [token]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

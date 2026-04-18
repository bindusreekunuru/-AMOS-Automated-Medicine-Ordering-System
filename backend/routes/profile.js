const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All profile routes require authentication
router.use(authenticate);

// ── GET /api/profile ────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const userResult = await db.query(
      "SELECT * FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json(normalise(userResult.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/profile ────────────────────────────────────────────────────────
router.put("/", async (req, res) => {
  try {
    const userResult = await db.query(
      "SELECT * FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = userResult.rows[0];

    const {
      fullName,
      phone,
      age,
      gender,
      city,
      address,
      bloodGroup,
      allergies,
      conditions,
      emergencyName,
      emergencyRelation,
      emergencyPhone,
    } = req.body;

    const updatedResult = await db.query(
      `UPDATE users SET
         full_name          = $1,
         phone              = $2,
         age                = $3,
         gender             = $4,
         city               = $5,
         address            = $6,
         blood_group        = $7,
         allergies          = $8,
         conditions         = $9,
         emergency_name     = $10,
         emergency_relation = $11,
         emergency_phone    = $12
       WHERE id = $13 RETURNING *`,
      [
        fullName ?? user.full_name,
        phone ?? user.phone,
        age ?? user.age,
        gender ?? user.gender,
        city ?? user.city,
        address ?? user.address,
        bloodGroup ?? user.blood_group,
        allergies ?? user.allergies,
        conditions ?? user.conditions,
        emergencyName ?? user.emergency_name,
        emergencyRelation ?? user.emergency_relation,
        emergencyPhone ?? user.emergency_phone,
        req.user.id
      ]
    );

    res.json({ message: "Profile updated.", profile: normalise(updatedResult.rows[0]) });
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
    username: row.username,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    age: row.age,
    gender: row.gender,
    city: row.city,
    address: row.address,
    bloodGroup: row.blood_group,
    allergies: row.allergies,
    conditions: row.conditions,
    emergencyName: row.emergency_name,
    emergencyRelation: row.emergency_relation,
    emergencyPhone: row.emergency_phone,
    createdAt: row.created_at,
  };
}

module.exports = router;

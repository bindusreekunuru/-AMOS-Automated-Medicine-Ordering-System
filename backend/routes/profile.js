const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All profile routes require authentication
router.use(authenticate);

// ── GET /api/profile ────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  res.json(normalise(user));
});

// ── PUT /api/profile ────────────────────────────────────────────────────────
router.put("/", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

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

  db.prepare(
    `UPDATE users SET
       full_name          = ?,
       phone              = ?,
       age                = ?,
       gender             = ?,
       city               = ?,
       address            = ?,
       blood_group        = ?,
       allergies          = ?,
       conditions         = ?,
       emergency_name     = ?,
       emergency_relation = ?,
       emergency_phone    = ?
     WHERE id = ?`
  ).run(
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
  );

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  res.json({ message: "Profile updated.", profile: normalise(updated) });
});

// Helper: snake_case → camelCase
function normalise(row) {
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

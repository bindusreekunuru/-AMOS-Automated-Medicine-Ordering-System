const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { authenticate, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// ── POST /api/auth/register ─────────────────────────────────────────────────
router.post("/register", (req, res) => {
  const {
    username,
    fullName,
    email,
    phone,
    password,
    age,
    gender,
    city,
    address,
  } = req.body;

  // Validation
  if (!username || !fullName || !email || !phone || !password) {
    return res.status(400).json({
      error: "username, fullName, email, phone, and password are required.",
    });
  }

  if (password.length < 4) {
    return res
      .status(400)
      .json({ error: "Password must be at least 4 characters." });
  }

  if (!/^[0-9]{10}$/.test(phone.replace(/\D/g, ""))) {
    return res
      .status(400)
      .json({ error: "Enter a valid 10-digit phone number." });
  }

  // Check uniqueness
  const existing = db
    .prepare(
      "SELECT id FROM users WHERE username = ? OR LOWER(email) = LOWER(?)"
    )
    .get(username, email);

  if (existing) {
    return res
      .status(409)
      .json({ error: "That username or email is already registered." });
  }

  // Hash password & insert
  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare(
      `INSERT INTO users (username, full_name, email, phone, password_hash, age, gender, city, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      username,
      fullName,
      email,
      phone.replace(/\D/g, ""),
      passwordHash,
      age || null,
      gender || "Male",
      city || "",
      address || ""
    );

  const userId = result.lastInsertRowid;

  // Generate JWT
  const token = jwt.sign(
    { id: userId, username, email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.status(201).json({
    message: "Registration successful.",
    token,
    user: {
      id: userId,
      username,
      fullName,
      email,
      phone: phone.replace(/\D/g, ""),
    },
  });
});

// ── POST /api/auth/login ────────────────────────────────────────────────────
router.post("/login", (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res
      .status(400)
      .json({ error: "User ID and password are required." });
  }

  // userId can be username or email
  const user = db
    .prepare(
      "SELECT * FROM users WHERE username = ? OR LOWER(email) = LOWER(?)"
    )
    .get(userId, userId);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  // Generate JWT
  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    message: "Login successful.",
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
    },
  });
});

// ── GET /api/auth/me — current user info ────────────────────────────────────
router.get("/me", authenticate, (req, res) => {
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  res.json({
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    age: user.age,
    gender: user.gender,
    city: user.city,
    address: user.address,
    bloodGroup: user.blood_group,
    allergies: user.allergies,
    conditions: user.conditions,
    emergencyName: user.emergency_name,
    emergencyRelation: user.emergency_relation,
    emergencyPhone: user.emergency_phone,
    createdAt: user.created_at,
  });
});

module.exports = router;

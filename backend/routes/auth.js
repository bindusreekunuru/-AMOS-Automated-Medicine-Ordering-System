const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { authenticate, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// ── POST /api/auth/register ─────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
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
    console.log(`[Register] Attempting to register user: ${username} (${email})`);

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
    console.log(`[Register] Checking database for existing username/email...`);
    const existing = await db.query(
      "SELECT id FROM users WHERE username = $1 OR LOWER(email) = LOWER($2)",
      [username, email]
    );

    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "That username or email is already registered." });
    }

    // Hash password & insert
    console.log(`[Register] Hashing password...`);
    const passwordHash = bcrypt.hashSync(password, 10);

    console.log(`[Register] Inserting user into database...`);
    const result = await db.query(
      `INSERT INTO users (username, full_name, email, phone, password_hash, age, gender, city, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        username,
        fullName,
        email,
        phone.replace(/\D/g, ""),
        passwordHash,
        age || null,
        gender || "Male",
        city || "",
        address || ""
      ]
    );

    const userId = result.rows[0].id;
    console.log(`[Register] User created with ID: ${userId}. Generating token...`);

    // Generate JWT
    const token = jwt.sign(
      { id: userId, username, email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    console.log(`[Register] Registration complete for ${username}.`);

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── POST /api/auth/login ────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res
        .status(400)
        .json({ error: "User ID and password are required." });
    }

    // userId can be username or email
    const userResult = await db.query(
      "SELECT * FROM users WHERE username = $1 OR LOWER(email) = LOWER($2)",
      [userId, userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const user = userResult.rows[0];
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── GET /api/auth/me — current user info ────────────────────────────────────
router.get("/me", authenticate, async (req, res) => {
  try {
    const userResult = await db.query(
      "SELECT * FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = userResult.rows[0];

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;

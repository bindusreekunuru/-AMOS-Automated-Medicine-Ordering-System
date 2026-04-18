const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All prescription routes require authentication
router.use(authenticate);

// ── Multer configuration ────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `prescription_${req.user.id}_${Date.now()}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only images and PDF files are allowed."));
    }
  },
});

// ── POST /api/prescriptions/upload ──────────────────────────────────────────
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const result = await db.query(
      `INSERT INTO prescriptions (user_id, file_name, file_path)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, req.file.originalname, req.file.filename]
    );

    res.status(201).json(normalise(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/prescriptions ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const prescriptions = await db.query(
      "SELECT * FROM prescriptions WHERE user_id = $1 ORDER BY uploaded_at DESC",
      [req.user.id]
    );

    res.json(prescriptions.rows.map(normalise));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/prescriptions/:id ───────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingResult = await db.query(
      "SELECT * FROM prescriptions WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Prescription not found." });
    }

    const existing = existingResult.rows[0];

    // Delete file from disk
    const filePath = path.join(uploadsDir, existing.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await db.query("DELETE FROM prescriptions WHERE id = $1", [id]);
    res.json({ success: true, id: Number(id) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// Helper: normalise row
function normalise(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    fileName: row.file_name,
    filePath: `/uploads/${row.file_path}`,
    uploadedAt: row.uploaded_at,
  };
}

module.exports = router;

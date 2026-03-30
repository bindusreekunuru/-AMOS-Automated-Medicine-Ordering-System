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
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const result = db
    .prepare(
      `INSERT INTO prescriptions (user_id, file_name, file_path)
       VALUES (?, ?, ?)`
    )
    .run(req.user.id, req.file.originalname, req.file.filename);

  const created = db
    .prepare("SELECT * FROM prescriptions WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(normalise(created));
});

// ── GET /api/prescriptions ──────────────────────────────────────────────────
router.get("/", (req, res) => {
  const prescriptions = db
    .prepare(
      "SELECT * FROM prescriptions WHERE user_id = ? ORDER BY uploaded_at DESC"
    )
    .all(req.user.id);

  res.json(prescriptions.map(normalise));
});

// ── DELETE /api/prescriptions/:id ───────────────────────────────────────────
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const existing = db
    .prepare("SELECT * FROM prescriptions WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: "Prescription not found." });
  }

  // Delete file from disk
  const filePath = path.join(uploadsDir, existing.file_path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare("DELETE FROM prescriptions WHERE id = ?").run(id);
  res.json({ success: true, id: Number(id) });
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
  return {
    id: row.id,
    userId: row.user_id,
    fileName: row.file_name,
    filePath: `/uploads/${row.file_path}`,
    uploadedAt: row.uploaded_at,
  };
}

module.exports = router;

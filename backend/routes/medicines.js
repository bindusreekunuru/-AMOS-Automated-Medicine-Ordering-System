const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All medicine routes require authentication
router.use(authenticate);

// ── GET /api/medicines ──────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const medicines = db
    .prepare(
      "SELECT * FROM medicines WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(req.user.id);

  res.json(medicines.map(normalise));
});

// ── GET /api/medicines/stats ────────────────────────────────────────────────
router.get("/stats", (req, res) => {
  const medicines = db
    .prepare("SELECT * FROM medicines WHERE user_id = ?")
    .all(req.user.id);

  let total = medicines.length;
  let inStock = 0;
  let lowStock = 0;
  let critical = 0;

  medicines.forEach((m) => {
    const daysLeft =
      m.dosage_per_day > 0
        ? Math.floor(m.tablets_qty / m.dosage_per_day)
        : m.tablets_qty;

    if (daysLeft <= 2) critical++;
    else if (daysLeft <= 7) lowStock++;
    else inStock++;
  });

  res.json({ total, inStock, lowStock, critical });
});

// ── POST /api/medicines ─────────────────────────────────────────────────────
router.post("/", (req, res) => {
  const { medicineName, dosagePerDay, tabletsQty, reorderLevel, notes } =
    req.body;

  if (!medicineName || !dosagePerDay || !tabletsQty) {
    return res
      .status(400)
      .json({ error: "medicineName, dosagePerDay, and tabletsQty are required." });
  }

  const result = db
    .prepare(
      `INSERT INTO medicines (user_id, medicine_name, dosage_per_day, tablets_qty, reorder_level, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      medicineName,
      Number(dosagePerDay),
      Number(tabletsQty),
      Number(reorderLevel) || 10,
      notes || ""
    );

  const created = db
    .prepare("SELECT * FROM medicines WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(normalise(created));
});

// ── PUT /api/medicines/:id ──────────────────────────────────────────────────
router.put("/:id", (req, res) => {
  const { id } = req.params;

  const existing = db
    .prepare("SELECT * FROM medicines WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: "Medicine not found." });
  }

  const { medicineName, dosagePerDay, tabletsQty, reorderLevel, notes } =
    req.body;

  db.prepare(
    `UPDATE medicines SET
       medicine_name  = ?,
       dosage_per_day = ?,
       tablets_qty    = ?,
       reorder_level  = ?,
       notes          = ?
     WHERE id = ?`
  ).run(
    medicineName ?? existing.medicine_name,
    dosagePerDay !== undefined ? Number(dosagePerDay) : existing.dosage_per_day,
    tabletsQty !== undefined ? Number(tabletsQty) : existing.tablets_qty,
    reorderLevel !== undefined ? Number(reorderLevel) : existing.reorder_level,
    notes ?? existing.notes,
    id
  );

  const updated = db.prepare("SELECT * FROM medicines WHERE id = ?").get(id);
  res.json(normalise(updated));
});

// ── DELETE /api/medicines/:id ───────────────────────────────────────────────
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const existing = db
    .prepare("SELECT * FROM medicines WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: "Medicine not found." });
  }

  db.prepare("DELETE FROM medicines WHERE id = ?").run(id);
  res.json({ success: true, id: Number(id) });
});

// Helper: snake_case → camelCase
function normalise(row) {
  return {
    id: row.id,
    userId: row.user_id,
    medicineName: row.medicine_name,
    dosagePerDay: row.dosage_per_day,
    tabletsQty: row.tablets_qty,
    reorderLevel: row.reorder_level,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

module.exports = router;

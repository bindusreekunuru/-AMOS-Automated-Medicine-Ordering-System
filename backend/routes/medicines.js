const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All medicine routes require authentication
router.use(authenticate);

// ── GET /api/medicines ──────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const medicines = await db.query(
      "SELECT * FROM medicines WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );

    res.json(medicines.rows.map(normalise));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/medicines/stats ────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const medicines = await db.query(
      "SELECT * FROM medicines WHERE user_id = $1",
      [req.user.id]
    );

    let total = medicines.rows.length;
    let inStock = 0;
    let lowStock = 0;
    let critical = 0;

    medicines.rows.forEach((m) => {
      const daysLeft =
        m.dosage_per_day > 0
          ? Math.floor(m.tablets_qty / m.dosage_per_day)
          : m.tablets_qty;

      if (daysLeft <= 2) critical++;
      else if (daysLeft <= 7) lowStock++;
      else inStock++;
    });

    res.json({ total, inStock, lowStock, critical });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/medicines ─────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { medicineName, dosagePerDay, tabletsQty, reorderLevel, notes } =
      req.body;

    if (!medicineName || !dosagePerDay || !tabletsQty) {
      return res
        .status(400)
        .json({ error: "medicineName, dosagePerDay, and tabletsQty are required." });
    }

    const result = await db.query(
      `INSERT INTO medicines (user_id, medicine_name, dosage_per_day, tablets_qty, reorder_level, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.user.id,
        medicineName,
        Number(dosagePerDay),
        Number(tabletsQty),
        Number(reorderLevel) || 10,
        notes || ""
      ]
    );

    res.status(201).json(normalise(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/medicines/:id ──────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingResult = await db.query(
      "SELECT * FROM medicines WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Medicine not found." });
    }

    const existing = existingResult.rows[0];
    const { medicineName, dosagePerDay, tabletsQty, reorderLevel, notes } =
      req.body;

    const updatedResult = await db.query(
      `UPDATE medicines SET
         medicine_name  = $1,
         dosage_per_day = $2,
         tablets_qty    = $3,
         reorder_level  = $4,
         notes          = $5
       WHERE id = $6 RETURNING *`,
      [
        medicineName ?? existing.medicine_name,
        dosagePerDay !== undefined ? Number(dosagePerDay) : existing.dosage_per_day,
        tabletsQty !== undefined ? Number(tabletsQty) : existing.tablets_qty,
        reorderLevel !== undefined ? Number(reorderLevel) : existing.reorder_level,
        notes ?? existing.notes,
        id
      ]
    );

    res.json(normalise(updatedResult.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/medicines/:id ───────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingResult = await db.query(
      "SELECT * FROM medicines WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Medicine not found." });
    }

    await db.query("DELETE FROM medicines WHERE id = $1", [id]);
    res.json({ success: true, id: Number(id) });
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

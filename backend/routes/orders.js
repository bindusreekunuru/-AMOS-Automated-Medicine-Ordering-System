const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// ── GET /api/orders ─────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const orders = await db.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );

    res.json(orders.rows.map(normalise));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/orders/stats ───────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const orders = await db.query(
      "SELECT * FROM orders WHERE user_id = $1",
      [req.user.id]
    );

    const total = orders.rows.length;
    const ordered = orders.rows.filter((o) => o.status === "Ordered").length;
    const delivered = orders.rows.filter((o) => o.status === "Delivered").length;
    const pending = total - ordered - delivered;

    res.json({ total, ordered, delivered, pending });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/orders ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { medicineName, qty, pharmacy, status, price, orderDate } = req.body;

    if (!medicineName) {
      return res
        .status(400)
        .json({ error: "medicineName is required." });
    }

    // Auto-generate order reference
    const countResult = await db.query(
      "SELECT COUNT(*) as c FROM orders WHERE user_id = $1",
      [req.user.id]
    );
    const count = parseInt(countResult.rows[0].c, 10);

    const orderRef = `ORD-${1001 + count}`;

    const result = await db.query(
      `INSERT INTO orders (user_id, order_ref, medicine_name, qty, pharmacy, status, price, order_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.user.id,
        orderRef,
        medicineName,
        Number(qty) || 1,
        pharmacy || "",
        status || "Pending",
        Number(price) || 0,
        orderDate || new Date().toISOString().slice(0, 10)
      ]
    );

    // Auto-restock the medicine corresponding to this order
    try {
      await db.query(
        "UPDATE medicines SET tablets_qty = tablets_qty + $1 WHERE user_id = $2 AND medicine_name = $3",
        [Number(qty) || 1, req.user.id, medicineName]
      );
    } catch (restockErr) {
      console.error("Failed to auto-restock medicine:", restockErr);
    }

    res.status(201).json(normalise(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/orders/:id ─────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingResult = await db.query(
      "SELECT * FROM orders WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    const existing = existingResult.rows[0];
    const { medicineName, qty, pharmacy, status, price } = req.body;

    const updatedResult = await db.query(
      `UPDATE orders SET
         medicine_name = $1,
         qty           = $2,
         pharmacy      = $3,
         status        = $4,
         price         = $5
       WHERE id = $6 RETURNING *`,
      [
        medicineName ?? existing.medicine_name,
        qty !== undefined ? Number(qty) : existing.qty,
        pharmacy ?? existing.pharmacy,
        status ?? existing.status,
        price !== undefined ? Number(price) : existing.price,
        id
      ]
    );

    res.json(normalise(updatedResult.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/orders/:id ──────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingResult = await db.query(
      "SELECT * FROM orders WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    await db.query("DELETE FROM orders WHERE id = $1", [id]);
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
    orderRef: row.order_ref,
    medicineName: row.medicine_name,
    qty: row.qty,
    pharmacy: row.pharmacy,
    status: row.status,
    price: row.price,
    orderDate: row.order_date,
    createdAt: row.created_at,
  };
}

module.exports = router;

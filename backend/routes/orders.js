const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// ── GET /api/orders ─────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const orders = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);

  res.json(orders.map(normalise));
});

// ── GET /api/orders/stats ───────────────────────────────────────────────────
router.get("/stats", (req, res) => {
  const orders = db
    .prepare("SELECT * FROM orders WHERE user_id = ?")
    .all(req.user.id);

  const total = orders.length;
  const ordered = orders.filter((o) => o.status === "Ordered").length;
  const delivered = orders.filter((o) => o.status === "Delivered").length;
  const pending = total - ordered - delivered;

  res.json({ total, ordered, delivered, pending });
});

// ── POST /api/orders ────────────────────────────────────────────────────────
router.post("/", (req, res) => {
  const { medicineName, qty, pharmacy, status, price, orderDate } = req.body;

  if (!medicineName) {
    return res
      .status(400)
      .json({ error: "medicineName is required." });
  }

  // Auto-generate order reference
  const count = db
    .prepare("SELECT COUNT(*) as c FROM orders WHERE user_id = ?")
    .get(req.user.id).c;

  const orderRef = `ORD-${1001 + count}`;

  const result = db
    .prepare(
      `INSERT INTO orders (user_id, order_ref, medicine_name, qty, pharmacy, status, price, order_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      orderRef,
      medicineName,
      Number(qty) || 1,
      pharmacy || "",
      status || "Pending",
      Number(price) || 0,
      orderDate || new Date().toISOString().slice(0, 10)
    );

  const created = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(normalise(created));
});

// ── PUT /api/orders/:id ─────────────────────────────────────────────────────
router.put("/:id", (req, res) => {
  const { id } = req.params;

  const existing = db
    .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: "Order not found." });
  }

  const { medicineName, qty, pharmacy, status, price } = req.body;

  db.prepare(
    `UPDATE orders SET
       medicine_name = ?,
       qty           = ?,
       pharmacy      = ?,
       status        = ?,
       price         = ?
     WHERE id = ?`
  ).run(
    medicineName ?? existing.medicine_name,
    qty !== undefined ? Number(qty) : existing.qty,
    pharmacy ?? existing.pharmacy,
    status ?? existing.status,
    price !== undefined ? Number(price) : existing.price,
    id
  );

  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  res.json(normalise(updated));
});

// ── DELETE /api/orders/:id ──────────────────────────────────────────────────
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const existing = db
    .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: "Order not found." });
  }

  db.prepare("DELETE FROM orders WHERE id = ?").run(id);
  res.json({ success: true, id: Number(id) });
});

// Helper: snake_case → camelCase
function normalise(row) {
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

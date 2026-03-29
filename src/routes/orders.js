import express from "express";
import { getDb } from "../config/db.js";
import { protect, requireAdmin } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

const mapOrder = (row) => ({
  _id: String(row.id),
  orderNumber: row.order_number,
  customerName: row.customer_name,
  email: row.email,
  phone: row.phone,
  notes: row.notes,
  status: row.status,
  totalAmount: Number(row.total_amount || 0),
  items: JSON.parse(row.items || "[]"),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const nextOrderNumber = async (db) => {
  const existing = await db.get("SELECT value FROM counters WHERE key = 'orderNumber'");
  if (!existing) {
    await db.run("INSERT INTO counters (key, value) VALUES ('orderNumber', 1)");
    return "MV00001";
  }

  const nextValue = existing.value + 1;
  await db.run("UPDATE counters SET value = ? WHERE key = 'orderNumber'", [nextValue]);
  return `MV${String(nextValue).padStart(5, "0")}`;
};

router.post("/", asyncHandler(async (req, res) => {
  const db = getDb();
  const { customerName, email, phone, notes = "", items = [] } = req.body;

  if (!items.length) {
    return res.status(400).json({ message: "At least one item is required" });
  }

  const sareeIds = items.map((item) => item.sareeId);
  const placeholders = sareeIds.map(() => "?").join(", ");
  const sarees = await db.all(`SELECT * FROM sarees WHERE id IN (${placeholders})`, sareeIds);
  const sareeMap = new Map(sarees.map((saree) => [String(saree.id), saree]));

  const orderItems = items.map((item) => {
    const saree = sareeMap.get(String(item.sareeId));
    if (!saree) {
      throw new Error(`Saree not found: ${item.sareeId}`);
    }

    const quantity = Number(item.quantity || 1);
    const unitPrice = saree.salePrice || saree.price;

    return {
      saree: String(saree.id),
      name: saree.name,
      price: unitPrice,
      quantity,
      image: JSON.parse(saree.images || "[]")[0]?.url || "",
    };
  });

  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderNumber = await nextOrderNumber(db);
  const result = await db.run(
    `INSERT INTO orders
      (order_number, customer_name, email, phone, notes, status, total_amount, items, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP)`,
    [orderNumber, customerName, email, phone, notes, totalAmount, JSON.stringify(orderItems)]
  );
  const row = await db.get("SELECT * FROM orders WHERE id = ?", [result.lastID]);
  res.status(201).json(mapOrder(row));
}));

router.get("/", protect, asyncHandler(async (_req, res) => {
  const db = getDb();
  const rows = await db.all("SELECT * FROM orders ORDER BY datetime(created_at) DESC");
  res.json(rows.map(mapOrder));
}));

router.patch("/:id", protect, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDb();
  const { status } = req.body;
  const order = await db.get("SELECT * FROM orders WHERE id = ?", [req.params.id]);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  await db.run(
    `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status || order.status, req.params.id]
  );
  const updatedRow = await db.get("SELECT * FROM orders WHERE id = ?", [req.params.id]);
  res.json(mapOrder(updatedRow));
}));

export default router;

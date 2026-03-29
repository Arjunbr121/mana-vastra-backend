import express from "express";
import { getDb } from "../config/db.js";
import { protect, requireAdmin } from "../middleware/auth.js";
import { deleteLocalImages, upload, uploadImages } from "../utils/upload.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

const parseArray = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return String(value)
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
};

const parseExistingImages = (value) => {
  const parsed = parseArray(value);
  return parsed
    .map((image) => {
      if (typeof image === "string") {
        return { url: image };
      }

      return image;
    })
    .filter((image) => image?.url);
};

const mapSaree = (row) => ({
  _id: String(row.id),
  sku: row.sku,
  name: row.name,
  description: row.description,
  category: row.category,
  fabric: row.fabric,
  color: row.color,
  occasion: row.occasion,
  price: Number(row.price || 0),
  salePrice: row.sale_price === null ? null : Number(row.sale_price),
  stock: Number(row.stock || 0),
  available: Boolean(row.available),
  inventoryStatus: row.inventory_status || "in_stock",
  soldAt: row.sold_at,
  featured: Boolean(row.featured),
  tags: JSON.parse(row.tags || "[]"),
  images: JSON.parse(row.images || "[]"),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

router.get("/", asyncHandler(async (req, res) => {
  const db = getDb();
  const { category, search, available, inventoryStatus } = req.query;
  const conditions = [];
  const params = [];

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }

  if (available !== undefined) {
    conditions.push("available = ?");
    params.push(available === "true" ? 1 : 0);
  }

  if (inventoryStatus) {
    conditions.push("inventory_status = ?");
    params.push(inventoryStatus);
  }

  if (search) {
    conditions.push("(name LIKE ? OR category LIKE ? OR fabric LIKE ? OR color LIKE ? OR tags LIKE ?)");
    for (let index = 0; index < 5; index += 1) {
      params.push(`%${search}%`);
    }
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await db.all(
    `SELECT * FROM sarees ${whereClause} ORDER BY datetime(created_at) DESC`,
    params
  );
  res.json(rows.map(mapSaree));
}));

router.get("/stats", protect, asyncHandler(async (_req, res) => {
  const db = getDb();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();

  const [totalSarees, availableSarees, soldSarees, revenueData, monthlySold, monthlyRevenue, categories, monthlyTrend] = await Promise.all([
    db.get("SELECT COUNT(*) as count FROM sarees"),
    db.get("SELECT COUNT(*) as count FROM sarees WHERE available = 1"),
    db.get("SELECT COUNT(*) as count FROM sarees WHERE inventory_status = 'sold'"),
    db.get("SELECT COALESCE(SUM(COALESCE(sale_price, price)), 0) as total FROM sarees WHERE inventory_status = 'sold'"),
    db.get(
      "SELECT COUNT(*) as count FROM sarees WHERE inventory_status = 'sold' AND sold_at IS NOT NULL AND sold_at >= ?",
      [monthStartIso]
    ),
    db.get(
      "SELECT COALESCE(SUM(COALESCE(sale_price, price)), 0) as total FROM sarees WHERE inventory_status = 'sold' AND sold_at IS NOT NULL AND sold_at >= ?",
      [monthStartIso]
    ),
    db.all(
      `SELECT category,
              COUNT(*) as total,
              SUM(CASE WHEN inventory_status = 'in_stock' THEN 1 ELSE 0 END) as inStock,
              SUM(CASE WHEN inventory_status = 'sold' THEN 1 ELSE 0 END) as sold
       FROM sarees
       GROUP BY category
       ORDER BY total DESC`
    ),
    db.all(
      `SELECT strftime('%d', sold_at) as day,
              COUNT(*) as soldCount,
              COALESCE(SUM(COALESCE(sale_price, price)), 0) as revenue
       FROM sarees
       WHERE inventory_status = 'sold' AND sold_at IS NOT NULL AND sold_at >= ?
       GROUP BY strftime('%d', sold_at)
       ORDER BY strftime('%d', sold_at) ASC`,
      [monthStartIso]
    ),
  ]);

  res.json({
    totalSarees: totalSarees.count,
    availableSarees: availableSarees.count,
    soldSarees: soldSarees.count,
    totalRevenue: revenueData.total || 0,
    monthlySoldSarees: monthlySold.count,
    monthlyRevenue: monthlyRevenue.total || 0,
    topCategories: categories.map((row) => ({
      category: row.category,
      total: Number(row.total || 0),
      inStock: Number(row.inStock || 0),
      sold: Number(row.sold || 0),
    })),
    monthlyTrend: monthlyTrend.map((row) => ({
      day: row.day,
      soldCount: Number(row.soldCount || 0),
      revenue: Number(row.revenue || 0),
    })),
  });
}));

router.get("/meta/categories", asyncHandler(async (_req, res) => {
  res.json([
    "Silk Saree",
    "Cotton Saree",
    "Designer Saree",
    "Fancy Saree",
    "Ilkal Saree",
    "Banarasi Saree",
    "Daily Wear Saree",
  ]);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const db = getDb();
  const row = await db.get("SELECT * FROM sarees WHERE id = ?", [req.params.id]);
  if (!row) {
    return res.status(404).json({ message: "Saree not found" });
  }

  return res.json(mapSaree(row));
}));

router.post("/", protect, requireAdmin, upload.array("images", 5), asyncHandler(async (req, res) => {
  const db = getDb();
  const uploadedImages = uploadImages(req.files || []);
  const existingImages = parseExistingImages(req.body.existingImages);
  const images = [...existingImages, ...uploadedImages].slice(0, 5);

  const stock = Number(req.body.stock || 0);
  const inventoryStatus = stock > 0 ? "in_stock" : "sold";
  const soldAt = inventoryStatus === "sold" ? new Date().toISOString() : null;

  const result = await db.run(
    `INSERT INTO sarees
      (sku, name, description, category, fabric, color, occasion, price, sale_price, stock, available, inventory_status, sold_at, featured, tags, images, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      req.body.sku || null,
      req.body.name,
      req.body.description || "",
      req.body.category,
      req.body.fabric || "",
      req.body.color || "",
      req.body.occasion || "",
      Number(req.body.price),
      req.body.salePrice ? Number(req.body.salePrice) : null,
      stock,
      inventoryStatus === "in_stock" ? 1 : 0,
      inventoryStatus,
      soldAt,
      req.body.featured === "true" ? 1 : 0,
      JSON.stringify(parseArray(req.body.tags)),
      JSON.stringify(images),
    ]
  );
  const row = await db.get("SELECT * FROM sarees WHERE id = ?", [result.lastID]);
  res.status(201).json(mapSaree(row));
}));

router.patch("/:id", protect, requireAdmin, upload.array("images", 5), asyncHandler(async (req, res) => {
  const db = getDb();
  const currentRow = await db.get("SELECT * FROM sarees WHERE id = ?", [req.params.id]);
  if (!currentRow) {
    return res.status(404).json({ message: "Saree not found" });
  }
  const saree = mapSaree(currentRow);

  const existingImages = parseExistingImages(req.body.existingImages);
  const removedImages = saree.images.filter(
    (storedImage) => !existingImages.some((existingImage) => existingImage.url === storedImage.url)
  );

  const uploadedImages = uploadImages(req.files || []);
  const images = [...existingImages, ...uploadedImages].slice(0, 5);

  const stock = Number(req.body.stock ?? saree.stock);
  const inventoryStatus = stock > 0 ? "in_stock" : "sold";
  const soldAt = inventoryStatus === "sold"
    ? (saree.soldAt || new Date().toISOString())
    : null;

  await db.run(
    `UPDATE sarees
     SET sku = ?, name = ?, description = ?, category = ?, fabric = ?, color = ?, occasion = ?,
         price = ?, sale_price = ?, stock = ?, available = ?, inventory_status = ?, sold_at = ?, featured = ?, tags = ?, images = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      req.body.sku || null,
      req.body.name,
      req.body.description || "",
      req.body.category,
      req.body.fabric || "",
      req.body.color || "",
      req.body.occasion || "",
      Number(req.body.price),
      req.body.salePrice ? Number(req.body.salePrice) : null,
      stock,
      inventoryStatus === "in_stock" ? 1 : 0,
      inventoryStatus,
      soldAt,
      req.body.featured === "true" ? 1 : 0,
      JSON.stringify(parseArray(req.body.tags)),
      JSON.stringify(images),
      req.params.id,
    ]
  );
  await deleteLocalImages(removedImages);

  const updatedRow = await db.get("SELECT * FROM sarees WHERE id = ?", [req.params.id]);
  res.json(mapSaree(updatedRow));
}));

// Increment or decrement stock by 1. Status is auto-derived from resulting stock.
router.patch("/:id/stock", protect, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDb();
  const { action } = req.body; // "increment" | "decrement"

  if (!["increment", "decrement"].includes(action)) {
    return res.status(400).json({ message: "action must be increment or decrement" });
  }

  const row = await db.get("SELECT * FROM sarees WHERE id = ?", [req.params.id]);
  if (!row) {
    return res.status(404).json({ message: "Saree not found" });
  }

  const newStock = Math.max(0, Number(row.stock) + (action === "increment" ? 1 : -1));
  const inventoryStatus = newStock > 0 ? "in_stock" : "sold";
  const soldAt = inventoryStatus === "sold"
    ? (row.sold_at || new Date().toISOString())
    : null;
  const available = inventoryStatus === "in_stock" ? 1 : 0;

  await db.run(
    `UPDATE sarees
     SET stock = ?, inventory_status = ?, sold_at = ?, available = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [newStock, inventoryStatus, soldAt, available, req.params.id]
  );

  const updatedRow = await db.get("SELECT * FROM sarees WHERE id = ?", [req.params.id]);
  return res.json(mapSaree(updatedRow));
}));

router.delete("/:id", protect, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDb();
  const row = await db.get("SELECT * FROM sarees WHERE id = ?", [req.params.id]);
  if (!row) {
    return res.status(404).json({ message: "Saree not found" });
  }
  const saree = mapSaree(row);

  deleteLocalImages(saree.images);
  await db.run("DELETE FROM sarees WHERE id = ?", [req.params.id]);
  res.json({ message: "Saree deleted" });
}));

router.patch("/:id/toggle", protect, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDb();
  if (!Number.isInteger(Number(req.params.id))) {
    return res.status(400).json({ message: "Invalid saree id" });
  }

  const row = await db.get("SELECT * FROM sarees WHERE id = ?", [req.params.id]);
  if (!row) {
    return res.status(404).json({ message: "Saree not found" });
  }

  const nextAvailable = row.available ? 0 : 1;
  await db.run(
    `UPDATE sarees SET available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [nextAvailable, req.params.id]
  );
  const updatedRow = await db.get("SELECT * FROM sarees WHERE id = ?", [req.params.id]);
  res.json(mapSaree(updatedRow));
}));

export default router;

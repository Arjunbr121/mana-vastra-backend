import bcrypt from "bcryptjs";
import { getDb } from "../config/db.js";

const sampleSarees = [
  {
    sku: "MVS-001",
    name: "Royal Kanchi Gold Border",
    category: "Silk Saree",
    fabric: "Pure Silk",
    color: "Maroon",
    occasion: "Wedding",
    description: "Classic silk saree with zari border for bridal and festive styling.",
    price: 18500,
    salePrice: 16900,
    stock: 2,
    available: 1,
    inventoryStatus: "in_stock",
    featured: 1,
    tags: ["Luxury", "Bridal", "In Stock"],
  },
  {
    sku: "MVS-002",
    name: "Temple Weave Heritage",
    category: "Banarasi Saree",
    fabric: "Banarasi Silk",
    color: "Bottle Green",
    occasion: "Festive",
    description: "A rich Banarasi drape with heritage motifs and elegant sheen.",
    price: 14200,
    salePrice: null,
    stock: 1,
    available: 1,
    inventoryStatus: "in_stock",
    featured: 1,
    tags: ["Festive", "Handpicked", "In Stock"],
  },
  {
    sku: "MVS-003",
    name: "Soft Loom Comfort",
    category: "Cotton Saree",
    fabric: "Handloom Cotton",
    color: "Indigo",
    occasion: "Office",
    description: "Lightweight cotton saree crafted for daily comfort and refined style.",
    price: 3200,
    salePrice: 2890,
    stock: 5,
    available: 1,
    inventoryStatus: "in_stock",
    featured: 0,
    tags: ["Daily Wear", "Breathable", "In Stock"],
  },
  {
    sku: "MVS-004",
    name: "Studio Drape Edit",
    category: "Designer Saree",
    fabric: "Organza Blend",
    color: "Champagne Beige",
    occasion: "Party",
    description: "Contemporary designer saree with soft shimmer and structured fall.",
    price: 11800,
    salePrice: 10400,
    stock: 1,
    available: 0,
    inventoryStatus: "sold",
    soldAt: new Date().toISOString(),
    featured: 1,
    tags: ["Statement", "Sold"],
  },
  {
    sku: "MVS-005",
    name: "Evening Sparkle Drape",
    category: "Fancy Saree",
    fabric: "Georgette",
    color: "Black",
    occasion: "Reception",
    description: "Fancy saree with subtle sequin detailing for evening occasions.",
    price: 7600,
    salePrice: 6990,
    stock: 1,
    available: 0,
    inventoryStatus: "sold",
    soldAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    featured: 0,
    tags: ["Party Wear", "Sold"],
  },
  {
    sku: "MVS-006",
    name: "Ilkal Loom Signature",
    category: "Ilkal Saree",
    fabric: "Cotton Silk",
    color: "Rust Orange",
    occasion: "Traditional",
    description: "Traditional Ilkal weave with contrast pallu and signature borders.",
    price: 5400,
    salePrice: null,
    stock: 3,
    available: 1,
    inventoryStatus: "in_stock",
    featured: 0,
    tags: ["Traditional", "In Stock"],
  },
  {
    sku: "MVS-007",
    name: "Grace Everyday Border",
    category: "Daily Wear Saree",
    fabric: "Printed Crepe",
    color: "Teal Blue",
    occasion: "Daily Wear",
    description: "Simple and elegant daily-wear saree for comfortable all-day styling.",
    price: 2400,
    salePrice: 2100,
    stock: 6,
    available: 1,
    inventoryStatus: "in_stock",
    featured: 0,
    tags: ["Easy Care", "In Stock"],
  },
];

export const seedAdmin = async () => {
  const db = getDb();
  const adminEmail = process.env.ADMIN_EMAIL || "admin@manavastra.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existing = await db.get("SELECT id FROM users WHERE email = ?", [adminEmail]);

  if (existing) {
    return;
  }

  const password = await bcrypt.hash(adminPassword, 10);
  await db.run(
    `INSERT INTO users (name, email, password, role, is_active)
     VALUES (?, ?, ?, 'admin', 1)`,
    ["Mana Vastra Admin", adminEmail, password]
  );

  console.log(`Seeded admin user: ${adminEmail}`);
};

export const seedSampleSarees = async () => {
  const db = getDb();
  const existing = await db.get("SELECT COUNT(*) as count FROM sarees");

  if (existing.count > 0) {
    return;
  }

  for (const saree of sampleSarees) {
    await db.run(
      `INSERT INTO sarees
        (sku, name, description, category, fabric, color, occasion, price, sale_price, stock, available, inventory_status, sold_at, featured, tags, images, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', CURRENT_TIMESTAMP)`,
      [
        saree.sku,
        saree.name,
        saree.description,
        saree.category,
        saree.fabric,
        saree.color,
        saree.occasion,
        saree.price,
        saree.salePrice,
        saree.stock,
        saree.available,
        saree.inventoryStatus,
        saree.soldAt || null,
        saree.featured,
        JSON.stringify(saree.tags),
      ]
    );
  }

  console.log("Seeded sample sarees");
};

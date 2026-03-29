import fs from "fs";
import path from "path";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

let db;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS sarees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL,
    fabric TEXT DEFAULT '',
    color TEXT DEFAULT '',
    occasion TEXT DEFAULT '',
    price REAL NOT NULL,
    sale_price REAL,
    stock INTEGER NOT NULL DEFAULT 1,
    available INTEGER NOT NULL DEFAULT 1,
    inventory_status TEXT NOT NULL DEFAULT 'in_stock',
    sold_at TEXT,
    featured INTEGER NOT NULL DEFAULT 0,
    tags TEXT NOT NULL DEFAULT '[]',
    images TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS counters (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    total_amount REAL NOT NULL DEFAULT 0,
    items TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

const ensureParentDirectory = (filepath) => {
  const absolutePath = path.resolve(filepath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  return absolutePath;
};

const ensureColumn = async (table, column, definition) => {
  const columns = await db.all(`PRAGMA table_info(${table})`);
  const exists = columns.some((entry) => entry.name === column);

  if (!exists) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

export const connectDB = async () => {
  const sqlitePath = process.env.SQLITE_PATH || "./data/mana-vastra.sqlite";
  const filename = ensureParentDirectory(sqlitePath);

  db = await open({
    filename,
    driver: sqlite3.Database,
  });

  await db.exec("PRAGMA foreign_keys = ON");
  for (const statement of schemaStatements) {
    await db.exec(statement);
  }
  await ensureColumn("sarees", "inventory_status", "TEXT NOT NULL DEFAULT 'in_stock'");
  await ensureColumn("sarees", "sold_at", "TEXT");

  console.log(`SQLite connected at ${filename}`);
  return db;
};

export const getDb = () => {
  if (!db) {
    throw new Error("Database not initialized");
  }

  return db;
};

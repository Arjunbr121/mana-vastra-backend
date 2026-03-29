import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDb } from "../config/db.js";
import { protect, requireAdmin } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user.id ?? user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

router.post("/login", asyncHandler(async (req, res) => {
  const db = getDb();
  const { email, password } = req.body;

  const user = await db.get(
    `SELECT id, name, email, password, role, is_active as isActive
     FROM users
     WHERE email = ?`,
    [String(email).toLowerCase()]
  );
  if (!user || !(await bcrypt.compare(password, user.password)) || !user.isActive) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken(user);

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}));

router.get("/me", protect, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

router.get("/users", protect, requireAdmin, asyncHandler(async (_req, res) => {
  const db = getDb();
  const users = await db.all(
    `SELECT id, name, email, role, is_active as isActive, created_at as createdAt
     FROM users
     ORDER BY datetime(created_at) DESC`
  );
  res.json(users);
}));

router.post("/users", protect, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDb();
  const { name, email, password, role = "viewer" } = req.body;

  const normalizedEmail = String(email).toLowerCase();
  const existing = await db.get("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
  if (existing) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await db.run(
    `INSERT INTO users (name, email, password, role, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [name, normalizedEmail, hashedPassword, role]
  );
  const user = await db.get(
    `SELECT id, name, email, role, created_at as createdAt
     FROM users
     WHERE id = ?`,
    [result.lastID]
  );
  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
}));

export default router;

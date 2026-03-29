import jwt from "jsonwebtoken";
import { getDb } from "../config/db.js";

const getTokenFromHeader = (header = "") => {
  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.split(" ")[1];
};

export const protect = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDb();
    const user = await db.get(
      `SELECT id, name, email, role, is_active as isActive, created_at as createdAt, updated_at as updatedAt
       FROM users
       WHERE id = ?`,
      [decoded.id]
    );

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};

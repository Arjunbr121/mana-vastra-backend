import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import authRoutes from "./routes/auth.js";
import inventoryRoutes from "./routes/inventory.js";
import orderRoutes from "./routes/orders.js";
import { seedAdmin, seedSampleSarees } from "./utils/seed.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "mana-vastra-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  const status =
    error.statusCode ||
    (error.code === "SQLITE_CONSTRAINT" ? 400 : 500);
  res.status(status).json({
    message:
      error.code === "SQLITE_CONSTRAINT"
        ? "A record with the same unique value already exists."
        : error.message || "Internal server error",
  });
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection", error);
});

const startServer = async () => {
  try {
    await connectDB();
    await seedAdmin();
    await seedSampleSarees();
    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start backend", error);
    process.exit(1);
  }
};

startServer();

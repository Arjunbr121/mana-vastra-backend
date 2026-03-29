import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../../../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
  limits: { files: 5, fileSize: 5 * 1024 * 1024 },
});

export const uploadImages = (files = []) => {
  return files.map((file) => ({
    url: `/uploads/${file.filename}`,
  }));
};

export const deleteLocalImages = (images = []) => {
  for (const image of images) {
    if (!image?.url) continue;
    const filePath = path.join(uploadsDir, path.basename(image.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

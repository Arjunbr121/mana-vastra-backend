import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Readable } from "stream";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../../../uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Always use memory storage — we decide where to save after
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 5 * 1024 * 1024 },
});

const uploadToCloudinary = (buffer, filename) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "mana-vastra", public_id: path.parse(filename).name, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    Readable.from(buffer).pipe(stream);
  });

export const uploadImages = async (files = []) => {
  if (isCloudinaryConfigured) {
    const results = await Promise.all(
      files.map((f) => uploadToCloudinary(f.buffer, f.originalname))
    );
    return results.map((r) => ({ url: r.secure_url, publicId: r.public_id }));
  }

  // Fallback: save to local disk
  return files.map((file) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${unique}${path.extname(file.originalname)}`;
    fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
    return { url: `/uploads/${filename}` };
  });
};

export const deleteLocalImages = async (images = []) => {
  for (const image of images) {
    if (!image?.url) continue;

    if (isCloudinaryConfigured && image.publicId) {
      await cloudinary.uploader.destroy(image.publicId).catch(() => {});
    } else if (!image.url.startsWith("http")) {
      const filePath = path.join(uploadsDir, path.basename(image.url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }
};

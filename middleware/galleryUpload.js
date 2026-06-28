const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "wholesome/gallery",
    allowed_formats: ["jpeg", "png", "jpg", "webp"],
    // Incoming transformation: Cloudinary downsizes on ingest so the stored
    // asset stays small (caps storage cost + speeds the next/image optimizer
    // fetch). `crop: "limit"` only shrinks oversized photos, never upscales.
    transformation: [
      { width: 2400, height: 2400, crop: "limit", quality: "auto:good" },
    ],
  },
});

const galleryUpload = multer({
  storage,
  limits: {
    // Accept full-size phone/camera photos; Cloudinary compresses them above.
    fileSize: 20 * 1024 * 1024,
  },
});

module.exports = galleryUpload; 
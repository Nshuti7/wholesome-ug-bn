const multer = require("multer");
const createStorage = require("./cloudinaryStorage");

// Compress-then-upload to Cloudinary (see cloudinaryStorage.js). sharp downsizes
// each file before it leaves the server, so the original never has to fit
// Cloudinary's per-image upload ceiling.
const storage = createStorage({ folder: "wholesome" });

const ALLOWED = /^image\/(jpe?g|png|webp)$/;

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (ALLOWED.test(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPG, PNG, or WebP images are allowed."));
  },
  limits: {
    // Accept full-size phone/camera photos; sharp compresses them above before
    // anything reaches Cloudinary.
    fileSize: 20 * 1024 * 1024,
  },
});

module.exports = upload;

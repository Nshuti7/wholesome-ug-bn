// middleware/cloudinaryStorage.js
//
// Custom multer storage engine: compress each upload with sharp BEFORE it is
// streamed to Cloudinary. This matters because Cloudinary enforces its
// per-image upload ceiling on the *original* bytes it receives — an "incoming
// transformation" runs only after that check, so it cannot rescue an oversized
// original. Downsizing here (<=2400px, re-encoded) keeps what we send well
// under the limit, lets admins upload full-size phone/camera photos, and keeps
// the stored asset small.
//
// The engine returns the same { path, filename } shape that
// multer-storage-cloudinary did (path = secure_url, filename = public_id), so
// every route that reads `file.path` / `file.filename` keeps working unchanged
// for upload.single / upload.fields / upload.array.

const cloudinary = require("cloudinary").v2;
const sharp = require("sharp");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cap the long edge; never upscale. Re-encode preserving transparency for
// PNG/WebP, otherwise mozjpeg for the best size on photographs.
function buildTransformer(mimetype) {
  const t = sharp()
    .rotate() // honour EXIF orientation (phones), then drop the tag
    .resize(2400, 2400, { fit: "inside", withoutEnlargement: true });

  if (mimetype === "image/png") return t.png({ compressionLevel: 9 });
  if (mimetype === "image/webp") return t.webp({ quality: 82 });
  return t.jpeg({ quality: 82, mozjpeg: true });
}

class CloudinaryCompressStorage {
  constructor({ folder }) {
    this.folder = folder;
  }

  _handleFile(req, file, cb) {
    const transformer = buildTransformer(file.mimetype);

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: this.folder, resource_type: "image" },
      (err, result) => {
        if (err) return cb(err);
        cb(null, {
          path: result.secure_url,
          filename: result.public_id,
          size: result.bytes,
        });
      },
    );

    file.stream
      .pipe(transformer)
      .on("error", cb)
      .pipe(uploadStream)
      .on("error", cb);
  }

  _removeFile(req, file, cb) {
    // Called by multer to roll back already-uploaded files when another file in
    // the same request fails.
    if (!file.filename) return cb(null);
    cloudinary.uploader
      .destroy(file.filename)
      .then(() => cb(null))
      .catch(cb);
  }
}

module.exports = (opts) => new CloudinaryCompressStorage(opts);

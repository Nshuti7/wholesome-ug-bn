const multer = require("multer");
const galleryUpload = require("./galleryUpload");

const handleGalleryUploadArray = (fieldName, maxCount) => {
  return (req, res, next) => {
    galleryUpload.array(fieldName, maxCount)(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({
              error: "One or more files are too large. Max 5MB per file.",
            });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(500).json({ error: "Upload failed." });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded." });
      }

      next();
    });
  };
};

module.exports = handleGalleryUploadArray; 
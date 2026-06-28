const multer = require("multer");
const upload = require("./upload");

const handleUpload = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ error: "File too large. Max 20MB allowed." });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res
          .status(500)
          .json({ error: "Something went wrong during upload." });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      next();
    });
  };
};

module.exports = handleUpload;

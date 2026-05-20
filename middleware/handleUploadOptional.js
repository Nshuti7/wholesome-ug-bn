const multer = require("multer");
const upload = require("./upload");

const handleUploadOptional = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ error: "File too large. Max 5MB allowed." });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res
          .status(500)
          .json({ error: "Something went wrong during upload." });
      }

      // File is optional, so we don't check if req.file exists
      next();
    });
  };
};

const handleUploadArrayOptional = (fieldName, maxCount) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, function (err) {
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

      // Files are optional, so we don't check if req.files exists
      next();
    });
  };
};

module.exports = { handleUploadOptional, handleUploadArrayOptional }; 
// routes/experiences.js
const express = require("express");
const { v2: cloudinary } = require("cloudinary");
const upload = require("../middleware/upload");
const Experience = require("../models/Experience");
const { protect, admin } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const list = await Experience.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    console.error("GET /experiences error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch experiences." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Experience.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error("GET /experiences/:id error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch experience." });
  }
});

router.post(
  "/",
  protect,
  admin,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      if (!req.files || !req.files.coverImage) {
        return res.status(400).json({ success: false, message: "Cover image is required." });
      }

      const coverFile = req.files.coverImage[0];
      const addFiles = req.files.additionalImages || [];
      const { title, description, category, duration, parks = [], highlights = [], featured = false } = req.body;

      const doc = await Experience.create({
        title,
        description,
        category,
        duration,
        parks: Array.isArray(parks) ? parks : [parks].filter(Boolean),
        highlights: Array.isArray(highlights) ? highlights : [highlights].filter(Boolean),
        featured: featured === "true" || featured === true,
        coverImage: { url: coverFile.path, cloudinaryId: coverFile.filename },
        additionalImages: addFiles.map((f) => ({ url: f.path, cloudinaryId: f.filename })),
      });

      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      console.error("POST /experiences error:", err);
      if (err.name === "ValidationError") {
        const msgs = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ success: false, message: msgs.join(", ") });
      }
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.put(
  "/:id",
  protect,
  admin,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const doc = await Experience.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: "Not found." });

      if (req.files && req.files.coverImage) {
        await cloudinary.uploader.destroy(doc.coverImage.cloudinaryId);
        const f = req.files.coverImage[0];
        doc.coverImage = { url: f.path, cloudinaryId: f.filename };
      }

      if (req.files && req.files.additionalImages && req.files.additionalImages.length) {
        await Promise.all(doc.additionalImages.map((i) => cloudinary.uploader.destroy(i.cloudinaryId)));
        doc.additionalImages = req.files.additionalImages.map((f) => ({ url: f.path, cloudinaryId: f.filename }));
      }

      ["title", "description", "category", "duration"].forEach((f) => {
        if (req.body[f] !== undefined) doc[f] = req.body[f];
      });

      ["parks", "highlights"].forEach((f) => {
        if (req.body[f] !== undefined) {
          doc[f] = Array.isArray(req.body[f]) ? req.body[f] : [req.body[f]].filter(Boolean);
        }
      });

      if (req.body.featured !== undefined) {
        doc.featured = req.body.featured === "true" || req.body.featured === true;
      }

      await doc.save();
      res.json({ success: true, data: doc });
    } catch (err) {
      console.error("PUT /experiences/:id error:", err);
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const doc = await Experience.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found." });

    await cloudinary.uploader.destroy(doc.coverImage.cloudinaryId);
    await Promise.all(doc.additionalImages.map((i) => cloudinary.uploader.destroy(i.cloudinaryId)));
    await doc.deleteOne();

    res.json({ success: true, message: "Experience deleted." });
  } catch (err) {
    console.error("DELETE /experiences/:id error:", err);
    res.status(500).json({ success: false, message: "Failed to delete experience." });
  }
});

module.exports = router;

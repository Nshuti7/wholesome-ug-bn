// routes/testimonials.js
const express = require("express");
const Testimonial = require("../models/Testimonial");
const { protect, admin } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const list = await Testimonial.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    console.error("GET /testimonials error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch testimonials." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Testimonial.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch testimonial." });
  }
});

router.post("/", protect, admin, async (req, res) => {
  try {
    const { name, location, trip, quote, headline, rating, featured } = req.body;
    const doc = await Testimonial.create({
      name,
      location,
      trip,
      quote,
      headline,
      rating: rating ? Number(rating) : 5,
      featured: featured === true || featured === "true",
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error("POST /testimonials error:", err);
    if (err.name === "ValidationError") {
      const msgs = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(", ") });
    }
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put("/:id", protect, admin, async (req, res) => {
  try {
    const doc = await Testimonial.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found." });

    ["name", "location", "trip", "quote", "headline"].forEach((f) => {
      if (req.body[f] !== undefined) doc[f] = req.body[f];
    });

    if (req.body.rating !== undefined) doc.rating = Number(req.body.rating);
    if (req.body.featured !== undefined) doc.featured = req.body.featured === true || req.body.featured === "true";

    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error("PUT /testimonials/:id error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const doc = await Testimonial.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found." });
    await doc.deleteOne();
    res.json({ success: true, message: "Testimonial deleted." });
  } catch (err) {
    console.error("DELETE /testimonials/:id error:", err);
    res.status(500).json({ success: false, message: "Failed to delete testimonial." });
  }
});

module.exports = router;

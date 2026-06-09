// routes/showcase.js
//
// CRUD for the shared "Showcase" gallery powering the two creative arms:
//   /api/showcase?kind=art    → /art pieces
//   /api/showcase?kind=story  → /storytelling selected work
//
// Single image per item, uploaded straight to Cloudinary by the `upload`
// middleware (CloudinaryStorage): req.file.path is the URL, req.file.filename
// is the public_id. Mirrors the gallery route's extraction and the
// destinations route's protect/admin + {success,data} envelope.

const express = require("express");
const { v2: cloudinary } = require("cloudinary");
const Showcase = require("../models/Showcase");
const { protect, admin } = require("../middleware/auth");
const handleUpload = require("../middleware/handleUpload");
const { handleUploadOptional } = require("../middleware/handleUploadOptional");

const router = express.Router();

const KINDS = ["art", "story"];

/**
 * @swagger
 * tags:
 *   name: Showcase
 *   description: Managed gallery for the Art and Storytelling arms
 *
 * components:
 *   schemas:
 *     ShowcaseItem:
 *       type: object
 *       properties:
 *         _id:      { type: string }
 *         kind:     { type: string, enum: [art, story] }
 *         title:    { type: string }
 *         medium:   { type: string }
 *         tall:     { type: boolean }
 *         featured: { type: boolean }
 *         order:    { type: number }
 *         image:
 *           type: object
 *           properties:
 *             url:          { type: string }
 *             cloudinaryId: { type: string }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

const toBool = (v) => v === true || v === "true";

/**
 * @swagger
 * /showcase:
 *   get:
 *     summary: List showcase items, optionally filtered by kind
 *     tags: [Showcase]
 *     parameters:
 *       - in: query
 *         name: kind
 *         schema: { type: string, enum: [art, story] }
 *         description: Filter to one arm
 *     responses:
 *       200:
 *         description: Array of showcase items
 */
router.get("/", async (req, res) => {
  try {
    const { kind } = req.query;
    const filter = KINDS.includes(kind) ? { kind } : {};
    const data = await Showcase.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("GET /showcase error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch showcase items." });
  }
});

/**
 * @swagger
 * /showcase/{id}:
 *   get:
 *     summary: Get a single showcase item
 *     tags: [Showcase]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The showcase item }
 *       404: { description: Not found }
 */
router.get("/:id", async (req, res) => {
  try {
    const item = await Showcase.findById(req.params.id).lean();
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Showcase item not found." });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error("GET /showcase/:id error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch showcase item." });
  }
});

/**
 * @swagger
 * /showcase:
 *   post:
 *     summary: Create a showcase item
 *     tags: [Showcase]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [kind, title, image]
 *             properties:
 *               kind:     { type: string, enum: [art, story] }
 *               title:    { type: string }
 *               medium:   { type: string }
 *               tall:     { type: boolean }
 *               featured: { type: boolean }
 *               order:    { type: number }
 *               image:    { type: string, format: binary }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Bad request }
 */
router.post("/", protect, admin, handleUpload("image"), async (req, res) => {
  try {
    const { kind, title, medium = "", tall, featured, order } = req.body;

    if (!KINDS.includes(kind)) {
      return res.status(400).json({
        success: false,
        message: `kind must be one of: ${KINDS.join(", ")}`,
      });
    }
    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required." });
    }

    const item = await Showcase.create({
      kind,
      title,
      medium,
      tall: toBool(tall),
      featured: toBool(featured),
      order: order != null ? Number(order) : 0,
      image: { url: req.file.path, cloudinaryId: req.file.filename },
    });

    res
      .status(201)
      .json({ success: true, message: "Showcase item added.", data: item });
  } catch (err) {
    console.error("POST /showcase error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to add showcase item." });
  }
});

/**
 * @swagger
 * /showcase/{id}:
 *   put:
 *     summary: Update a showcase item (image optional)
 *     tags: [Showcase]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               kind:     { type: string, enum: [art, story] }
 *               title:    { type: string }
 *               medium:   { type: string }
 *               tall:     { type: boolean }
 *               featured: { type: boolean }
 *               order:    { type: number }
 *               image:    { type: string, format: binary }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.put(
  "/:id",
  protect,
  admin,
  handleUploadOptional("image"),
  async (req, res) => {
    try {
      const item = await Showcase.findById(req.params.id);
      if (!item) {
        return res
          .status(404)
          .json({ success: false, message: "Showcase item not found." });
      }

      const { kind, title, medium, tall, featured, order } = req.body;

      if (kind !== undefined) {
        if (!KINDS.includes(kind)) {
          return res.status(400).json({
            success: false,
            message: `kind must be one of: ${KINDS.join(", ")}`,
          });
        }
        item.kind = kind;
      }
      if (title !== undefined) item.title = title;
      if (medium !== undefined) item.medium = medium;
      if (tall !== undefined) item.tall = toBool(tall);
      if (featured !== undefined) item.featured = toBool(featured);
      if (order !== undefined) item.order = Number(order);

      // Replace the image if a new one was uploaded; clean up the old asset.
      if (req.file) {
        if (item.image?.cloudinaryId) {
          await cloudinary.uploader.destroy(item.image.cloudinaryId);
        }
        item.image = { url: req.file.path, cloudinaryId: req.file.filename };
      }

      await item.save();
      res
        .status(200)
        .json({ success: true, message: "Showcase item updated.", data: item });
    } catch (err) {
      console.error("PUT /showcase/:id error:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to update showcase item." });
    }
  }
);

/**
 * @swagger
 * /showcase/{id}:
 *   delete:
 *     summary: Delete a showcase item and its image
 *     tags: [Showcase]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const item = await Showcase.findById(req.params.id);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Showcase item not found." });
    }

    if (item.image?.cloudinaryId) {
      await cloudinary.uploader.destroy(item.image.cloudinaryId);
    }
    await item.deleteOne();

    res.status(200).json({ success: true, message: "Showcase item deleted." });
  } catch (err) {
    console.error("DELETE /showcase/:id error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete showcase item." });
  }
});

module.exports = router;

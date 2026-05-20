/**
 * @swagger
 * tags:
 *   name: Gallery
 *   description: Manage gallery images
 */

const express = require("express");
const { v2: cloudinary } = require("cloudinary");
const Gallery = require("../models/Gallery");
const { protect, admin } = require("../middleware/auth");
const handleGalleryUploadArray = require("../middleware/handleGalleryUploadArray");

const router = express.Router();

/**
 * @swagger
 * /gallery:
 *   get:
 *     summary: Get all gallery items
 *     tags: [Gallery]
 *     responses:
 *       200:
 *         description: List of gallery items
 */
router.get("/", async (req, res) => {
  try {
    const galleryItems = await Gallery.find().sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: galleryItems.length, data: galleryItems });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch gallery items." });
  }
});

/**
 * @swagger
 * /gallery:
 *   post:
 *     summary: Upload multiple gallery items
 *     tags: [Gallery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 description: Optional description to apply to all uploaded images
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Array of image files
 *     responses:
 *       201:
 *         description: Images uploaded successfully
 *       400:
 *         description: Bad request (e.g. no files or file too large)
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  protect,
  admin,
  handleGalleryUploadArray("images", 10),
  async (req, res) => {
    try {
      const files = req.files;
      const description = req.body.description || "";

      const uploadedItems = await Promise.all(
        files.map(async (file) => {
          // Since we're using CloudinaryStorage, the file is already uploaded to Cloudinary
          // and contains the URL and public_id in the file object
          const item = new Gallery({
            filename: file.originalname,
            description,
            image: file.path, // This is the Cloudinary URL
            cloudinaryId: file.filename, // This is the Cloudinary public_id
          });

          return item.save();
        })
      );

      res.status(201).json({
        success: true,
        message: "Images uploaded successfully.",
        data: uploadedItems,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to upload gallery items." });
    }
  }
);

/**
 * @swagger
 * /gallery/{id}:
 *   delete:
 *     summary: Delete a gallery item
 *     tags: [Gallery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Gallery item ID
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    await cloudinary.uploader.destroy(item.cloudinaryId);
    await item.deleteOne();

    res
      .status(200)
      .json({ success: true, message: "Gallery item deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete gallery item." });
  }
});

module.exports = router;

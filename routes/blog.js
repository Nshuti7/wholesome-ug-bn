const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const { protect, admin } = require("../middleware/auth");
const upload = require("../middleware/upload");
const blogController = require("../controllers/blogController");

/**
 * @swagger
 * tags:
 *   name: Blog
 *   description: Manage blog posts
 */

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * @swagger
 * /blogs:
 *   get:
 *     summary: Get all blog posts
 *     tags: [Blog]
 *     responses:
 *       200:
 *         description: List of blogs
 */
router.get("/", blogController.getAllBlogs);

/**
 * @swagger
 * /blogs/{id}:
 *   get:
 *     summary: Get a blog post by ID
 *     tags: [Blog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Blog details
 *       404:
 *         description: Not found
 */
router.get("/:id", blogController.getBlogById);

/**
 * @swagger
 * /blogs:
 *   post:
 *     summary: Create a new blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               date: { type: string, format: date, description: Blog date (YYYY-MM-DD)  }
 *               category: { type: string }
 *               excerpt: { type: string }
 *               readTime: { type: string }
 *               content: { type: string }
 *               image: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Blog created
 */
router.post(
  "/",
  protect,
  admin,
  upload.single("image"),
  blogController.createBlog
);

/**
 * @swagger
 * /blogs/{id}:
 *   put:
 *     summary: Update a blog post
 *     tags: [Blog]
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
 *               title: { type: string }
 *               date: { type: string }
 *               category: { type: string }
 *               excerpt: { type: string }
 *               readTime: { type: string }
 *               content: { type: string }
 *               image: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Blog updated
 *       404:
 *         description: Not found
 */
router.put(
  "/:id",
  protect,
  admin,
  upload.single("image"),
  blogController.updateBlog
);

/**
 * @swagger
 * /blogs/{id}:
 *   delete:
 *     summary: Delete a blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Blog deleted
 *       404:
 *         description: Not found
 */
router.delete("/:id", protect, admin, blogController.deleteBlog);

/**
 * @swagger
 * /blogs/generate-content:
 *   post:
 *     summary: Generate blog post body content from metadata
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Metadata used to spin up a blog draft
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - excerpt
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Top 10 Waterfalls in Rwanda"
 *               category:
 *                 type: string
 *                 example: "Travel"
 *               excerpt:
 *                 type: string
 *                 example: "Discover the most breathtaking cascades that East Africa has to offer."
 *               readTime:
 *                 type: string
 *                 description: Estimated reading time in minutes
 *                 example: "4"
 *     responses:
 *       200:
 *         description: Successfully generated content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 content:
 *                   type: string
 *                   example: "Nestled within the lush jungles of eastern Rwanda, the Sipi Falls..."
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Missing required fields"
 *       500:
 *         description: Failed to generate content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to generate content"
 */
router.post(
  "/generate-content",
  protect,
  admin,
  blogController.generateContent
);

module.exports = router;

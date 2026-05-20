/**
 * @swagger
 * tags:
 *   name: Contact
 *   description: Contact form submissions and management
 */

const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/auth");
const Contact = require("../models/Contact");
const { formSubmissionLimiter } = require("../middleware/rateLimiter");

/**
 * @swagger
 * /contact:
 *   post:
 *     summary: Submit a contact message
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "John Doe" }
 *               email: { type: string, example: "john@example.com" }
 *               subject: { type: string, example: "Question about programs" }
 *               message: { type: string, example: "Tell me more about your initiatives." }
 *     responses:
 *       201:
 *         description: Message submitted
 *       400:
 *         description: Invalid input
 *       429:
 *         description: Too many requests
 */
router.post("/", formSubmissionLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const contact = await Contact.create({ name, email, subject, message });
    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /contact:
 *   get:
 *     summary: Get all contact messages
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Messages per page
 *     responses:
 *       200:
 *         description: List of contact messages
 */
router.get("/", protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const contacts = await Contact.find()
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);
    const total = await Contact.countDocuments();

    res.json({ success: true, count: contacts.length, total, data: contacts });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Something went wrong"
          : error.message,
    });
  }
});

/**
 * @swagger
 * /contact/{id}:
 *   get:
 *     summary: Get a single contact message
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contact message
 *       404:
 *         description: Not found
 */
router.get("/:id", protect, admin, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact)
      return res
        .status(404)
        .json({ success: false, message: "Contact message not found" });
    res.json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Something went wrong"
          : error.message,
    });
  }
});

/**
 * @swagger
 * /contact/{id}:
 *   put:
 *     summary: Update contact message status
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject: { type: string, example: "Updated subject" }
 *               message: { type: string, example: "Updated message body" }
 *               status: { type: string, example: "resolved" }
 *     responses:
 *       200:
 *         description: Updated message
 *       404:
 *         description: Not found
 */
router.put("/:id", protect, admin, async (req, res) => {
  try {
    const { subject, message, status } = req.body;
    const updates = { subject, message, status };

    const contact = await Contact.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!contact)
      return res
        .status(404)
        .json({ success: false, message: "Contact message not found" });

    res.json({ success: true, data: contact });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /contact/{id}:
 *   delete:
 *     summary: Delete a contact message
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contact deleted
 *       404:
 *         description: Not found
 */
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact)
      return res
        .status(404)
        .json({ success: false, message: "Contact message not found" });

    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Something went wrong"
          : error.message,
    });
  }
});

module.exports = router;

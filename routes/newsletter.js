/**
 * @swagger
 * tags:
 *   name: Newsletter
 *   description: Manage newsletter subscriptions
 */

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Newsletter = require("../models/Newsletter");
const { formSubmissionLimiter } = require("../middleware/rateLimiter");

const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000; // 24 hours

/**
 * @swagger
 * /newsletter/subscribe:
 *   post:
 *     summary: Subscribe to the newsletter
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Subscribed successfully
 *       429:
 *         description: Cooldown period not met
 *       400:
 *         description: Already subscribed or bad request
 */
router.post("/subscribe", formSubmissionLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    let subscriber = await Newsletter.findOne({ email });
    const now = new Date();

    if (subscriber) {
      if (now - subscriber.lastSubscriptionAttempt < COOLDOWN_PERIOD) {
        const timeLeft = Math.ceil(
          (COOLDOWN_PERIOD - (now - subscriber.lastSubscriptionAttempt)) / 60000
        );
        return res.status(429).json({
          message: `Please wait ${timeLeft} minutes before trying again.`,
        });
      }
      if (subscriber.subscribed) {
        return res.status(400).json({ message: "Email already subscribed" });
      } else {
        subscriber.subscribed = true;
      }
    } else {
      subscriber = new Newsletter({ email });
    }

    subscriber.lastSubscriptionAttempt = now;
    await subscriber.save();
    res.status(201).json({ message: "Subscribed successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /newsletter/unsubscribe:
 *   post:
 *     summary: Unsubscribe from the newsletter
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Unsubscribed successfully
 *       400:
 *         description: Email not found or already unsubscribed
 */
router.post("/unsubscribe", async (req, res) => {
  try {
    const { email } = req.body;
    const subscriber = await Newsletter.findOne({ email });

    if (!subscriber || !subscriber.subscribed) {
      return res
        .status(400)
        .json({ message: "Email not found or already unsubscribed" });
    }

    subscriber.subscribed = false;
    await subscriber.save();
    res.json({ message: "Unsubscribed successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /newsletter:
 *   get:
 *     summary: Get all subscribers
 *     tags: [Newsletter]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of subscribed emails
 *       500:
 *         description: Server error
 */
router.get("/", protect, async (req, res) => {
  try {
    const subscribers = await Newsletter.find({ subscribed: true });
    res.json(subscribers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /newsletter/{id}:
 *   delete:
 *     summary: Delete a subscriber
 *     tags: [Newsletter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Subscriber deleted successfully
 *       400:
 *         description: Bad request
 */
router.delete("/:id", protect, async (req, res) => {
  try {
    await Newsletter.findByIdAndDelete(req.params.id);
    res.json({ message: "Subscriber deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

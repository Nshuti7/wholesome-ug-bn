const express = require("express");
const {
  createReview,
  getAllReviews,
  getReviewsBySubject,
  getReview,
  updateReviewStatus,
  deleteReview,
  markHelpful,
  reportReview,
  getReviewStats
} = require("../controllers/reviewController");
const { protect, admin } = require("../middleware/auth");
const Review = require("../models/Review");
const Itinerary = require("../models/Itinerary");
const Company = require("../models/Company");
const { formSubmissionLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Review management for company and itinerary reviews
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - rating
 *         - comment
 *         - reviewType
 *         - subjectId
 *       properties:
 *         name:
 *           type: string
 *           description: Reviewer's name
 *         email:
 *           type: string
 *           format: email
 *           description: Reviewer's email
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Rating from 1 to 5
 *         title:
 *           type: string
 *           description: Review title
 *         comment:
 *           type: string
 *           description: Review comment
 *         reviewType:
 *           type: string
 *           enum: [company, itinerary]
 *           description: Type of review
 *         subjectId:
 *           type: string
 *           description: ID of the subject being reviewed (itinerary ID or company identifier)
 */

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Submit a new review
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - rating
 *               - title
 *               - comment
 *               - reviewType
 *             properties:
 *               name: { type: string, example: "John Doe" }
 *               email: { type: string, example: "john@example.com" }
 *               rating: { type: number, minimum: 1, maximum: 5, example: 5 }
 *               title: { type: string, example: "Amazing experience!" }
 *               comment: { type: string, example: "Great service and wonderful destinations." }
 *               reviewType: { type: string, enum: ["company", "itinerary"], example: "company" }
 *               subjectId: { type: string, example: "507f1f77bcf86cd799439011" }
 *     responses:
 *       201:
 *         description: Review submitted successfully
 *       400:
 *         description: Invalid input or duplicate review
 *       404:
 *         description: Subject not found (for itinerary reviews)
 */
router.post("/", formSubmissionLimiter, createReview);

/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: Get all reviews (admin only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of reviews per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by review status
 *       - in: query
 *         name: reviewType
 *         schema:
 *           type: string
 *           enum: [company, itinerary]
 *         description: Filter by review type
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: "-createdAt"
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access only
 */
router.get("/", protect, admin, getAllReviews);

/**
 * @swagger
 * /reviews/stats:
 *   get:
 *     summary: Get review statistics (admin only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reviewType
 *         schema:
 *           type: string
 *           enum: [company, itinerary]
 *         description: Filter statistics by review type
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access only
 */
router.get("/stats", protect, admin, getReviewStats);

/**
 * @swagger
 * /reviews/{reviewType}/{subjectId}:
 *   get:
 *     summary: Get reviews by subject (public)
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: reviewType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [company, itinerary]
 *         description: Type of review
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the subject
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of reviews per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: "-createdAt"
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *       400:
 *         description: Invalid review type
 */
router.get("/:reviewType/:subjectId", getReviewsBySubject);

/**
 * @swagger
 * /reviews/{id}:
 *   get:
 *     summary: Get a single review
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review retrieved successfully
 *       404:
 *         description: Review not found
 */
router.get("/:id", getReview);

/**
 * @swagger
 * /reviews/{id}/status:
 *   put:
 *     summary: Update review status (admin only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *                 description: New status for the review
 *     responses:
 *       200:
 *         description: Review status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access only
 *       404:
 *         description: Review not found
 */
router.put("/:id/status", protect, admin, updateReviewStatus);

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     summary: Delete a review (admin only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access only
 *       404:
 *         description: Review not found
 */
router.delete("/:id", protect, admin, deleteReview);

/**
 * @swagger
 * /reviews/{id}/helpful:
 *   post:
 *     summary: Mark review as helpful
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review marked as helpful
 *       404:
 *         description: Review not found
 */
router.post("/:id/helpful", markHelpful);

/**
 * @swagger
 * /reviews/{id}/report:
 *   post:
 *     summary: Report a review
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review reported successfully
 *       404:
 *         description: Review not found
 */
router.post("/:id/report", reportReview);

module.exports = router; 
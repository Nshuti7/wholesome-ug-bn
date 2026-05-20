/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Application dashboard overview and analytics
 */

const express = require("express");
const { 
  getDashboardData, 
  getMonthlyStats, 
  getReviewAnalytics, 
  getContentAnalytics 
} = require("../controllers/dashboardController");
const { protect, admin } = require("../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get comprehensive dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalSubscribers:
 *                       type: number
 *                     totalBlogs:
 *                       type: number
 *                     totalGalleryItems:
 *                       type: number
 *                     totalDestinations:
 *                       type: number
 *                     totalItineraries:
 *                       type: number
 *                     totalTeamMembers:
 *                       type: number
 *                     totalContacts:
 *                       type: number
 *                     totalUsers:
 *                       type: number
 *                 reviews:
 *                   type: object
 *                   properties:
 *                     company:
 *                       type: object
 *                     itineraries:
 *                       type: object
 *                     overall:
 *                       type: object
 *                 recentActivities:
 *                   type: object
 *                   properties:
 *                     contacts:
 *                       type: array
 *                     blogs:
 *                       type: array
 *                     destinations:
 *                       type: array
 *                     itineraries:
 *                       type: array
 *                     reviews:
 *                       type: array
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     contactStatus:
 *                       type: object
 *                     destinationRegions:
 *                       type: object
 *                     teamCategories:
 *                       type: object
 *                     monthlyStats:
 *                       type: object
 *                 quickStats:
 *                   type: object
 *                   properties:
 *                     pendingReviews:
 *                       type: number
 *                     newContacts:
 *                       type: number
 *                     totalImages:
 *                       type: number
 *                     averageRating:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access only
 */
router.get("/", protect, admin, getDashboardData);

/**
 * @swagger
 * /dashboard/monthly-stats:
 *   get:
 *     summary: Get monthly statistics for charts
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly statistics returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contacts:
 *                   type: array
 *                 blogs:
 *                   type: array
 *                 destinations:
 *                   type: array
 *                 itineraries:
 *                   type: array
 *                 reviews:
 *                   type: array
 *                 subscribers:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access only
 */
router.get("/monthly-stats", protect, admin, getMonthlyStats);

/**
 * @swagger
 * /dashboard/review-analytics:
 *   get:
 *     summary: Get detailed review analytics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Review analytics returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                 trends:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access only
 */
router.get("/review-analytics", protect, admin, getReviewAnalytics);

/**
 * @swagger
 * /dashboard/content-analytics:
 *   get:
 *     summary: Get content analytics for blogs, destinations, itineraries, and gallery
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Content analytics returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blogs:
 *                   type: array
 *                 destinations:
 *                   type: array
 *                 itineraries:
 *                   type: object
 *                   properties:
 *                     totalDays:
 *                       type: number
 *                     totalNights:
 *                       type: number
 *                     avgDays:
 *                       type: number
 *                     avgNights:
 *                       type: number
 *                 gallery:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access only
 */
router.get("/content-analytics", protect, admin, getContentAnalytics);

module.exports = router;

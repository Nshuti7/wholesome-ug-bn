/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Tour booking management
 */

const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/auth");
const Booking = require("../models/Booking");
const Itinerary = require("../models/Itinerary");
const Experience = require("../models/Experience");
const Destination = require("../models/Destination");
const { formSubmissionLimiter } = require("../middleware/rateLimiter");

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Submit a new booking request
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - phoneCountryCode
 *               - country
 *               - travelDate
 *               - numberOfPeople
 *             properties:
 *               name: { type: string, example: "John Doe" }
 *               email: { type: string, example: "john@example.com" }
 *               phone: { type: string, example: "123456789" }
 *               phoneCountryCode: { type: string, example: "+256" }
 *               country: { type: string, example: "UG" }
 *               preferredTour: { type: string, example: "507f1f77bcf86cd799439011" }
 *               travelDate: { type: string, format: date, example: "2024-12-25" }
 *               numberOfPeople: { type: number, example: 2 }
 *               specialRequests: { type: string, example: "Vegetarian meals preferred" }
 *     responses:
 *       201:
 *         description: Booking submitted successfully
 *       400:
 *         description: Invalid input
 */
router.post("/", formSubmissionLimiter, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      phoneCountryCode,
      country,
      preferredTour,
      preferredExperience,
      preferredDestination,
      travelDate,
      numberOfPeople,
      specialRequests
    } = req.body;

    if (preferredTour) {
      const tour = await Itinerary.findById(preferredTour);
      if (!tour) return res.status(400).json({ success: false, message: "Preferred tour not found" });
    }
    if (preferredExperience) {
      const exp = await Experience.findById(preferredExperience);
      if (!exp) return res.status(400).json({ success: false, message: "Preferred experience not found" });
    }
    if (preferredDestination) {
      const dest = await Destination.findById(preferredDestination);
      if (!dest) return res.status(400).json({ success: false, message: "Preferred destination not found" });
    }

    const booking = await Booking.create({
      name,
      email,
      phone,
      phoneCountryCode,
      country,
      preferredTour,
      preferredExperience,
      preferredDestination,
      travelDate,
      numberOfPeople,
      specialRequests
    });

    if (preferredTour) await booking.populate('preferredTour', 'title daysCount nightsCount');
    if (preferredExperience) await booking.populate('preferredExperience', 'title category');
    if (preferredDestination) await booking.populate('preferredDestination', 'name region');

    res.status(201).json({
      success: true,
      message: "Booking request submitted successfully. We'll contact you within 24 hours.",
      data: booking
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get all bookings (admin only)
 *     tags: [Bookings]
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
 *         description: Bookings per page
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: List of bookings
 */
router.get("/", protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    // Build query
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const bookings = await Booking.find(query)
      .populate('preferredTour', 'title daysCount nightsCount')
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      count: bookings.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === "production" 
        ? "Something went wrong" 
        : error.message
    });
  }
});

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get a single booking (admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Booking details
 *       404:
 *         description: Not found
 */
router.get("/:id", protect, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('preferredTour', 'title daysCount nightsCount description backgroundImage');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Mark as read
    if (!booking.isRead) {
      booking.isRead = true;
      await booking.save();
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === "production" 
        ? "Something went wrong" 
        : error.message
    });
  }
});

/**
 * @swagger
 * /bookings/{id}:
 *   put:
 *     summary: Update booking status and details (admin only)
 *     tags: [Bookings]
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
 *               status: { type: string, enum: ["pending", "confirmed", "in progress", "completed", "cancelled"] }
 *               totalPrice: { type: number }
 *               currency: { type: string }
 *               notes: { type: string }
 *               adminNotes: { type: string }
 *     responses:
 *       200:
 *         description: Updated booking
 *       404:
 *         description: Not found
 */
router.put("/:id", protect, admin, async (req, res) => {
  try {
    const {
      status,
      totalPrice,
      currency,
      notes,
      adminNotes
    } = req.body;

    const updates = {};
    if (status) updates.status = status;
    if (totalPrice !== undefined) updates.totalPrice = totalPrice;
    if (currency) updates.currency = currency;
    if (notes !== undefined) updates.notes = notes;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true
      }
    ).populate('preferredTour', 'title daysCount nightsCount');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    res.json({
      success: true,
      message: "Booking updated successfully",
      data: booking
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @swagger
 * /bookings/{id}:
 *   delete:
 *     summary: Delete a booking (admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Booking deleted
 *       404:
 *         description: Not found
 */
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    res.json({
      success: true,
      message: "Booking deleted successfully"
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === "production" 
        ? "Something went wrong" 
        : error.message
    });
  }
});

/**
 * @swagger
 * /bookings/stats/overview:
 *   get:
 *     summary: Get booking statistics (admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Booking statistics
 */
router.get("/stats/overview", protect, admin, async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: "pending" });
    const confirmedBookings = await Booking.countDocuments({ status: "confirmed" });
    const completedBookings = await Booking.countDocuments({ status: "completed" });
    
    // Recent bookings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBookings = await Booking.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Monthly bookings for the last 6 months
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      const count = await Booking.countDocuments({
        createdAt: { $gte: startDate, $lt: endDate }
      });
      
      monthlyStats.push({
        month: startDate.toLocaleString('default', { month: 'short' }),
        count
      });
    }

    res.json({
      success: true,
      data: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        recent: recentBookings,
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === "production" 
        ? "Something went wrong" 
        : error.message
    });
  }
});

module.exports = router; 
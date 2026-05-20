const Newsletter = require("../models/Newsletter");
const Contact = require("../models/Contact");
const Blog = require("../models/Blog");
const Gallery = require("../models/Gallery");
const Destination = require("../models/Destination");
const Itinerary = require("../models/Itinerary");
const TeamMember = require("../models/TeamMember");
const Review = require("../models/Review");
const User = require("../models/User");
const Booking = require("../models/Booking");
const { getReviewSummary } = require("../utils/reviewUtils");
const {
  getSummaryCards,
  getPerformanceMetrics,
  getContentDistribution,
  formatMonthlyStats,
  formatChartData
} = require("../utils/dashboardUtils");

// @desc    Get comprehensive dashboard data
// @route   GET /api/dashboard
// @access  Private
exports.getDashboardData = async (req, res) => {
  try {
    // Get all counts and statistics
    const [
      totalSubscribers,
      totalBlogs,
      totalGalleryItems,
      totalDestinations,
      totalItineraries,
      totalTeamMembers,
      totalContacts,
      totalUsers,
      totalBookings,
      reviewSummary,
      recentContacts,
      recentBlogs,
      recentDestinations,
      recentItineraries,
      recentReviews,
      recentBookings,
      contactStatusStats,
      destinationRegionStats,
      teamCategoryStats,
      bookingStatusStats,
      monthlyStats,
      summaryCards,
      performanceMetrics,
      contentDistribution
    ] = await Promise.all([
      // Basic counts
      Newsletter.countDocuments({ subscribed: true }),
      Blog.countDocuments(),
      Gallery.countDocuments(),
      Destination.countDocuments(),
      Itinerary.countDocuments(),
      TeamMember.countDocuments(),
      Contact.countDocuments(),
      User.countDocuments(),
      Booking.countDocuments(),
      
      // Review statistics
      getReviewSummary(),
      
      // Recent items
      Contact.find().sort({ createdAt: -1 }).limit(5).select('name email subject status createdAt'),
      Blog.find().sort({ createdAt: -1 }).limit(5).select('title createdAt'),
      Destination.find().sort({ createdAt: -1 }).limit(5).select('name region createdAt'),
      Itinerary.find().sort({ createdAt: -1 }).limit(5).select('title daysCount nightsCount createdAt'),
      Review.find().sort({ createdAt: -1 }).limit(5).select('name rating reviewType status createdAt'),
      Booking.find().sort({ createdAt: -1 }).limit(5).select('name email status travelDate numberOfPeople createdAt'),
      
      // Contact status statistics
      Contact.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Destination region statistics
      Destination.aggregate([
        {
          $group: {
            _id: "$region",
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Team member category statistics
      TeamMember.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Booking status statistics
      Booking.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Monthly statistics for the last 6 months
      getMonthlyStatistics(),
      
      // Summary cards data
      getSummaryCards(),
      
      // Performance metrics
      getPerformanceMetrics(),
      
      // Content distribution
      getContentDistribution()
    ]);

    // Process contact status stats
    const contactStatusData = {
      new: 0,
      "in progress": 0,
      resolved: 0
    };
    contactStatusStats.forEach(stat => {
      contactStatusData[stat._id] = stat.count;
    });

    // Process destination region stats
    const destinationRegionData = {};
    destinationRegionStats.forEach(stat => {
      destinationRegionData[stat._id] = stat.count;
    });

    // Process team category stats
    const teamCategoryData = {};
    teamCategoryStats.forEach(stat => {
      teamCategoryData[stat._id] = stat.count;
    });

    // Process booking status stats
    const bookingStatusData = {
      pending: 0,
      confirmed: 0,
      "in progress": 0,
      completed: 0,
      cancelled: 0
    };
    bookingStatusStats.forEach(stat => {
      bookingStatusData[stat._id] = stat.count;
    });

    // Format monthly stats for charts
    const formattedMonthlyStats = {
      contacts: formatMonthlyStats(monthlyStats.contacts),
      blogs: formatMonthlyStats(monthlyStats.blogs),
      destinations: formatMonthlyStats(monthlyStats.destinations),
      itineraries: formatMonthlyStats(monthlyStats.itineraries),
      reviews: formatMonthlyStats(monthlyStats.reviews),
      subscribers: formatMonthlyStats(monthlyStats.subscribers),
      gallery: formatMonthlyStats(monthlyStats.gallery),
      bookings: formatMonthlyStats(monthlyStats.bookings)
    };

    // Get engagement metrics
    const engagementMetrics = {
      totalInteractions: summaryCards.recentContacts + summaryCards.recentReviews + summaryCards.recentBlogs,
      avgRating: reviewSummary.company.averageRating,
      engagementRate: reviewSummary.overall.totalReviews > 0 ? 
        Math.round((summaryCards.recentReviews / (summaryCards.recentContacts + summaryCards.recentReviews + summaryCards.recentBlogs)) * 100) : 0
    };

    res.status(200).json({
      // Overview statistics
      overview: {
        totalSubscribers,
        totalBlogs,
        totalGalleryItems,
        totalDestinations,
        totalItineraries,
        totalTeamMembers,
        totalContacts,
        totalUsers,
        totalBookings
      },

      // Review statistics
      reviews: reviewSummary,

      // Recent activities
      recentActivities: {
        contacts: recentContacts.map(contact => ({
          id: contact._id,
          name: contact.name,
          email: contact.email,
          subject: contact.subject,
          status: contact.status,
          createdAt: contact.createdAt
        })),
        blogs: recentBlogs.map(blog => ({
          id: blog._id,
          title: blog.title,
          createdAt: blog.createdAt
        })),
        destinations: recentDestinations.map(destination => ({
          id: destination._id,
          name: destination.name,
          region: destination.region,
          createdAt: destination.createdAt
        })),
        itineraries: recentItineraries.map(itinerary => ({
          id: itinerary._id,
          title: itinerary.title,
          duration: `${itinerary.daysCount} days, ${itinerary.nightsCount} nights`,
          createdAt: itinerary.createdAt
        })),
        reviews: recentReviews.map(review => ({
          id: review._id,
          name: review.name,
          rating: review.rating,
          reviewType: review.reviewType,
          status: review.status,
          createdAt: review.createdAt
        })),
        bookings: recentBookings.map(booking => ({
          id: booking._id,
          name: booking.name,
          email: booking.email,
          status: booking.status,
          travelDate: booking.travelDate,
          numberOfPeople: booking.numberOfPeople,
          createdAt: booking.createdAt
        }))
      },

      // Analytics
      analytics: {
        contactStatus: contactStatusData,
        destinationRegions: destinationRegionData,
        teamCategories: teamCategoryData,
        bookingStatus: bookingStatusData,
        monthlyStats: formattedMonthlyStats,
        performanceMetrics,
        contentDistribution,
        engagementMetrics
      },

      // Quick stats for cards
      quickStats: {
        pendingReviews: reviewSummary.overall.pendingReviews,
        newContacts: contactStatusData.new,
        totalImages: totalGalleryItems,
        averageRating: reviewSummary.company.averageRating,
        recentGrowth: performanceMetrics.contacts.growth,
        pendingBookings: bookingStatusData.pending
      },

      // Summary cards
      summaryCards
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get monthly statistics for charts
// @route   GET /api/dashboard/monthly-stats
// @access  Private
exports.getMonthlyStats = async (req, res) => {
  try {
    const monthlyStats = await getMonthlyStatistics();
    res.status(200).json(monthlyStats);
  } catch (error) {
    console.error("Error fetching monthly stats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get review analytics
// @route   GET /api/dashboard/review-analytics
// @access  Private
exports.getReviewAnalytics = async (req, res) => {
  try {
    const reviewSummary = await getReviewSummary();
    
    // Get review trends over time
    const reviewTrends = await Review.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 },
          avgRating: { $avg: "$rating" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      summary: reviewSummary,
      trends: reviewTrends
    });
  } catch (error) {
    console.error("Error fetching review analytics:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get content analytics
// @route   GET /api/dashboard/content-analytics
// @access  Private
exports.getContentAnalytics = async (req, res) => {
  try {
    const [
      blogStats,
      destinationStats,
      itineraryStats,
      galleryStats
    ] = await Promise.all([
      // Blog statistics
      Blog.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        { $limit: 12 }
      ]),

      // Destination statistics by region
      Destination.aggregate([
        {
          $group: {
            _id: "$region",
            count: { $sum: 1 }
          }
        }
      ]),

      // Itinerary statistics
      Itinerary.aggregate([
        {
          $group: {
            _id: null,
            totalDays: { $sum: "$daysCount" },
            totalNights: { $sum: "$nightsCount" },
            avgDays: { $avg: "$daysCount" },
            avgNights: { $avg: "$nightsCount" }
          }
        }
      ]),

      // Gallery statistics
      Gallery.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        { $limit: 12 }
      ])
    ]);

    res.status(200).json({
      blogs: blogStats,
      destinations: destinationStats,
      itineraries: itineraryStats[0] || { totalDays: 0, totalNights: 0, avgDays: 0, avgNights: 0 },
      gallery: galleryStats
    });
  } catch (error) {
    console.error("Error fetching content analytics:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to get monthly statistics
async function getMonthlyStatistics() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [contacts, blogs, destinations, itineraries, reviews, subscribers, gallery, bookings] = await Promise.all([
    Contact.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),

    Blog.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),

    Destination.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),

    Itinerary.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),

    Review.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),

    Newsletter.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),

    Gallery.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),

    Booking.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ])
  ]);

  return {
    contacts,
    blogs,
    destinations,
    itineraries,
    reviews,
    subscribers,
    gallery,
    bookings
  };
}

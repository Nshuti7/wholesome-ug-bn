const Review = require("../models/Review");
const Itinerary = require("../models/Itinerary");
const Company = require("../models/Company");

// Create a new review
exports.createReview = async (req, res) => {
  try {
    const { name, email, rating, title, comment, reviewType, subjectId } = req.body;

    // Validate review type
    if (!["company", "itinerary"].includes(reviewType)) {
      return res.status(400).json({ 
        message: "Review type must be either 'company' or 'itinerary'" 
      });
    }

    let finalSubjectId = subjectId;

    // For company reviews, get or create the company record
    if (reviewType === "company") {
      const company = await Company.getOrCreateCompany();
      finalSubjectId = company._id;
    } else if (reviewType === "itinerary") {
      // For itinerary reviews, validate that the itinerary exists
      const itinerary = await Itinerary.findById(subjectId);
      if (!itinerary) {
        return res.status(404).json({ 
          message: "Itinerary not found" 
        });
      }
    }

    // Check if user has already reviewed this subject
    const existingReview = await Review.findOne({
      email,
      reviewType,
      subjectId: finalSubjectId
    });

    if (existingReview) {
      return res.status(400).json({ 
        message: "You have already reviewed this item" 
      });
    }

    const review = await Review.create({
      name,
      email,
      rating,
      title,
      comment,
      reviewType,
      subjectId: finalSubjectId,
      subjectModel: reviewType === "itinerary" ? "Itinerary" : "Company"
    });

    res.status(201).json({
      success: true,
      data: review,
      message: "Review submitted successfully and is pending approval"
    });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ 
      message: "Error creating review",
      error: error.message 
    });
  }
};

// Get all reviews (admin only)
exports.getAllReviews = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      reviewType, 
      sort = "-createdAt" 
    } = req.query;

    const query = {};
    
    if (status) query.status = status;
    if (reviewType) query.reviewType = reviewType;

    const skip = (page - 1) * limit;
    
    const reviews = await Review.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      data: reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        hasNextPage: skip + reviews.length < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error("Get all reviews error:", error);
    res.status(500).json({ 
      message: "Error fetching reviews",
      error: error.message 
    });
  }
};

// Get reviews by subject (public)
exports.getReviewsBySubject = async (req, res) => {
  try {
    const { reviewType, subjectId } = req.params;
    const { page = 1, limit = 10, sort = "-createdAt" } = req.query;

    if (!["company", "itinerary"].includes(reviewType)) {
      return res.status(400).json({ 
        message: "Invalid review type" 
      });
    }

    let finalSubjectId = subjectId;

    // For company reviews, get the company ID
    if (reviewType === "company") {
      const company = await Company.getOrCreateCompany();
      finalSubjectId = company._id;
    }

    const skip = (page - 1) * limit;
    
    const reviews = await Review.getReviewsBySubject(reviewType, finalSubjectId, {
      status: "approved",
      limit: parseInt(limit),
      skip,
      sort
    });

    const total = await Review.countDocuments({
      reviewType,
      subjectId: finalSubjectId,
      status: "approved"
    });

    // Get average rating
    const ratingStats = await Review.getAverageRating(reviewType, finalSubjectId);

    res.json({
      success: true,
      data: reviews,
      ratingStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        hasNextPage: skip + reviews.length < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error("Get reviews by subject error:", error);
    res.status(500).json({ 
      message: "Error fetching reviews",
      error: error.message 
    });
  }
};

// Get single review
exports.getReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ 
        message: "Review not found" 
      });
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error("Get review error:", error);
    res.status(500).json({ 
      message: "Error fetching review",
      error: error.message 
    });
  }
};

// Update review status (admin only)
exports.updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ 
        message: "Invalid status. Must be pending, approved, or rejected" 
      });
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!review) {
      return res.status(404).json({ 
        message: "Review not found" 
      });
    }

    res.json({
      success: true,
      data: review,
      message: `Review ${status} successfully`
    });
  } catch (error) {
    console.error("Update review status error:", error);
    res.status(500).json({ 
      message: "Error updating review status",
      error: error.message 
    });
  }
};

// Delete review (admin only)
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    
    if (!review) {
      return res.status(404).json({ 
        message: "Review not found" 
      });
    }

    res.json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ 
      message: "Error deleting review",
      error: error.message 
    });
  }
};

// Mark review as helpful
exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ 
        message: "Review not found" 
      });
    }

    res.json({
      success: true,
      data: review,
      message: "Review marked as helpful"
    });
  } catch (error) {
    console.error("Mark helpful error:", error);
    res.status(500).json({ 
      message: "Error marking review as helpful",
      error: error.message 
    });
  }
};

// Report review
exports.reportReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $inc: { reportedCount: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ 
        message: "Review not found" 
      });
    }

    res.json({
      success: true,
      data: review,
      message: "Review reported successfully"
    });
  } catch (error) {
    console.error("Report review error:", error);
    res.status(500).json({ 
      message: "Error reporting review",
      error: error.message 
    });
  }
};

// Get review statistics (admin only)
exports.getReviewStats = async (req, res) => {
  try {
    const { reviewType } = req.query;
    
    const matchStage = reviewType ? { reviewType } : {};

    const stats = await Review.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          pendingReviews: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          approvedReviews: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
          },
          rejectedReviews: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
          },
          ratingDistribution: {
            $push: "$rating"
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        success: true,
        data: {
          totalReviews: 0,
          averageRating: 0,
          pendingReviews: 0,
          approvedReviews: 0,
          rejectedReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      });
    }

    const ratingDistribution = stats[0].ratingDistribution.reduce((acc, rating) => {
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalReviews: stats[0].totalReviews,
        averageRating: Math.round(stats[0].averageRating * 10) / 10,
        pendingReviews: stats[0].pendingReviews,
        approvedReviews: stats[0].approvedReviews,
        rejectedReviews: stats[0].rejectedReviews,
        ratingDistribution
      }
    });
  } catch (error) {
    console.error("Get review stats error:", error);
    res.status(500).json({ 
      message: "Error fetching review statistics",
      error: error.message 
    });
  }
}; 
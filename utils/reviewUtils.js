const Review = require("../models/Review");
const Company = require("../models/Company");

// Get company reviews (public)
exports.getCompanyReviews = async (options = {}) => {
  const company = await Company.getOrCreateCompany();
  return Review.getReviewsBySubject("company", company._id, options);
};

// Get company rating statistics
exports.getCompanyRatingStats = async () => {
  const company = await Company.getOrCreateCompany();
  return Review.getAverageRating("company", company._id);
};

// Validate review data
exports.validateReviewData = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push("Name is required");
  }

  if (!data.email || !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(data.email)) {
    errors.push("Valid email is required");
  }

  if (!data.rating || data.rating < 1 || data.rating > 5) {
    errors.push("Rating must be between 1 and 5");
  }

  if (!data.comment || data.comment.trim().length === 0) {
    errors.push("Comment is required");
  }

  if (!data.reviewType || !["company", "itinerary"].includes(data.reviewType)) {
    errors.push("Review type must be either 'company' or 'itinerary'");
  }

  if (data.reviewType === "itinerary" && !data.subjectId) {
    errors.push("Subject ID is required for itinerary reviews");
  }

  return errors;
};

// Format review for display
exports.formatReviewForDisplay = (review) => {
  return {
    id: review._id,
    name: review.name,
    rating: review.rating,
    comment: review.comment,
    reviewType: review.reviewType,
    status: review.status,
    helpfulCount: review.helpfulCount,
    formattedDate: review.formattedDate,
    createdAt: review.createdAt
  };
};

// Get review summary for dashboard
exports.getReviewSummary = async () => {
  const company = await Company.getOrCreateCompany();
  
  const [companyStats, itineraryStats, totalStats] = await Promise.all([
    Review.getAverageRating("company", company._id),
    Review.aggregate([
      { $match: { reviewType: "itinerary", status: "approved" } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 }
        }
      }
    ]),
    Review.aggregate([
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          pendingReviews: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          approvedReviews: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
          },
          rejectedReviews: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
          }
        }
      }
    ])
  ]);

  return {
    company: {
      averageRating: companyStats.averageRating,
      totalReviews: companyStats.totalReviews,
      ratingDistribution: companyStats.ratingDistribution
    },
    itineraries: {
      averageRating: itineraryStats.length > 0 ? Math.round(itineraryStats[0].averageRating * 10) / 10 : 0,
      totalReviews: itineraryStats.length > 0 ? itineraryStats[0].totalReviews : 0
    },
    overall: totalStats.length > 0 ? totalStats[0] : {
      totalReviews: 0,
      pendingReviews: 0,
      approvedReviews: 0,
      rejectedReviews: 0
    }
  };
}; 
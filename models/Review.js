const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"]
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email"
      ]
    },
    rating: {
      type: Number,
      required: [true, "Please provide a rating"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"]
    },
    title: {
      type: String,
      required: [true, "Please provide a review title"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"]
    },
    comment: {
      type: String,
      required: [true, "Please provide a comment"],
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"]
    },
    reviewType: {
      type: String,
      required: [true, "Review type is required"],
      enum: ["company", "itinerary"],
      default: "company"
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Subject ID is required"],
      refPath: "subjectModel"
    },
    subjectModel: {
      type: String,
      required: [true, "Subject model is required"],
      enum: ["Itinerary", "Company"] // We'll use "Company" as a placeholder for company reviews
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    helpfulCount: {
      type: Number,
      default: 0
    },
    reportedCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient querying
reviewSchema.index({ reviewType: 1, subjectId: 1 });
reviewSchema.index({ status: 1, reviewType: 1 });
reviewSchema.index({ rating: 1, reviewType: 1 });

// Virtual for formatted date
reviewSchema.virtual("formattedDate").get(function() {
  return this.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
});

// Ensure virtuals are serialized
reviewSchema.set("toJSON", { virtuals: true });
reviewSchema.set("toObject", { virtuals: true });

// Pre-save middleware to validate subject exists
reviewSchema.pre("save", async function(next) {
  if (this.isNew || this.isModified("subjectId") || this.isModified("subjectModel")) {
    try {
      let Model;
      
      if (this.subjectModel === "Itinerary") {
        Model = mongoose.model("Itinerary");
      } else if (this.subjectModel === "Company") {
        Model = mongoose.model("Company");
      } else {
        throw new Error("Invalid subject model");
      }
      
      const subject = await Model.findById(this.subjectId);
      if (!subject) {
        throw new Error(`${this.subjectModel} not found`);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Static method to get reviews by type and subject
reviewSchema.statics.getReviewsBySubject = async function(reviewType, subjectId, options = {}) {
  const { status = "approved", limit = 10, skip = 0, sort = "-createdAt" } = options;
  
  return this.find({
    reviewType,
    subjectId,
    status
  })
  .sort(sort)
  .limit(limit)
  .skip(skip);
};

// Static method to get average rating
reviewSchema.statics.getAverageRating = async function(reviewType, subjectId) {
  const result = await this.aggregate([
    {
      $match: {
        reviewType,
        subjectId: mongoose.Types.ObjectId(subjectId),
        status: "approved"
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: "$rating"
        }
      }
    }
  ]);
  
  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
  
  const ratingDistribution = result[0].ratingDistribution.reduce((acc, rating) => {
    acc[rating] = (acc[rating] || 0) + 1;
    return acc;
  }, {});
  
  return {
    averageRating: Math.round(result[0].averageRating * 10) / 10,
    totalReviews: result[0].totalReviews,
    ratingDistribution
  };
};

module.exports = mongoose.model("Review", reviewSchema); 
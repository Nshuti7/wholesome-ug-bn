const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add your name"],
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Please add your email"],
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    phone: {
      type: String,
      required: [true, "Please add your phone number"],
      trim: true,
    },
    phoneCountryCode: {
      type: String,
      required: [true, "Please add your phone country code"],
      default: "+256",
    },
    country: {
      type: String,
      required: [true, "Please add your country"],
      trim: true,
      maxlength: [3, "Country code cannot be more than 3 characters"],
    },
    preferredTour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Itinerary",
      required: false, // Optional field
    },
    travelDate: {
      type: Date,
      required: [true, "Please add your preferred travel date"],
      validate: {
        validator: function(value) {
          return value > new Date();
        },
        message: "Travel date must be in the future"
      }
    },
    numberOfPeople: {
      type: Number,
      required: [true, "Please add the number of people"],
      min: [1, "Number of people must be at least 1"],
      max: [50, "Number of people cannot exceed 50"],
    },
    specialRequests: {
      type: String,
      maxlength: [1000, "Special requests cannot be more than 1000 characters"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "in progress", "completed", "cancelled"],
      default: "pending",
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    notes: {
      type: String,
      maxlength: [2000, "Notes cannot be more than 2000 characters"],
      trim: true,
    },
    adminNotes: {
      type: String,
      maxlength: [2000, "Admin notes cannot be more than 2000 characters"],
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: ["website", "phone", "email", "social_media"],
      default: "website",
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ email: 1 });
BookingSchema.index({ travelDate: 1 });

// Virtual for full phone number
BookingSchema.virtual('fullPhoneNumber').get(function() {
  return `${this.phoneCountryCode}${this.phone}`;
});

// Ensure virtual fields are serialized
BookingSchema.set('toJSON', { virtuals: true });
BookingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Booking", BookingSchema); 
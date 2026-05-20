// models/Itinerary.js
const mongoose = require("mongoose");

const imageSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    cloudinaryId: { type: String, required: true },
  },
  { _id: false }
);

const INCLUSIONS = [
  "Hotel pickup and drop-off",
  "Road transport",
  "Speedboat transfers",
  "Transfer to a private pier",
  "Buffet lunch",
  "Morning tea",
  "Snacks",
  "Drinking water",
  "Soft drinks",
  "Alcoholic beverages",
  "Snorkeling",
  "Swimming",
  "Sightseeing",
  "Wildlife viewing",
  "Snorkeling equipment",
  "Towel",
  "Tour guide",
  "Insurance",
  "Local taxes",
  "Tips",
];

const ACTIVITY_TYPES = [
  "Wildlife Safari",
  "Cultural Experience",
  "Adventure Tour",
  "Photography Tour",
  "Nature Walk",
  "Bird Watching",
  "Gorilla Trekking",
  "Chimpanzee Tracking",
  "Canopy Walk",
  "Boat Safari",
  "Hiking",
  "Community Visit",
  "Conservation Tour",
  "Scenic Drive",
  "Sunset Viewing",
  "Crater Lake Tour",
];

const daySubSchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, required: true },
    activity: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const destSubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const itinerarySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    daysCount: { type: Number, required: true },
    nightsCount: { type: Number, required: true },
    highlights: { type: [String], default: [] },
    backgroundImage: { type: imageSubSchema, required: true },
    additionalImages: { type: [imageSubSchema], default: [] },
    inclusions: {
      type: [String],
      enum: INCLUSIONS,
      default: [],
    },
    days: { type: [daySubSchema], default: [] },
    destinations: { type: [destSubSchema], default: [] },
    // Pricing fields
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function(v) {
          return v >= 0;
        },
        message: 'Price must be a positive number'
      }
    },
    oldPrice: {
      type: Number,
      min: 0,
      default: null,
      validate: {
        validator: function(v) {
          if (v === null || v === undefined) return true;
          return v >= this.price;
        },
        message: 'Old price must be greater than or equal to current price'
      }
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP'],
      trim: true
    },
    // Featured flag
    featured: {
      type: Boolean,
      default: false
    },
    // Discount percentage (0-100)
    discount: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      validate: {
        validator: function(v) {
          return v >= 0 && v <= 100;
        },
        message: 'Discount must be between 0 and 100 percent'
      }
    },
    // Activity types
    activityTypes: {
      type: [String],
      enum: ACTIVITY_TYPES,
      default: [],
      validate: {
        validator: function(v) {
          return v.length <= 10; // Limit to 10 activity types max
        },
        message: 'Maximum 10 activity types allowed'
      }
    },
  },
  { timestamps: true }
);

// Virtual field to calculate if there's a discount
itinerarySchema.virtual('hasDiscount').get(function() {
  return this.discount > 0 && this.oldPrice && this.oldPrice > this.price;
});

// Virtual field to calculate discount amount in USD
itinerarySchema.virtual('discountAmount').get(function() {
  if (this.hasDiscount) {
    return this.oldPrice - this.price;
  }
  return 0;
});

// Ensure virtual fields are serialized
itinerarySchema.set('toJSON', { virtuals: true });
itinerarySchema.set('toObject', { virtuals: true });

itinerarySchema.statics.INCLUSIONS = INCLUSIONS;
itinerarySchema.statics.ACTIVITY_TYPES = ACTIVITY_TYPES;

module.exports = mongoose.model("Itinerary", itinerarySchema);

// models/Experience.js
const mongoose = require("mongoose");

const imageSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    cloudinaryId: { type: String, required: true },
  },
  { _id: false }
);

// Brand-neutral categories for the rebrand (Travel · Art · Storytelling).
// Kept as a superset that still includes the original safari values so any
// existing rows keep validating.
const EXPERIENCE_CATEGORIES = [
  "Cultural Experience",
  "Adventure",
  "Nature",
  "Photography",
  "Art & Craft",
  "Workshop",
  "City & Markets",
  "Food & Drink",
  "Music & Performance",
  "Scenic",
  "Community",
  // Legacy safari values — retained so older experiences still validate.
  "Gorilla Trekking",
  "Chimpanzee Tracking",
  "Bird Watching",
  "Boat Safari",
  "Nature Walk",
  "Scenic Drive",
  "Conservation Tour",
];

const CURRENCIES = ["USD", "EUR", "GBP"];
const PRICE_UNITS = ["per person", "per permit", "per group"];
const DIFFICULTIES = ["Easy", "Moderate", "Challenging", "Strenuous"];

const experienceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: EXPERIENCE_CATEGORIES,
      trim: true,
    },
    duration: { type: String, trim: true },
    // Free-form regions/places (no longer constrained to national parks).
    parks: { type: [String], default: [] },
    highlights: { type: [String], default: [] },
    coverImage: { type: imageSubSchema, required: true },
    additionalImages: { type: [imageSubSchema], default: [] },
    featured: { type: Boolean, default: false },

    // Pricing
    price: { type: Number, min: 0 },
    currency: { type: String, enum: CURRENCIES, default: "USD", trim: true },
    priceUnit: { type: String, enum: PRICE_UNITS, default: "per person", trim: true },

    // Logistics
    difficulty: { type: String, enum: DIFFICULTIES, trim: true },
    bestTime: { type: String, trim: true },
    minAge: { type: Number, min: 0 },
    groupSize: { type: String, trim: true },

    // What's included / what to bring
    included: { type: [String], default: [] },
    whatToBring: { type: [String], default: [] },
  },
  { timestamps: true }
);

experienceSchema.statics.EXPERIENCE_CATEGORIES = EXPERIENCE_CATEGORIES;
experienceSchema.statics.CURRENCIES = CURRENCIES;
experienceSchema.statics.PRICE_UNITS = PRICE_UNITS;
experienceSchema.statics.DIFFICULTIES = DIFFICULTIES;

module.exports = mongoose.model("Experience", experienceSchema);

// models/Experience.js
const mongoose = require("mongoose");

const imageSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    cloudinaryId: { type: String, required: true },
  },
  { _id: false }
);

const EXPERIENCE_CATEGORIES = [
  "Gorilla Trekking",
  "Chimpanzee Tracking",
  "Bird Watching",
  "Boat Safari",
  "Nature Walk",
  "Cultural Experience",
  "Adventure",
  "Photography",
  "Scenic Drive",
  "Conservation Tour",
];

const PARKS = [
  "Bwindi Impenetrable",
  "Queen Elizabeth",
  "Murchison Falls",
  "Kidepo Valley",
  "Lake Mburo",
  "Mount Elgon",
  "Kibale",
  "Semuliki",
  "Rwenzori",
];

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
    parks: { type: [String], enum: PARKS, default: [] },
    highlights: { type: [String], default: [] },
    coverImage: { type: imageSubSchema, required: true },
    additionalImages: { type: [imageSubSchema], default: [] },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

experienceSchema.statics.EXPERIENCE_CATEGORIES = EXPERIENCE_CATEGORIES;
experienceSchema.statics.PARKS = PARKS;

module.exports = mongoose.model("Experience", experienceSchema);

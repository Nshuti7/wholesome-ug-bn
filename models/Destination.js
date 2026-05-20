// models/Destination.js

const mongoose = require("mongoose");

const imageSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    cloudinaryId: { type: String, required: true },
  },
  { _id: false }
);

const ATTRACTIONS = [
  "Canopy Walk way",
  "Gorilla trekking",
  "Chimpanzee tracking",
  "Safari drive",
  "Bird watching",
  "Nature walk",
  "Canopy walk",
  "Conservation tour",
  "Forest bathing",
  "Crater lake hike",
  "Scenic photo stop",
  "Sunset viewing",
  "Panoramic lookout",
  "Drone-friendly area",
  "Hidden gem discovery",
  "Nature photography",
];

const WILDLIFE = [
  "African Elephant",
  "African Buffalo",
  "Lion",
  "Leopard",
  "Cheetah",
  "Hippopotamus",
  "Nile Crocodile",
  "Spotted Hyena",
  "African Wild Dog",
  "Warthog",
  "Giraffe",
  "Plains Zebra",
  "Thomson's Gazelle",
  "Impala",
  "Olive Baboon",
  "Vervet Monkey",
  "Black-and-white Colobus",
  "Common Chimpanzee",
  "Mountain Gorilla",
];

const REGIONS = ["North", "South", "East", "West", "Central"];

const DESTINATION_TYPES = [
  "National Park",
  "Wildlife Reserve",
  "Cultural Site",
  "Historical Site",
  "Adventure Park",
  "Nature Reserve",
  "Conservation Area",
  "Scenic Viewpoint",
  "Crater Lake",
  "Forest Reserve",
  "Mountain Range",
  "Waterfall",
  "Hot Springs",
  "Cultural Village",
  "Archaeological Site",
  "Botanical Garden",
];

const destinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    history: { type: String, required: true, trim: true },
    googleMapsLink: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    region: { type: String, enum: REGIONS, required: true, trim: true },
    bestTimeToVisit: { type: String, required: true, trim: true },
    climate: { type: String, required: true, trim: true },
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
    attractions: {
      type: [String],
      enum: ATTRACTIONS,
      default: [],
    },
    wildlife: {
      type: [String],
      enum: WILDLIFE,
      default: [],
    },
    destinationType: {
      type: String,
      enum: DESTINATION_TYPES,
      required: true,
      trim: true
    },
    featured: {
      type: Boolean,
      default: false
    },
    backgroundImage: { type: imageSubSchema, required: true },
    additionalImages: { type: [imageSubSchema], default: [] },
    facts: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Expose the lists for validation elsewhere if you like:
destinationSchema.statics.ATTRACTIONS = ATTRACTIONS;
destinationSchema.statics.WILDLIFE = WILDLIFE;
destinationSchema.statics.REGIONS = REGIONS;
destinationSchema.statics.DESTINATION_TYPES = DESTINATION_TYPES;

module.exports = mongoose.model("Destination", destinationSchema);

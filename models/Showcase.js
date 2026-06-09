// models/Showcase.js
//
// A single managed gallery item for the two creative arms of the brand:
//   kind: "art"   → pieces shown on /art
//   kind: "story" → selected work shown on /storytelling
//
// Both arms share an identical shape (image + title + medium + ordering),
// so one model with a `kind` discriminator keeps the backend DRY while the
// admin and frontend present them as two separate sections.
const mongoose = require("mongoose");

const imageSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    cloudinaryId: { type: String, required: true },
  },
  { _id: false }
);

const KINDS = ["art", "story"];

const showcaseSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: KINDS,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    // Free-form sub-label, e.g. "Carved wood · beadwork" or "Brand film · Kampala".
    medium: { type: String, trim: true, default: "" },
    image: { type: imageSubSchema, required: true },
    // Drives the masonry span on the frontend (tall tiles span more rows).
    tall: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    // Manual sort within a kind; lower comes first.
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

showcaseSchema.statics.KINDS = KINDS;

module.exports = mongoose.model("Showcase", showcaseSchema);

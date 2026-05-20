const mongoose = require("mongoose");

const categories = [
  "Leadership",
  "Engineering",
  "Operations",
  "Community",
  "Partners",
  "Advisory Board",
  "Alumni",
  "Support Staff",
  "Researchers",
  "Mentors",
  "Contractors",
  "Other"
];

const TeamMemberSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Please add a full name"],
      trim: true,
    },
    position: {
      type: String,
      required: [true, "Please add a position/title"],
      trim: true,
    },
    bio: {
      type: String,
      required: [true, "Please add a bio"],
      trim: true,
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    linkedIn: {
      type: String,
      required: [true, "Please add a LinkedIn profile URL"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Please select a category"],
      enum: categories,
    },
    image: {
      type: String,
      required: [true, "Please provide an image URL"],
    },
    cloudinaryId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeamMember", TeamMemberSchema);

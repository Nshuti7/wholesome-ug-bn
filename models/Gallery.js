const mongoose = require("mongoose");

const GallerySchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, "Please add a filename"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot be more than 200 characters"],
      default: "",
    },
    image: {
      type: String,
      required: [true, "Please add an image URL"],
    },
    cloudinaryId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Gallery", GallerySchema);

const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: String, required: true },
    category: { type: String, required: true },
    excerpt: { type: String, required: true },
    image: { type: String, required: true },
    readTime: { type: String, required: true },
    content: { type: String, required: true },
    cloudinaryId: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", blogSchema);

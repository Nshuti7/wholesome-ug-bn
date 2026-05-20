const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema(
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
    subject: {
      type: String,
      required: [true, "Please add a subject"],
      maxlength: [100, "Subject cannot be more than 100 characters"],
    },
    message: {
      type: String,
      required: [true, "Please add your message"],
      maxlength: [1000, "Message cannot be more than 1000 characters"],
    },
    status: {
      type: String,
      enum: ["new", "in progress", "resolved"],
      default: "new",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Contact", ContactSchema);

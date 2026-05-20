const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"]
    },
    isActive: {
      type: Boolean,
      default: true
    },
    almanac: {
      permitAvailability: { type: String, trim: true, default: "" },
      permitStatus: { type: String, trim: true, default: "" },
      nextDeparture: { type: String, trim: true, default: "" },
      nextDepartureStatus: { type: String, trim: true, default: "" },
      guideOnCall: { type: String, trim: true, default: "" },
      seasonStatus: { type: String, trim: true, default: "" },
      roadsStatus: { type: String, trim: true, default: "" },
      waitingListStatus: { type: String, trim: true, default: "" },
    }
  },
  {
    timestamps: true
  }
);

// Ensure only one company record exists
companySchema.statics.getOrCreateCompany = async function() {
  let company = await this.findOne({ isActive: true });
  
  if (!company) {
    company = await this.create({
      name: "Wholesome Uganda",
      description: "Your trusted partner for unforgettable travel experiences in Uganda"
    });
  }
  
  return company;
};

module.exports = mongoose.model("Company", companySchema); 
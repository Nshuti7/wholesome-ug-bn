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
    contact: {
      primaryPhone:    { type: String, trim: true, default: "" },
      whatsappNumber:  { type: String, trim: true, default: "" },
      primaryEmail:    { type: String, trim: true, default: "" },
      planEmail:       { type: String, trim: true, default: "" },
      legalEmail:      { type: String, trim: true, default: "" },
      privacyEmail:    { type: String, trim: true, default: "" },
      officeAddress:   { type: String, trim: true, default: "" },
      officeHours:     { type: String, trim: true, default: "" },
      responseTime:    { type: String, trim: true, default: "" },
    },
    social: {
      instagram:   { type: String, trim: true, default: "" },
      x:           { type: String, trim: true, default: "" },
      facebook:    { type: String, trim: true, default: "" },
      linkedin:    { type: String, trim: true, default: "" },
      tripadvisor: { type: String, trim: true, default: "" },
      tiktok:      { type: String, trim: true, default: "" },
    },
    meta: {
      legalName:   { type: String, trim: true, default: "" },
      foundedYear: { type: String, trim: true, default: "" },
      tagline:     { type: String, trim: true, default: "" },
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
      name: "Ubuntu Footprints",
      description: "Your trusted partner for unforgettable travel experiences in Uganda"
    });
  }

  return company;
};

module.exports = mongoose.model("Company", companySchema);

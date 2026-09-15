// models/FlightFare.js
//
// A fare the team enters by hand, for routes the provider cannot answer.
//
// WHY MONGO AND NOT REDIS
//
// Everything else in the flight feature lives in Redis with an 8-day TTL,
// because it is all re-derivable: if the cache is lost, tomorrow's refresh
// rebuilds it from the provider. These are not. They are typed in by a person
// who knows what a client actually paid, and losing them to a cache flush, a
// redeploy or a provider outage would mean losing work nobody can regenerate.
//
// THE TRAP THIS IS DESIGNED AGAINST
//
// This feature already had a hand-written price table once. It went stale,
// nobody noticed, and it was out by up to 61% against real fares while looking
// authoritative on the page. The difference here is accountability: every entry
// records who set it and when, `reviewAfterDays` decides when it is called
// stale, and the admin surfaces that age. A fare nobody has confirmed in three
// months should look doubtful, not permanent.

const mongoose = require("mongoose");

const flightFareSchema = new mongoose.Schema(
  {
    // ISO-3166 alpha-2 of the departure market, matching config/flightOrigins.
    country: {
      type: String,
      required: [true, "A departure country is required"],
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 2,
    },

    // "YYYY-MM" for a single month, or null to apply to every month we publish.
    // Null is the common case: a market with no provider data usually needs one
    // sensible year-round figure, not six.
    month: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || /^\d{4}-(0[1-9]|1[0-2])$/.test(v),
        message: 'Month must be "YYYY-MM" or empty for all months',
      },
    },

    amount: {
      type: Number,
      required: [true, "A fare amount is required"],
      min: [1, "A fare must be greater than zero"],
      max: [50000, "That looks like a typo rather than a fare"],
    },

    // Only USD for now: the rest of the pipeline refuses to convert currencies
    // rather than invent an exchange rate, and a mixed-currency override would
    // silently break the "rough total" arithmetic on the website.
    currency: {
      type: String,
      default: "USD",
      enum: ["USD"],
    },

    // Shown to visitors in place of the generated caveat. Optional — leave blank
    // and the site uses its own wording.
    publicNote: {
      type: String,
      trim: true,
      maxlength: [160, "Keep the note short enough to read under a figure"],
    },

    // Why this exists, for whoever finds it in six months. Never shown publicly.
    internalNote: {
      type: String,
      trim: true,
      maxlength: [500, "Internal note cannot be more than 500 characters"],
    },

    // false (default): fill a gap only — a real provider fare still wins.
    // true: beat the provider too, for when the team has a negotiated or
    // consolidator rate the public search engines do not show.
    overrideLive: {
      type: Boolean,
      default: false,
    },

    // Set false to retire an entry without deleting its history.
    active: {
      type: Boolean,
      default: true,
    },

    // How long before this is treated as needing a fresh look.
    reviewAfterDays: {
      type: Number,
      default: 90,
      min: [7, "Review period must be at least a week"],
      max: [365, "A fare unchecked for over a year should not be published"],
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// One entry per market per month; null month is the market-wide entry.
flightFareSchema.index({ country: 1, month: 1 }, { unique: true });

/** Days since this entry was last touched. */
flightFareSchema.virtual("ageDays").get(function () {
  return Math.floor((Date.now() - new Date(this.updatedAt).getTime()) / 86400000);
});

/** Past its review period — still served, but flagged in the admin. */
flightFareSchema.virtual("needsReview").get(function () {
  return this.ageDays > this.reviewAfterDays;
});

flightFareSchema.set("toJSON", { virtuals: true });
flightFareSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("FlightFare", flightFareSchema);

const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/auth");
const FlightFare = require("../models/FlightFare");
const flightPricing = require("../services/flightPricingService");
const { resolveOrigin, ORIGINS } = require("../config/flightOrigins");

// Manual fares, entered by the team for routes the provider cannot answer.
// Admin-only throughout: these numbers go straight onto the public site.

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Accept a country code we actually publish, and normalise it. */
function normaliseCountry(input) {
  const origin = resolveOrigin(input);
  return origin ? origin.country : null;
}

/** Shared validation for create and update. */
function validate(body) {
  const country = normaliseCountry(body.country);
  if (!country) {
    return {
      error:
        "Unknown departure market. It must be one of the countries in the flight origins list.",
    };
  }

  const month = body.month === "" || body.month == null ? null : String(body.month).trim();
  if (month !== null && !MONTH_RE.test(month)) {
    return { error: 'Month must be "YYYY-MM", or left empty to cover every month.' };
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be a number greater than zero." };
  }

  return {
    value: {
      country,
      month,
      amount,
      publicNote: body.publicNote?.trim() || undefined,
      internalNote: body.internalNote?.trim() || undefined,
      overrideLive: Boolean(body.overrideLive),
      active: body.active === undefined ? true : Boolean(body.active),
      reviewAfterDays: body.reviewAfterDays ? Number(body.reviewAfterDays) : undefined,
    },
  };
}

/**
 * @swagger
 * /flight-fares:
 *   get:
 *     summary: List manually entered fares (admin)
 *     tags: [Flights]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Manual fares, with the markets available to add
 */
router.get("/", protect, admin, async (req, res) => {
  try {
    const fares = await FlightFare.find().sort({ country: 1, month: 1 }).lean({ virtuals: true });

    // Send the market list too, so the admin form can offer a proper picker
    // rather than a free-text country box that invites typos.
    res.json({
      success: true,
      data: {
        fares,
        markets: ORIGINS.map((o) => ({
          country: o.country,
          countryName: o.countryName,
          city: o.city,
          region: o.region,
        })),
        months: flightPricing.upcomingMonths(),
      },
    });
  } catch (error) {
    console.error("[flight-fares] list error:", error.message);
    res.status(500).json({ success: false, message: "Failed to load manual fares" });
  }
});

/**
 * @swagger
 * /flight-fares:
 *   post:
 *     summary: Add a manual fare (admin)
 *     tags: [Flights]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 *       409:
 *         description: An entry already exists for that market and month
 */
router.post("/", protect, admin, async (req, res) => {
  try {
    const { error, value } = validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    const fare = await FlightFare.create({ ...value, updatedBy: req.user._id });
    flightPricing.invalidateOverrides();

    res.status(201).json({ success: true, data: fare });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "There is already a fare for that market and month. Edit that one instead of adding a second.",
      });
    }
    console.error("[flight-fares] create error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /flight-fares/{id}:
 *   put:
 *     summary: Update a manual fare (admin)
 *     tags: [Flights]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated
 */
router.put("/:id", protect, admin, async (req, res) => {
  try {
    const { error, value } = validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    const fare = await FlightFare.findByIdAndUpdate(
      req.params.id,
      { ...value, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!fare) return res.status(404).json({ success: false, message: "Fare not found" });

    flightPricing.invalidateOverrides();
    res.json({ success: true, data: fare });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Another entry already covers that market and month.",
      });
    }
    console.error("[flight-fares] update error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /flight-fares/{id}:
 *   delete:
 *     summary: Delete a manual fare (admin)
 *     tags: [Flights]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const fare = await FlightFare.findByIdAndDelete(req.params.id);
    if (!fare) return res.status(404).json({ success: false, message: "Fare not found" });

    flightPricing.invalidateOverrides();
    res.json({ success: true, message: "Fare removed" });
  } catch (error) {
    console.error("[flight-fares] delete error:", error.message);
    res.status(500).json({ success: false, message: "Failed to remove fare" });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/auth");
const { strictLimiter } = require("../middleware/rateLimiter");
const flightPricing = require("../services/flightPricingService");
const { ORIGINS, DESTINATION, VERIFIED_ON } = require("../config/flightOrigins");

// Every estimate ships with the sentence that makes it honest. It lives here,
// not in the frontend, so no caller can render the number without it.
const DISCLAIMER =
  "Indicative only. Airfare is not included in our package prices and the final " +
  "fare depends on your departure city, travel dates and availability.";

function withDisclaimer(payload) {
  return { ...payload, disclaimer: DISCLAIMER };
}

/**
 * @swagger
 * /flights/origins:
 *   get:
 *     summary: List the origin markets we publish indicative fares for
 *     description: Powers the "where are you flying from?" selector.
 *     tags: [Flights]
 *     responses:
 *       200:
 *         description: Supported origin markets
 */
router.get("/origins", (req, res) => {
  res.json({
    success: true,
    data: {
      destination: DESTINATION,
      guideVerifiedOn: VERIFIED_ON,
      origins: ORIGINS.map((o) => ({
        country: o.country,
        countryName: o.countryName,
        airport: o.airport,
        city: o.city,
      })),
    },
  });
});

/**
 * @swagger
 * /flights/estimate:
 *   get:
 *     summary: Indicative return airfare to Entebbe from one origin
 *     description: >
 *       Served from cache only — this endpoint never calls Amadeus, so it stays
 *       fast and cannot exhaust the API quota. When no sampled fare is cached it
 *       falls back to the hand-maintained guide, and `source` says which was used.
 *     tags: [Flights]
 *     parameters:
 *       - in: query
 *         name: origin
 *         required: true
 *         schema:
 *           type: string
 *         description: ISO country code (GB) or IATA airport code (LHR)
 *         example: GB
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Travel month as YYYY-MM. Defaults to the current month.
 *         example: 2026-12
 *     responses:
 *       200:
 *         description: Indicative fare
 *       400:
 *         description: Missing or unsupported origin
 */
router.get("/estimate", async (req, res) => {
  try {
    const { origin, month } = req.query;

    if (!origin) {
      return res.status(400).json({
        success: false,
        message: "An origin country or airport code is required",
      });
    }

    const estimate = await flightPricing.getEstimate(origin, month);

    if (!estimate) {
      // Unsupported market is an ordinary outcome, not an error the visitor
      // caused — say so plainly and let the UI offer the enquiry form instead.
      return res.status(400).json({
        success: false,
        message: "We do not publish an indicative fare for that departure country yet",
      });
    }

    res.json({ success: true, data: withDisclaimer(estimate) });
  } catch (error) {
    console.error("[flights] estimate error:", error.message);
    res.status(500).json({ success: false, message: "Failed to load flight estimate" });
  }
});

/**
 * @swagger
 * /flights/estimates:
 *   get:
 *     summary: Indicative fares from every supported origin for one month
 *     tags: [Flights]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Travel month as YYYY-MM. Defaults to the current month.
 *         example: 2026-12
 *     responses:
 *       200:
 *         description: Indicative fares
 */
router.get("/estimates", async (req, res) => {
  try {
    const estimates = await flightPricing.getEstimatesForMonth(req.query.month);
    res.json({
      success: true,
      data: withDisclaimer({
        month: estimates[0]?.month || null,
        destination: DESTINATION,
        estimates,
      }),
    });
  } catch (error) {
    console.error("[flights] estimates error:", error.message);
    res.status(500).json({ success: false, message: "Failed to load flight estimates" });
  }
});

/**
 * @swagger
 * /flights/guide:
 *   get:
 *     summary: The full indicative-fare guide (every origin, every upcoming month)
 *     description: >
 *       One payload so the website can prerender the whole guide and let the
 *       visitor switch country and month without another request. Cache-only,
 *       like the other read endpoints.
 *     tags: [Flights]
 *     responses:
 *       200:
 *         description: Fare guide
 */
router.get("/guide", async (req, res) => {
  try {
    const { months, rows } = await flightPricing.getGuideMatrix();
    res.json({
      success: true,
      data: withDisclaimer({
        destination: DESTINATION,
        guideVerifiedOn: VERIFIED_ON,
        months,
        origins: ORIGINS.map((o) => ({
          country: o.country,
          countryName: o.countryName,
          airport: o.airport,
          city: o.city,
        })),
        rows,
      }),
    });
  } catch (error) {
    console.error("[flights] guide error:", error.message);
    res.status(500).json({ success: false, message: "Failed to load flight guide" });
  }
});

/**
 * @swagger
 * /flights/diagnostics:
 *   get:
 *     summary: Which fare provider is active, and does its token work (admin)
 *     description: >
 *       Samples ONE route live and reports what came back, without writing to the
 *       cache. Use this straight after pasting a new API token — a full refresh
 *       takes minutes and spends quota on every route to answer the same question.
 *     tags: [Flights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: origin
 *         schema:
 *           type: string
 *         description: Origin to probe. Defaults to LHR.
 *         example: LHR
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Month to probe as YYYY-MM. Defaults to next month.
 *     responses:
 *       200:
 *         description: Provider status and probe result
 */
router.get("/diagnostics", strictLimiter, protect, admin, async (req, res) => {
  try {
    const result = await flightPricing.probeProvider({
      origin: req.query.origin || "LHR",
      month: req.query.month,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("[flights] diagnostics error:", error.message);
    res.status(500).json({ success: false, message: "Diagnostics failed" });
  }
});

/**
 * @swagger
 * /flights/refresh:
 *   post:
 *     summary: Re-sample indicative fares from Amadeus (admin)
 *     description: >
 *       The only path that spends Amadeus quota. Normally the scheduled job does
 *       this; this endpoint exists for the first population and for debugging.
 *       Takes a couple of minutes — it paces itself to respect rate limits.
 *     tags: [Flights]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Refresh summary
 */
router.post("/refresh", strictLimiter, protect, admin, async (req, res) => {
  try {
    const result = await flightPricing.refreshAll({ reason: "admin" });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("[flights] refresh error:", error.message);
    res.status(500).json({ success: false, message: "Refresh failed" });
  }
});

module.exports = router;

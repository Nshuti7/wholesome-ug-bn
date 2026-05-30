/**
 * @swagger
 * tags:
 *   name: Company
 *   description: Company profile and live almanac (single record)
 */

const express = require("express");
const Company = require("../models/Company");
const { protect, admin } = require("../middleware/auth");

const router = express.Router();

const CONTACT_FIELDS = [
  "primaryPhone",
  "whatsappNumber",
  "primaryEmail",
  "planEmail",
  "legalEmail",
  "privacyEmail",
  "officeAddress",
  "officeHours",
  "responseTime",
];

const SOCIAL_FIELDS = [
  "instagram",
  "x",
  "facebook",
  "linkedin",
  "tripadvisor",
  "tiktok",
];

const META_FIELDS = ["legalName", "foundedYear", "tagline"];

const ALMANAC_FIELDS = [
  "permitAvailability",
  "permitStatus",
  "nextDeparture",
  "nextDepartureStatus",
  "guideOnCall",
  "seasonStatus",
  "roadsStatus",
  "waitingListStatus",
];

function applyNested(target, source, fields) {
  if (!source || typeof source !== "object") return;
  for (const field of fields) {
    if (typeof source[field] === "string") target[field] = source[field];
  }
}

/**
 * @swagger
 * /company:
 *   get:
 *     summary: Get the company profile (creates a default record if none exists)
 *     tags: [Company]
 *     responses:
 *       200:
 *         description: The company record
 */
router.get("/", async (req, res) => {
  try {
    const data = await Company.getOrCreateCompany();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("GET /company error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch company." });
  }
});

/**
 * @swagger
 * /company:
 *   put:
 *     summary: Update the company profile, contact, social, meta, and almanac
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:        { type: string }
 *               description: { type: string }
 *               isActive:    { type: boolean }
 *               contact:     { type: object }
 *               social:      { type: object }
 *               meta:        { type: object }
 *               almanac:     { type: object }
 *     responses:
 *       200:
 *         description: Updated company record
 *       401:
 *         description: Unauthorized
 */
router.put("/", protect, admin, async (req, res) => {
  try {
    const company = await Company.getOrCreateCompany();
    const { name, description, isActive, contact, social, meta, almanac } = req.body;

    if (typeof name === "string") company.name = name;
    if (typeof description === "string") company.description = description;
    if (typeof isActive === "boolean") company.isActive = isActive;

    applyNested(company.contact, contact, CONTACT_FIELDS);
    applyNested(company.social, social, SOCIAL_FIELDS);
    applyNested(company.meta, meta, META_FIELDS);
    applyNested(company.almanac, almanac, ALMANAC_FIELDS);

    await company.save();
    res.status(200).json({ success: true, message: "Company updated.", data: company });
  } catch (err) {
    console.error("PUT /company error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Failed to update company." });
  }
});

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Revalidation
 *   description: Trigger Next.js ISR revalidation of static pages.
 */

/**
 * @swagger
 * /revalidate:
 *   post:
 *     summary: Trigger ISR revalidation (single page or all pages)
 *     tags:
 *       - Revalidation
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       **Admins only.**
 *       - **Single-page**: send JSON `{ "path": "/about/people" }`
 *       - **All pages**: send an empty body (`{}` or no JSON)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               path:
 *                 type: string
 *                 example: "/about/people"
 *                 description: Absolute path to revalidate
 *     responses:
 *       200:
 *         description: Revalidation triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Revalidation triggered
 *                 result:
 *                   type: object
 *                   description: Raw response from Next.js ISR endpoint
 *       400:
 *         description: Invalid `path` parameter
 *       401:
 *         description: Unauthorized (missing/invalid JWT)
 *       500:
 *         description: Server or network error
 */

const express = require("express");
const axios = require("axios");
const { protect, admin } = require("../middleware/auth");
const { URL } = require("url");

const router = express.Router();

router.post("/", protect, admin, async (req, res) => {
  // 1) Validate optional `path`
  const { path } = req.body;
  if (path !== undefined && typeof path !== "string") {
    return res
      .status(400)
      .json({ message: "`path` must be a string if provided" });
  }

  let frontendBase = process.env.FRONTEND_BASE_URL;
  if (!frontendBase) {
    return res
      .status(500)
      .json({ message: "Server misconfiguration: missing FRONTEND_BASE_URL" });
  }

  const token = process.env.REVALIDATE_TOKEN;
  if (!token) {
    return res
      .status(500)
      .json({ message: "Server misconfiguration: missing REVALIDATE_TOKEN" });
  }

  const isrUrl = new URL("/api/revalidate", frontendBase);
  isrUrl.searchParams.set("secret", token);

  try {
    const { data } = await axios.post(isrUrl.toString(), path ? { path } : {}, {
      headers: { "Content-Type": "application/json" },
    });

    return res.status(200).json({
      message: "Revalidation triggered",
      result: data,
    });
  } catch (err) {
    console.error("Revalidation proxy error:", err);
    return res.status(500).json({
      message: "Failed to trigger revalidation",
      error: err.message,
    });
  }
});

module.exports = router;

// routes/itineraries.js

const express = require("express");
const { v2: cloudinary } = require("cloudinary");
const upload = require("../middleware/upload");
const Itinerary = require("../models/Itinerary");
const { protect, admin } = require("../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Itineraries
 *   description: Manage trip itineraries
 *
 * components:
 *   schemas:
 *     ImageObject:
 *       type: object
 *       required:
 *         - url
 *         - cloudinaryId
 *       properties:
 *         url:
 *           type: string
 *           format: url
 *         cloudinaryId:
 *           type: string
 *     Day:
 *       type: object
 *       required:
 *         - dayNumber
 *         - activity
 *         - description
 *       properties:
 *         dayNumber:
 *           type: integer
 *         activity:
 *           type: string
 *         description:
 *           type: string
 *     DestinationRef:
 *       type: object
 *       required:
 *         - name
 *         - duration
 *       properties:
 *         name:
 *           type: string
 *         duration:
 *           type: string
 *     Itinerary:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - daysCount
 *         - nightsCount
 *         - backgroundImage
 *         - price
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         daysCount:
 *           type: integer
 *         nightsCount:
 *           type: integer
 *         highlights:
 *           type: array
 *           items:
 *             type: string
 *         backgroundImage:
 *           $ref: '#/components/schemas/ImageObject'
 *         additionalImages:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ImageObject'
 *         inclusions:
 *           type: array
 *           items:
 *             type: string
 *           enum:
 *             - Hotel pickup and drop-off
 *             - Road transport
 *             - Speedboat transfers
 *             - Transfer to a private pier
 *             - Buffet lunch
 *             - Morning tea
 *             - Snacks
 *             - Drinking water
 *             - Soft drinks
 *             - Alcoholic beverages
 *             - Snorkeling
 *             - Swimming
 *             - Sightseeing
 *             - Wildlife viewing
 *             - Snorkeling equipment
 *             - Towel
 *             - Tour guide
 *             - Insurance
 *             - Local taxes
 *             - Tips
 *         days:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Day'
 *         destinations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DestinationRef'
 *         price:
 *           type: number
 *           minimum: 0
 *           description: Current price in USD
 *         oldPrice:
 *           type: number
 *           minimum: 0
 *           description: Original price in USD (optional)
 *         currency:
 *           type: string
 *           default: USD
 *           enum: [USD, EUR, GBP]
 *         featured:
 *           type: boolean
 *           default: false
 *           description: Whether this itinerary is featured
 *         discount:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           default: 0
 *           description: Discount percentage (0-100)
 *         activityTypes:
 *           type: array
 *           items:
 *             type: string
 *           enum:
 *             - Wildlife Safari
 *             - Cultural Experience
 *             - Adventure Tour
 *             - Photography Tour
 *             - Nature Walk
 *             - Bird Watching
 *             - Gorilla Trekking
 *             - Chimpanzee Tracking
 *             - Canopy Walk
 *             - Boat Safari
 *             - Hiking
 *             - Community Visit
 *             - Conservation Tour
 *             - Scenic Drive
 *             - Sunset Viewing
 *             - Crater Lake Tour
 *         hasDiscount:
 *           type: boolean
 *           readOnly: true
 *           description: Virtual field - whether there's an active discount
 *         discountAmount:
 *           type: number
 *           readOnly: true
 *           description: Virtual field - discount amount in USD
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /itineraries:
 *   get:
 *     summary: List all itineraries
 *     tags: [Itineraries]
 *     responses:
 *       200:
 *         description: Array of itineraries
 */
router.get("/", async (req, res) => {
  try {
    const list = await Itinerary.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    console.error("GET /itineraries error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch itineraries." });
  }
});

/**
 * @swagger
 * /itineraries/{id}:
 *   get:
 *     summary: Get one itinerary
 *     tags: [Itineraries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Itinerary ID
 *     responses:
 *       200:
 *         description: Itinerary object
 *       404:
 *         description: Not found
 */
router.get("/:id", async (req, res) => {
  try {
    const it = await Itinerary.findById(req.params.id).lean();
    if (!it)
      return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, data: it });
  } catch (err) {
    console.error("GET /itineraries/:id error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch itinerary." });
  }
});

/**
 * @swagger
 * /itineraries:
 *   post:
 *     summary: Create a new itinerary
 *     tags: [Itineraries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - daysCount
 *               - nightsCount
 *               - backgroundImage
 *               - price
 *             properties:
 *               title:       { type: string }
 *               description: { type: string }
 *               daysCount:   { type: integer }
 *               nightsCount: { type: integer }
 *               price:       { type: number, minimum: 0 }
 *               oldPrice:    { type: number, minimum: 0 }
 *               currency:    { type: string, default: USD, enum: [USD, EUR, GBP] }
 *               featured:    { type: boolean, default: false }
 *               discount:    { type: number, minimum: 0, maximum: 100, default: 0 }
 *               activityTypes:
 *                 type: array
 *                 items: { type: string }
 *               highlights:
 *                 type: array
 *                 items: { type: string }
 *               inclusions:
 *                 type: array
 *                 items: { type: string }
 *               backgroundImage:
 *                 type: string
 *                 format: binary
 *               additionalImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               days:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Day'
 *               destinations:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/DestinationRef'
 *     responses:
 *       201:
 *         description: Itinerary created
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access only
 */
router.post(
  "/",
  protect,
  admin,
  upload.fields([
    { name: "backgroundImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 10 },
  ]),
  async (req, res) => {
    try {

      if (!req.files.backgroundImage) {
        return res
          .status(400)
          .json({ success: false, message: "Background image is required." });
      }

      const bgFile = req.files.backgroundImage[0];
      const addFiles = req.files.additionalImages || [];

      // other fields
      const {
        title,
        description,
        daysCount,
        nightsCount,
        price,
        oldPrice,
        currency = 'USD',
        featured = false,
        discount = 0,
        activityTypes = [],
        highlights = [],
        inclusions = [],
        days = [],
        destinations = [],
      } = req.body;

      // Since we're using CloudinaryStorage, the files are already uploaded to Cloudinary
      // and contain the URL and public_id in the file objects
      const bgRes = {
        secure_url: bgFile.path,
        public_id: bgFile.filename
      };

      // Additional images are also already uploaded
      const addRes = addFiles.map(f => ({
        secure_url: f.path,
        public_id: f.filename
      }));

      // Parse JSON strings for complex objects with better error handling
      let parsedDays = [];
      let parsedDestinations = [];

      try {
        // Handle days - could be array of strings (JSON) or already parsed
        if (Array.isArray(days)) {
          parsedDays = days.map(day => {
            if (typeof day === 'string') {
              try {
                return JSON.parse(day);
              } catch (e) {
                console.error('Failed to parse day JSON:', day, e);
                return null;
              }
            }
            return day;
          }).filter(day => day !== null);
        } else if (typeof days === 'string') {
          try {
            parsedDays = JSON.parse(days);
          } catch (e) {
            console.error('Failed to parse days string:', days, e);
          }
        }
      } catch (error) {
        console.error('Error parsing days:', error);
      }

      try {
        // Handle destinations - could be array of strings (JSON) or already parsed
        if (Array.isArray(destinations)) {
          parsedDestinations = destinations.map(dest => {
            if (typeof dest === 'string') {
              try {
                return JSON.parse(dest);
              } catch (e) {
                console.error('Failed to parse destination JSON:', dest, e);
                return null;
              }
            }
            return dest;
          }).filter(dest => dest !== null);
        } else if (typeof destinations === 'string') {
          // Handle single destination string
          try {
            const parsed = JSON.parse(destinations);
            parsedDestinations = [parsed]; // Wrap in array
          } catch (e) {
            console.error('Failed to parse destinations string:', destinations, e);
          }
        }
      } catch (error) {
        console.error('Error parsing destinations:', error);
      }

      // Debug the data being sent to create
      const createData = {
        title,
        description,
        daysCount: parseInt(daysCount),
        nightsCount: parseInt(nightsCount),
        price: parseFloat(price),
        oldPrice: oldPrice && parseFloat(oldPrice) > 0 ? parseFloat(oldPrice) : null,
        currency,
        featured: featured === 'true' || featured === true,
        discount: parseFloat(discount),
        activityTypes: Array.isArray(activityTypes) ? activityTypes : [activityTypes].filter(Boolean),
        highlights: Array.isArray(highlights) ? highlights : [highlights].filter(Boolean),
        backgroundImage: {
          url: bgRes.secure_url,
          cloudinaryId: bgRes.public_id,
        },
        additionalImages: addRes.map((r) => ({
          url: r.secure_url,
          cloudinaryId: r.public_id,
        })),
        inclusions: Array.isArray(inclusions) ? inclusions : [inclusions].filter(Boolean),
        days: parsedDays,
        destinations: parsedDestinations,
      };
      


      const doc = await Itinerary.create(createData);

      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      console.error("POST /itineraries error:", err);
      
      // More detailed error handling
      if (err.name === 'ValidationError') {
        const validationErrors = Object.values(err.errors).map(e => e.message);
        console.error("Validation errors:", validationErrors);
        res.status(400).json({ 
          success: false, 
          message: "Validation failed: " + validationErrors.join(", "),
          errors: validationErrors
        });
      } else {
        res.status(400).json({ success: false, message: err.message });
      }
    }
  }
);

/**
 * @swagger
 * /itineraries/{id}:
 *   put:
 *     summary: Update an existing itinerary
 *     tags: [Itineraries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Itinerary ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:       { type: string }
 *               description: { type: string }
 *               daysCount:   { type: integer }
 *               nightsCount: { type: integer }
 *               price:       { type: number, minimum: 0 }
 *               oldPrice:    { type: number, minimum: 0 }
 *               currency:    { type: string, default: USD, enum: [USD, EUR, GBP] }
 *               featured:    { type: boolean, default: false }
 *               discount:    { type: number, minimum: 0, maximum: 100, default: 0 }
 *               activityTypes:
 *                 type: array
 *                 items: { type: string }
 *               highlights:
 *                 type: array
 *                 items: { type: string }
 *               inclusions:
 *                 type: array
 *                 items: { type: string }
 *               backgroundImage:
 *                 type: string
 *                 format: binary
 *               additionalImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               days:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Day'
 *               destinations:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/DestinationRef'
 */
router.put(
  "/:id",
  protect,
  admin,
  upload.fields([
    { name: "backgroundImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const it = await Itinerary.findById(req.params.id);
      if (!it)
        return res.status(404).json({ success: false, message: "Not found." });

      // replace bg image?
      if (req.files.backgroundImage) {
        await cloudinary.uploader.destroy(it.backgroundImage.cloudinaryId);
        const bgFile = req.files.backgroundImage[0];
        // Since we're using CloudinaryStorage, the file is already uploaded to Cloudinary
        it.backgroundImage = { 
          url: bgFile.path, 
          cloudinaryId: bgFile.filename 
        };
      }
      // replace all additionals?
      if (req.files.additionalImages && req.files.additionalImages.length) {
        await Promise.all(
          it.additionalImages.map((i) =>
            cloudinary.uploader.destroy(i.cloudinaryId)
          )
        );
        // Since we're using CloudinaryStorage, the files are already uploaded to Cloudinary
        it.additionalImages = req.files.additionalImages.map((f) => ({
          url: f.path,
          cloudinaryId: f.filename,
        }));
      }

      // merge in any other fields (arrays normalized)
      ["highlights", "inclusions", "activityTypes"].forEach(
        (field) => {
          if (req.body[field] !== undefined) {
            it[field] = Array.isArray(req.body[field])
              ? req.body[field]
              : [req.body[field]].filter(Boolean);
          }
        }
      );

      // Handle complex objects with JSON parsing
      if (req.body.days !== undefined) {
        try {
          const days = Array.isArray(req.body.days) ? req.body.days : [req.body.days];
          it.days = days.map(day => {
            if (typeof day === 'string') {
              try {
                return JSON.parse(day);
              } catch (e) {
                console.error('Failed to parse day JSON in update:', day, e);
                return null;
              }
            }
            return day;
          }).filter(day => day !== null);
        } catch (error) {
          console.error('Error parsing days in update:', error);
        }
      }

      if (req.body.destinations !== undefined) {
        try {
          let destinations = req.body.destinations;
          if (!Array.isArray(destinations)) {
            destinations = [destinations]; // Convert to array
          }
          it.destinations = destinations.map(dest => {
            if (typeof dest === 'string') {
              try {
                return JSON.parse(dest);
              } catch (e) {
                console.error('Failed to parse destination JSON in update:', dest, e);
                return null;
              }
            }
            return dest;
          }).filter(dest => dest !== null);
        } catch (error) {
          console.error('Error parsing destinations in update:', error);
        }
      }

      ["title", "description", "daysCount", "nightsCount", "price", "oldPrice", "currency", "featured", "discount"].forEach((f) => {
        if (req.body[f] !== undefined) {
          if (f === 'daysCount' || f === 'nightsCount') {
            it[f] = parseInt(req.body[f]);
          } else if (f === 'price' || f === 'oldPrice' || f === 'discount') {
            it[f] = f === 'oldPrice' && (req.body[f] === '' || parseFloat(req.body[f]) <= 0) ? null : parseFloat(req.body[f]);
          } else if (f === 'featured') {
            it[f] = req.body[f] === 'true' || req.body[f] === true;
          } else {
            it[f] = req.body[f];
          }
        }
      });

      await it.save();
      res.json({ success: true, data: it });
    } catch (err) {
      console.error("PUT /itineraries error:", err);
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * @swagger
 * /itineraries/{id}:
 *   delete:
 *     summary: Delete an itinerary and its images
 *     tags: [Itineraries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Itinerary ID
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const it = await Itinerary.findById(req.params.id);
    if (!it)
      return res.status(404).json({ success: false, message: "Not found." });

    // remove images from Cloudinary
    await cloudinary.uploader.destroy(it.backgroundImage.cloudinaryId);
    await Promise.all(
      it.additionalImages.map((i) =>
        cloudinary.uploader.destroy(i.cloudinaryId)
      )
    );

    await it.deleteOne();
    res.json({ success: true, message: "Itinerary deleted." });
  } catch (err) {
    console.error("DELETE /itineraries error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete itinerary." });
  }
});

/**
 * @swagger
 * /itineraries/{id}/reviews:
 *   get:
 *     summary: Get reviews for a specific itinerary
 *     tags: [Itineraries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Itinerary ID
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *       404:
 *         description: Itinerary not found
 *       500:
 *         description: Server error
 */
router.get("/:id/reviews", async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ 
        success: false, 
        message: "Itinerary not found" 
      });
    }

    const reviews = await Review.find({ 
      subject: itinerary._id,
      status: 'approved'
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (err) {
    console.error("GET /itineraries/:id/reviews error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch reviews" 
    });
  }
});

module.exports = router;

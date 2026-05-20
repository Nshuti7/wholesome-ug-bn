// routes/destinations.js

const express = require("express");
const { v2: cloudinary } = require("cloudinary");
const Destination = require("../models/Destination");
const Itinerary = require("../models/Itinerary");
const { protect, admin } = require("../middleware/auth");
const { findItinerariesForDestination, getAllItineraryDestinations, getDestinationStats } = require("../utils/destinationUtils");
const { handleUploadOptional, handleUploadArrayOptional } = require("../middleware/handleUploadOptional");
const handleUpload = require("../middleware/handleUpload");
const upload = require("../middleware/upload");

const router = express.Router();

// ─── SWAGGER COMPONENTS ────────────────────────────────────────────────────────
/**
 * @swagger
 * tags:
 *   name: Destinations
 *   description: Manage travel destinations
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
 *     Destination:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - history
 *         - googleMapsLink
 *         - location
 *         - region
 *         - bestTimeToVisit
 *         - climate
 *         - backgroundImage
 *         - destinationType
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         history:
 *           type: string
 *         googleMapsLink:
 *           type: string
 *           format: url
 *         location:
 *           type: string
 *         region:
 *           type: string
 *         bestTimeToVisit:
 *           type: string
 *         climate:
 *           type: string
 *         latitude:
 *           type: number
 *           format: float
 *           description: Latitude coordinate for precise map location
 *         longitude:
 *           type: number
 *           format: float
 *           description: Longitude coordinate for precise map location
 *         attractions:
 *           type: array
 *           items:
 *             type: string
 *             enum:
 *               - Canopy Walk way
 *               - Gorilla trekking
 *               - Chimpanzee tracking
 *               - Safari drive
 *               - Bird watching
 *               - Nature walk
 *               - Canopy walk
 *               - Conservation tour
 *               - Forest bathing
 *               - Crater lake hike
 *               - Scenic photo stop
 *               - Sunset viewing
 *               - Panoramic lookout
 *               - Drone-friendly area
 *               - Hidden gem discovery
 *               - Nature photography
 *         wildlife:
 *           type: array
 *           items:
 *             type: string
 *             enum:
 *               - African Elephant
 *               - African Buffalo
 *               - Lion
 *               - Leopard
 *               - Cheetah
 *               - Hippopotamus
 *               - Nile Crocodile
 *               - Spotted Hyena
 *               - African Wild Dog
 *               - Warthog
 *               - Giraffe
 *               - Plains Zebra
 *               - Thomson's Gazelle
 *               - Impala
 *               - Olive Baboon
 *               - Vervet Monkey
 *               - Black-and-white Colobus
 *               - Common Chimpanzee
 *               - Mountain Gorilla
 *         destinationType:
 *           type: string
 *           enum:
 *             - National Park
 *             - Wildlife Reserve
 *             - Cultural Site
 *             - Historical Site
 *             - Adventure Park
 *             - Nature Reserve
 *             - Conservation Area
 *             - Scenic Viewpoint
 *             - Crater Lake
 *             - Forest Reserve
 *             - Mountain Range
 *             - Waterfall
 *             - Hot Springs
 *             - Cultural Village
 *             - Archaeological Site
 *             - Botanical Garden
 *           description: Type/category of the destination
 *         featured:
 *           type: boolean
 *           default: false
 *           description: Whether this destination is featured
 *         backgroundImage:
 *           $ref: '#/components/schemas/ImageObject'
 *         additionalImages:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ImageObject'
 *         facts:
 *           type: array
 *           items:
 *             type: string
 *           description: Free-form list of facts
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// ─── ROUTES ─────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /destinations:
 *   get:
 *     summary: Retrieve all destinations
 *     tags: [Destinations]
 *     responses:
 *       200:
 *         description: Array of all destinations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Destination'
 *             example:
 *               success: true
 *               count: 2
 *               data:
 *                 - _id: "507f1f77bcf86cd799439011"
 *                   name: "Bwindi Impenetrable National Park"
 *                   description: "Home to endangered mountain gorillas"
 *                   history: "Established in 1991"
 *                   googleMapsLink: "https://maps.app.goo.gl/HguhaXoVrANy6VKA7"
 *                   location: "Rwanda"
 *                   region: "South"
 *                   bestTimeToVisit: "June to September"
 *                   climate: "Tropical"
 *                   latitude: -1.2921
 *                   longitude: 36.8219
 *                   attractions: ["Gorilla trekking", "Bird watching"]
 *                   wildlife: ["Mountain Gorilla", "African Elephant"]
 *                   backgroundImage:
 *                     url: "https://example.com/image.jpg"
 *                     cloudinaryId: "wholesome/destinations/bwindi"
 *                   additionalImages: []
 *                   facts: ["UNESCO World Heritage Site"]
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 */
router.get("/", async (req, res) => {
  try {
    const data = await Destination.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("GET /destinations error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch destinations." });
  }
});

/**
 * @swagger
 * /destinations/{id}:
 *   get:
 *     summary: Retrieve a single destination by ID (plus related itineraries)
 *     tags: [Destinations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Destination ID
 *       - in: query
 *         name: debug
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include debug information
 *     responses:
 *       200:
 *         description: Destination and any itineraries that mention it
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Destination'
 *                 itineraries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       daysCount:
 *                         type: integer
 *                       nightsCount:
 *                         type: integer
 *                       description:
 *                         type: string
 *                 debug:
 *                   type: object
 *                   description: Debug information (only included if debug=true)
 *       404:
 *         description: Destination not found
 *       500:
 *         description: Server error
 */
router.get("/:id", async (req, res) => {
  try {
    const { debug = false } = req.query;
    
    const dest = await Destination.findById(req.params.id).lean();
    if (!dest) {
      return res
        .status(404)
        .json({ success: false, message: "Destination not found." });
    }

    // Use the utility function to find itineraries
    const result = await findItinerariesForDestination(dest.name, { 
      includeDebug: debug === 'true' || debug === true,
      limit: 20 
    });

    const response = {
      success: true,
      data: dest,
      itineraries: result.itineraries
    };

    // Include debug info if requested
    if (debug === 'true' || debug === true) {
      response.debug = result.debug;
    }

    res.status(200).json(response);
  } catch (err) {
    console.error("GET /destinations/:id error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch destination." });
  }
});

/**
 * @swagger
 * /destinations/debug/itinerary-destinations:
 *   get:
 *     summary: Get all destination names used in itineraries (debug endpoint)
 *     tags: [Destinations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all destination names found in itineraries
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access only
 */
router.get("/debug/itinerary-destinations", protect, admin, async (req, res) => {
  try {
    const destinationNames = await getAllItineraryDestinations();
    const stats = await getDestinationStats();
    
    res.status(200).json({
      success: true,
      data: {
        allDestinationNames: destinationNames,
        stats
      }
    });
  } catch (err) {
    console.error("GET /destinations/debug/itinerary-destinations error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch itinerary destinations." 
    });
  }
});

/**
 * @swagger
 * /destinations:
 *   post:
 *     summary: Create a new destination
 *     tags: [Destinations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - history
 *               - googleMapsLink
 *               - location
 *               - region
 *               - bestTimeToVisit
 *               - climate
 *               - backgroundImage
 *               - destinationType
 *             properties:
 *               name:            { type: string }
 *               description:     { type: string }
 *               history:         { type: string }
 *               googleMapsLink:  { type: string }
 *               location:        { type: string }
 *               region:          { type: string }
 *               bestTimeToVisit: { type: string }
 *               climate:         { type: string }
 *               latitude:        { type: number, format: float }
 *               longitude:       { type: number, format: float }
 *               destinationType: { type: string }
 *               featured:        { type: boolean, default: false }
 *               attractions:
 *                 type: array
 *                 items: { type: string }
 *               wildlife:
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
 *               facts:
 *                 type: array
 *                 items: { type: string }
 *                 description: Free-form list of facts
 *     responses:
 *       201:
 *         description: Destination created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Destination'
 *             example:
 *               success: true
 *               message: "Destination added."
 *               data:
 *                 _id: "507f1f77bcf86cd799439011"
 *                 name: "Bwindi Impenetrable National Park"
 *                 description: "Home to endangered mountain gorillas"
 *                 history: "Established in 1991"
 *                 googleMapsLink: "https://maps.app.goo.gl/HguhaXoVrANy6VKA7"
 *                 location: "Rwanda"
 *                 region: "South"
 *                 bestTimeToVisit: "June to September"
 *                 climate: "Tropical"
 *                 latitude: -1.2921
 *                 longitude: 36.8219
 *                 attractions: ["Gorilla trekking", "Bird watching"]
 *                 wildlife: ["Mountain Gorilla", "African Elephant"]
 *                 backgroundImage:
 *                   url: "https://res.cloudinary.com/example/image/upload/v123/bwindi.jpg"
 *                   cloudinaryId: "wholesome/destinations/bwindi"
 *                 additionalImages: []
 *                 facts: ["UNESCO World Heritage Site"]
 *                 createdAt: "2024-01-01T00:00:00.000Z"
 *                 updatedAt: "2024-01-01T00:00:00.000Z"
 */
router.post(
  "/",
  protect,
  admin,
  (req, res, next) => {
    upload.fields([
      { name: 'backgroundImage', maxCount: 1 },
      { name: 'additionalImages', maxCount: 5 }
    ])(req, res, (err) => {
      if (err) {
        console.error("Upload middleware error:", err);
        return res.status(400).json({ 
          success: false, 
          message: err.message || "File upload error" 
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const bgFile = req.files?.backgroundImage?.[0];
      const addFiles = req.files?.additionalImages || [];
      
      // Check if background image is provided (required)
      if (!bgFile) {
        return res.status(400).json({ 
          success: false, 
          message: "Background image is required." 
        });
      }
      
      const {
        name,
        description,
        history,
        googleMapsLink,
        location,
        region,
        bestTimeToVisit,
        climate,
        latitude,
        longitude,
        destinationType,
        featured = false,
        attractions = [],
        wildlife = [],
        facts = [],
      } = req.body;

      // Normalize enum values to match the schema
      const normalizeRegion = (region) => {
        const regionMap = {
          'north': 'North',
          'south': 'South', 
          'east': 'East',
          'west': 'West',
          'central': 'Central'
        };
        return regionMap[region?.toLowerCase()] || region;
      };

      const normalizeAttraction = (attraction) => {
        const attractionMap = {
          'safari drive': 'Safari drive',
          'safari drives': 'Safari drive'
        };
        return attractionMap[attraction?.toLowerCase()] || attraction;
      };

      const normalizedRegion = normalizeRegion(region);
      const normalizedAttractions = Array.isArray(attractions) 
        ? attractions.map(normalizeAttraction)
        : [normalizeAttraction(attractions)].filter(Boolean);
      const normalizedWildlife = Array.isArray(wildlife) 
        ? wildlife 
        : [wildlife].filter(Boolean);

      // Upload background
      const bgRes = await cloudinary.uploader.upload(bgFile.path, {
        folder: "wholesome/destinations",
        timeout: 60000, // 60 second timeout for each upload
      });

      // Upload additional images (optional)
      let addRes = [];
      if (addFiles.length > 0) {
        addRes = await Promise.all(
          addFiles.map((f) => {
            return cloudinary.uploader.upload(f.path, { 
              folder: "wholesome/destinations",
              timeout: 60000 // 60 second timeout for each upload
            });
          })
        );
      }

      const dest = await Destination.create({
        name,
        description,
        history,
        googleMapsLink,
        location,
        region: normalizedRegion,
        bestTimeToVisit,
        climate,
        latitude,
        longitude,
        destinationType,
        featured: featured === 'true' || featured === true,
        attractions: normalizedAttractions,
        wildlife: normalizedWildlife,
        facts: Array.isArray(facts) ? facts : [facts].filter(Boolean),
        backgroundImage: {
          url: bgRes.secure_url,
          cloudinaryId: bgRes.public_id,
        },
        additionalImages: addRes.map((r) => ({
          url: r.secure_url,
          cloudinaryId: r.public_id,
        })),
      });

      res
        .status(201)
        .json({ success: true, message: "Destination added.", data: dest });
    } catch (err) {
      
      // Handle validation errors
      if (err.name === 'ValidationError') {
        const validationErrors = [];
        
        if (err.errors) {
          Object.keys(err.errors).forEach(field => {
            const error = err.errors[field];
            if (error.kind === 'enum') {
              // Get the valid enum values from the model
              let validValues = [];
              if (field === 'region') {
                validValues = ["North", "South", "East", "West", "Central"];
              } else if (field === 'attractions') {
                validValues = [
                  "Canopy Walk way", "Gorilla trekking", "Chimpanzee tracking", 
                  "Safari drive", "Bird watching", "Nature walk", "Canopy walk", 
                  "Conservation tour", "Forest bathing", "Crater lake hike", 
                  "Scenic photo stop", "Sunset viewing", "Panoramic lookout", 
                  "Drone-friendly area", "Hidden gem discovery", "Nature photography"
                ];
              } else if (field === 'wildlife') {
                validValues = [
                  "African Elephant", "African Buffalo", "Lion", "Leopard", 
                  "Cheetah", "Hippopotamus", "Nile Crocodile", "Spotted Hyena", 
                  "African Wild Dog", "Warthog", "Giraffe", "Plains Zebra", 
                  "Thomson's Gazelle", "Impala", "Olive Baboon", "Vervet Monkey", 
                  "Black-and-white Colobus", "Common Chimpanzee", "Mountain Gorilla"
                ];
              } else if (field === 'destinationType') {
                validValues = [
                  "National Park", "Wildlife Reserve", "Cultural Site", 
                  "Historical Site", "Adventure Park", "Nature Reserve", 
                  "Conservation Area", "Scenic Viewpoint", "Crater Lake", 
                  "Forest Reserve", "Mountain Range", "Waterfall", 
                  "Hot Springs", "Cultural Village", "Archaeological Site", 
                  "Botanical Garden"
                ];
              }
              
              validationErrors.push(`${field}: "${error.value}" is not valid. Valid values are: ${validValues.join(', ')}`);
            } else {
              validationErrors.push(`${field}: ${error.message}`);
            }
          });
        }
        
        return res.status(400).json({ 
          success: false, 
          message: "Validation failed", 
          errors: validationErrors 
        });
      }
      
      // Handle specific Cloudinary upload errors
      if (err.message?.includes('timeout') || err.code === 'ECONNABORTED') {
        return res.status(408).json({ 
          success: false, 
          message: "Upload timed out. Please try again with smaller images or check your internet connection." 
        });
      }
      
      if (err.http_code === 413 || err.message?.includes('file size')) {
        return res.status(413).json({ 
          success: false, 
          message: "Files are too large. Please use images smaller than 5MB each." 
        });
      }
      
      if (err.http_code === 401) {
        return res.status(401).json({ 
          success: false, 
          message: "Cloudinary authentication failed. Please check your API credentials." 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Failed to add destination. Please try again." 
      });
    }
  }
);

/**
 * @swagger
 * /destinations/{id}:
 *   put:
 *     summary: Update an existing destination (images & facts optional)
 *     tags: [Destinations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Destination ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:            { type: string }
 *               description:     { type: string }
 *               history:         { type: string }
 *               googleMapsLink:  { type: string }
 *               location:        { type: string }
 *               region:          { type: string }
 *               bestTimeToVisit: { type: string }
 *               climate:         { type: string }
 *               latitude:        { type: number, format: float }
 *               longitude:       { type: number, format: float }
 *               destinationType: { type: string }
 *               featured:        { type: boolean, default: false }
 *               attractions:
 *                 type: array
 *                 items: { type: string }
 *               wildlife:
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
 *               facts:
 *                 type: array
 *                 items: { type: string }
 */
router.put(
  "/:id",
  protect,
  admin,
  handleUploadOptional("backgroundImage"),
  handleUploadArrayOptional("additionalImages", 5),
  async (req, res) => {
    try {
      let dest = await Destination.findById(req.params.id);
      if (!dest) {
        return res
          .status(404)
          .json({ success: false, message: "Destination not found." });
      }

      // Replace backgroundImage if provided
      if (req.file) {
        await cloudinary.uploader.destroy(dest.backgroundImage.cloudinaryId);
        const bgRes = await cloudinary.uploader.upload(
          req.file.path,
          { folder: "wholesome/destinations" }
        );
        req.body.backgroundImage = {
          url: bgRes.secure_url,
          cloudinaryId: bgRes.public_id,
        };
      }

      // Replace additionalImages if provided
      if (req.files && req.files.length) {
        await Promise.all(
          dest.additionalImages.map((img) =>
            cloudinary.uploader.destroy(img.cloudinaryId)
          )
        );
        const newAdds = await Promise.all(
          req.files.map((f) =>
            cloudinary.uploader.upload(f.path, {
              folder: "wholesome/destinations",
            })
          )
        );
        req.body.additionalImages = newAdds.map((r) => ({
          url: r.secure_url,
          cloudinaryId: r.public_id,
        }));
      }

      // Normalize arrays
      ["attractions", "wildlife", "facts"].forEach((field) => {
        if (req.body[field] && !Array.isArray(req.body[field])) {
          req.body[field] = [req.body[field]];
        }
      });

      dest = await Destination.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      res
        .status(200)
        .json({ success: true, message: "Destination updated.", data: dest });
    } catch (err) {
      console.error("PUT /destinations error:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to update destination." });
    }
  }
);

/**
 * @swagger
 * /destinations/{id}:
 *   delete:
 *     summary: Delete a destination and all its images
 *     tags: [Destinations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Destination ID
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       404:
 *         description: Destination not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const dest = await Destination.findById(req.params.id);
    if (!dest) {
      return res
        .status(404)
        .json({ success: false, message: "Destination not found." });
    }

    await cloudinary.uploader.destroy(dest.backgroundImage.cloudinaryId);
    await Promise.all(
      dest.additionalImages.map((img) =>
        cloudinary.uploader.destroy(img.cloudinaryId)
      )
    );

    await dest.deleteOne();
    res.status(200).json({ success: true, message: "Destination deleted." });
  } catch (err) {
    console.error("DELETE /destinations error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete destination." });
  }
});

/**
 * @swagger
 * /destinations/tours/{destinationName}:
 *   get:
 *     summary: Get tours that visit a specific destination
 *     tags: [Destinations]
 *     parameters:
 *       - in: path
 *         name: destinationName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the destination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of tours to return
 *     responses:
 *       200:
 *         description: Tours that visit the destination
 *       404:
 *         description: Destination not found
 */
router.get("/tours/:destinationName", async (req, res) => {
  try {
    const { destinationName } = req.params;
    const { limit = 10 } = req.query;

    // Find tours that mention this destination
    const result = await findItinerariesForDestination(destinationName, { 
      limit: parseInt(limit),
      includeDebug: false 
    });

    // Transform the data to include more tour details for frontend cards
    const toursWithDetails = result.itineraries.map(tour => ({
      _id: tour._id,
      title: tour.title,
      description: tour.description,
      daysCount: tour.daysCount,
      nightsCount: tour.nightsCount,
      highlights: tour.highlights,
      destinations: tour.destinations,
      // Add slug for frontend routing
      slug: tour.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      // Add background image if available (you might need to fetch this separately)
      backgroundImage: tour.backgroundImage || null
    }));

    res.status(200).json({
      success: true,
      data: toursWithDetails,
      count: toursWithDetails.length
    });
  } catch (err) {
    console.error("GET /destinations/tours/:destinationName error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch tours for destination." 
    });
  }
});

module.exports = router;

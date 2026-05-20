/**
 * @swagger
 * tags:
 *   name: Team
 *   description: Manage team members
 */

const express = require("express");
const { v2: cloudinary } = require("cloudinary");
const TeamMember = require("../models/TeamMember");
const { protect, admin } = require("../middleware/auth");
const handleUploadArray = require("../middleware/handleUploadArray");
const { handleUploadArrayOptional } = require("../middleware/handleUploadOptional");

const router = express.Router();

/**
 * @swagger
 * /team:
 *   get:
 *     summary: Get all team members, grouped by category
 *     tags: [Team]
 *     responses:
 *       200:
 *         description: Members grouped by category
 */
router.get("/", async (req, res) => {
  try {
    const members = await TeamMember.find()
      .sort({ category: 1, createdAt: -1 })
      .lean();

    const grouped = members.reduce((acc, m) => {
      acc[m.category] = acc[m.category] || [];
      acc[m.category].push(m);
      return acc;
    }, {});

    res.status(200).json({ success: true, data: grouped });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch team members." });
  }
});

/**
 * @swagger
 * /team/{category}:
 *   get:
 *     summary: Get all team members in a single category
 *     tags: [Team]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: One of the defined categories
 *     responses:
 *       200:
 *         description: List of members in that category
 *       404:
 *         description: Category not found
 */
router.get("/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const members = await TeamMember.find({ category })
      .sort({ createdAt: -1 })
      .lean();

    if (!members.length) {
      return res
        .status(404)
        .json({ success: false, message: "No members in that category." });
    }

    res
      .status(200)
      .json({ success: true, count: members.length, data: members });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch members." });
  }
});

/**
 * @swagger
 * /team:
 *   post:
 *     summary: Create a new team member
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - position
 *               - bio
 *               - linkedIn
 *               - category
 *               - image
 *             properties:
 *               fullName:
 *                 type: string
 *               position:
 *                 type: string
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 description: Brief biographical information about the team member
 *               linkedIn:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum:
 *                   - Interns
 *                   - Partners
 *                   - Advisory Board
 *                   - Alumni
 *                   - Ambassadors
 *                   - Support Staff
 *                   - Field Officers
 *                   - Fellows
 *                   - Associates
 *                   - Researchers
 *                   - Project Teams
 *                   - Committees
 *                   - Task Forces
 *                   - Service Providers
 *                   - Vendors
 *                   - Investors
 *                   - Shareholders
 *                   - Trainers
 *                   - Mentors
 *                   - Contractors
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Member created
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  protect,
  admin,
  handleUploadArray("image", 1),
  async (req, res) => {
    try {
      const file = req.files[0];
      const { fullName, position, bio, linkedIn, category } = req.body;

      // Since we're using CloudinaryStorage, the file is already uploaded to Cloudinary
      // and contains the URL and public_id in the file object
      const member = await TeamMember.create({
        fullName,
        position,
        bio,
        linkedIn,
        category,
        image: file.path, // This is the Cloudinary URL
        cloudinaryId: file.filename, // This is the Cloudinary public_id
      });

      res
        .status(201)
        .json({ success: true, message: "Team member added.", data: member });
    } catch (err) {
      console.error("Team POST error:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to add team member." });
    }
  }
);

/**
 * @swagger
 * /team/{id}:
 *   put:
 *     summary: Update a team member
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team member ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               position:
 *                 type: string
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 description: Brief biographical information about the team member
 *               linkedIn:
 *                 type: string
 *               category:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Member updated
 *       404:
 *         description: Member not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  protect,
  admin,
  handleUploadArrayOptional("image", 1),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { fullName, position, bio, linkedIn, category } = req.body;
      
      const member = await TeamMember.findById(id);
      if (!member) {
        return res
          .status(404)
          .json({ success: false, message: "Team member not found" });
      }

      const updateData = {
        fullName,
        position,
        bio,
        linkedIn,
        category,
      };

      // Handle image upload if provided
      if (req.files && req.files.length > 0) {
        const file = req.files[0];
        
        // Delete old image from Cloudinary
        if (member.cloudinaryId) {
          await cloudinary.uploader.destroy(member.cloudinaryId);
        }

        // Since we're using CloudinaryStorage, the file is already uploaded to Cloudinary
        updateData.image = file.path; // This is the Cloudinary URL
        updateData.cloudinaryId = file.filename; // This is the Cloudinary public_id
      }
      // If no file is uploaded, keep the existing image (no changes needed)

      const updatedMember = await TeamMember.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: "Team member updated successfully",
        data: updatedMember,
      });
    } catch (err) {
      console.error("Team PUT error:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to update team member" });
    }
  }
);

/**
 * @swagger
 * /team/{id}:
 *   delete:
 *     summary: Delete a team member by ID
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team member ID
 *     responses:
 *       200:
 *         description: Member deleted
 *       404:
 *         description: Member not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    await cloudinary.uploader.destroy(member.cloudinaryId);
    await member.deleteOne();

    res.status(200).json({ success: true, message: "Team member deleted." });
  } catch (err) {
    console.error("Team DELETE error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete member." });
  }
});

module.exports = router;

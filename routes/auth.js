const express = require("express");
const upload = require("../middleware/upload");
const {
  refreshToken,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  logoutAll,
} = require("../controllers/authController");
const {
  login,
  getMe,
  updateUser,
  updatePassword,
  register,
} = require("../controllers/authController");
const { protect, admin } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Admin authentication and profile management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new admin user (TEMPORARY - Disable after use)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admin user registered
 *       400:
 *         description: User already exists or invalid input
 */
// router.post("/register", register); // Uncomment only when needed

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in as an admin
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in successfully, token returned
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", authLimiter, login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the current logged-in admin's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile returned
 *       401:
 *         description: Unauthorized
 */
router.get("/me", protect, getMe);

/**
 * @swagger
 * /auth/update:
 *   put:
 *     summary: Update admin name, email, or profile image
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error or bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access only
 */

router.put(
  "/update",
  protect,
  admin,
  upload.single("profileImage"),
  updateUser,
);

/**
 * @swagger
 * /auth/update-password:
 *   put:
 *     summary: Change the admin password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       401:
 *         description: Incorrect current password
 */
router.put("/update-password", protect, admin, updatePassword);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset code via email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *     responses:
 *       200:
 *         description: OTP sent to email
 *       400:
 *         description: Missing or invalid email / rate limit error
 *       404:
 *         description: User not found
 */
router.post("/forgot-password", authLimiter, forgotPassword);

/**
 * @swagger
 * /auth/verify-code:
 *   post:
 *     summary: Verify the OTP code sent to email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *               otp:
 *                 type: string
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: OTP verified, password can be reset
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/verify-code", authLimiter, verifyOtp);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password after OTP verification
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: NewSecurePass123
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid request
 *       404:
 *         description: User not found
 */
router.post("/reset-password", authLimiter, resetPassword);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out the currently authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 *       400:
 *         description: Something went wrong
 */
router.post("/logout", protect, logout);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access and refresh tokens using the cookie-based refresh token
 *     tags: [Auth]
 *     description: >
 *       Reissues new access and refresh tokens if the provided refresh token (from cookies) is valid and the session exists in Redis.
 *       The old session is invalidated (rotation), and a new session is created.
 *     responses:
 *       200:
 *         description: New access and refresh tokens issued (in cookies)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged in successfully"
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: No refresh token cookie provided
 *       403:
 *         description: Invalid or expired refresh token
 */

router.post("/refresh-token", refreshToken);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Logout from all sessions (all devices)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out from all devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out from all devices
 *       401:
 *         description: Unauthorized (invalid or expired token)
 *       500:
 *         description: Server error
 */

router.post("/logout-all", protect, logoutAll);

module.exports = router;

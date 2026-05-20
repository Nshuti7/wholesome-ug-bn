// controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const sendEmail = require("../utils/sendMail");
const passwordChangeTemplate = require("../templates/email/passwordChangeTemplate");
const {
  checkOtpRestriction,
  trackOtpRequest,
  sendOtp,
  verifyOtp,
} = require("../utils/otpUtils");
const redis = require("../utils/redisClient");

const {
  getSession,
  deleteSession,
  sendTokenResponse,
  invalidateAllUserSessions,
  getCookieOptions,
} = require("../utils/tokenUtils");

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "User already exists" });
    }
    const user = await User.create({ name, email, password, role: "admin" });
    await sendTokenResponse(user, 201, res, req);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    await sendTokenResponse(user, 200, res, req);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) {
    return res.status(400).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const session = await getSession(decoded.jti);
    if (!session || session.refreshToken !== token) {
      return res
        .status(403)
        .json({ message: "Invalid or expired refresh token" });
    }
    await deleteSession(decoded.jti);
    const fakeUser = { _id: decoded.id };
    await sendTokenResponse(fakeUser, 200, res, req);
  } catch (err) {
    console.error("Refresh token error:", err.message);
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const updateData = { name, email };
    if (req.file?.path) updateData.profileImage = req.file.path;
    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select("+password");
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(403).json({ message: "Current password is incorrect" });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    await checkOtpRestriction(email);
    await trackOtpRequest(email);
    await sendOtp(user.name, email);
    res.json({ message: "OTP sent to your email." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }
    await verifyOtp(email, otp);
    res.json({ message: "OTP verified. You can now reset your password." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email and new password are required" });
    }
    const isVerified = await redis.get(`otp_verified:${email}`);
    const otpExists = await redis.get(`otp:${email}`);
    if (!isVerified) {
      const msg = otpExists
        ? "You have not yet verified your OTP. Please check your email and verify."
        : "You must request and verify an OTP before resetting your password.";
      return res.status(403).json({ message: msg });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({
        message: "New password must be different from the old password",
      });
    }
    user.password = newPassword;
    await user.save();
    await invalidateAllUserSessions(user._id.toString());
    await redis.del(`otp_verified:${email}`);
    const timestamp = new Date().toLocaleString();
    await sendEmail(
      user.email,
      "Your password has been changed",
      "Your password was changed. If this wasn't you, contact support.",
      passwordChangeTemplate(user.name, user._id.toString(), timestamp)
    );
    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(400).json({ message: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const sessionId = req.user.sessionId;
    if (!sessionId) {
      return res.status(400).json({ message: "No session ID found" });
    }
    await deleteSession(sessionId);
    // Clear both cookies with shared options
    const opts = getCookieOptions();
    res.clearCookie("access_token", opts);
    res.clearCookie("refresh_token", opts);
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err.message);
    res.status(400).json({ message: err.message });
  }
};

exports.logoutAll = async (req, res) => {
  try {
    await invalidateAllUserSessions(req.user.id);
    const opts = getCookieOptions();
    res.clearCookie("access_token", opts);
    res.clearCookie("refresh_token", opts);
    res.json({ message: "Logged out from all devices" });
  } catch (err) {
    console.error("Logout all error:", err.message);
    res.status(500).json({ message: "Something went wrong" });
  }
};

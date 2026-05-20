const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getSession } = require("../utils/tokenUtils");

const protect = async (req, res, next) => {
  try {
    const token =
      req.cookies?.access_token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const sessionId = decoded.jti;

    const session = await getSession(sessionId);
    if (!session || session.userId !== decoded.id) {
      return res.status(401).json({ message: "Session invalid or expired" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    req.user.sessionId = sessionId;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      if (process.env.NODE_ENV !== "production") {
        console.log("[dev] Access token expired – handled by refresh logic");
      }
    } else {
      console.error("Auth error:", err.message);
    }

    res.status(401).json({ message: "Token invalid or expired" });
  }
};

const admin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

module.exports = { protect, admin };

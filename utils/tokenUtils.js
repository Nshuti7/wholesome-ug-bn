const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const redis = require("./redisClient");

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;

/**
 * Build cookie options based on env.
 * @param {{maxAge?: number}} opts
 */
function getCookieOptions({ maxAge } = {}) {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  };
  if (typeof maxAge === "number") {
    base.maxAge = maxAge;
  }
  return base;
}

const sendTokenResponse = async (user, statusCode, res, req) => {
  const sessionId = uuidv4();

  const accessToken = jwt.sign(
    { id: user._id, jti: sessionId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user._id, jti: sessionId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // Store session in Redis - THIS IS A CRITICAL STEP
  try {
    await storeSession(sessionId, {
      userId: user._id.toString(),
      accessToken,
      refreshToken,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      createdAt: Date.now(),
    });
  } catch (redisError) {
    console.error("🔴 CRITICAL: Failed to store session in Redis.", redisError);
    // Do not send tokens if the session could not be created.
    return res.status(500).json({ message: "Session storage failed. Cannot log in." });
  }

  res.cookie(
    "access_token",
    accessToken,
    getCookieOptions({ maxAge: 1000 * 60 * 15 }) // 15 minutes
  );
  res.cookie(
    "refresh_token",
    refreshToken,
    getCookieOptions({ maxAge: 1000 * 60 * 60 * 24 * 7 }) // 7 days
  );

  const payload = { success: true, message: "Logged in successfully" };
  if (process.env.NODE_ENV !== "production") {
    payload.accessToken = accessToken;
    payload.refreshToken = refreshToken;
  }

  res.status(statusCode).json(payload);
};

const storeSession = async (sessionId, sessionData) => {
  const key = `session:${sessionId}`;
  const ttl = 60 * 60 * 24 * 7; // 7 days
  await redis.set(key, JSON.stringify(sessionData), "EX", ttl);
  await redis.sadd(`user_sessions:${sessionData.userId}`, sessionId);
};

const getSession = async (sessionId) => {
  const data = await redis.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
};

const deleteSession = async (sessionId) => {
  const sessionKey = `session:${sessionId}`;
  const sessionData = await getSession(sessionId);
  await redis.del(sessionKey);
  if (sessionData?.userId) {
    await redis.srem(`user_sessions:${sessionData.userId}`, sessionId);
  }
};

const invalidateAllUserSessions = async (userId) => {
  const key = `user_sessions:${userId}`;
  try {
    const sessionIds = await redis.smembers(key);
    if (sessionIds.length) {
      const keysToDelete = sessionIds.map((id) => `session:${id}`);
      await redis.del(...keysToDelete);
    }
    await redis.del(key);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev] All sessions invalidated for user ${userId}`);
    }
  } catch (err) {
    console.error(`[redis] Failed to invalidate sessions for ${userId}:`, err);
  }
};

module.exports = {
  sendTokenResponse,
  storeSession,
  getSession,
  deleteSession,
  invalidateAllUserSessions,
  getCookieOptions,
};

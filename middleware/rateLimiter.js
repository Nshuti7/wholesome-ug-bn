const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redisClient = require("../utils/redisClient");

// Build a Redis-backed store so rate-limit counters are shared across every
// backend instance (Dokploy replicas, restarts) instead of living in a single
// process's memory. Each limiter gets its own key prefix to avoid collisions.
//
// `sendCommand` resolves the shared ioredis client lazily on every call, so it
// works even though the limiters are constructed before Redis finishes
// connecting. If Redis is unreachable the call throws and `passOnStoreError`
// (set on each limiter below) lets the request through — rate limiting degrades
// instead of taking the whole API down, matching the rest of the codebase.
function redisStore(prefix) {
  const store = new RedisStore({
    prefix,
    sendCommand: (...args) => {
      if (!redisClient.redis) {
        throw new Error("Redis client not ready");
      }
      return redisClient.redis.call(...args);
    },
  });

  // RedisStore fires `SCRIPT LOAD` in its constructor, before Redis has
  // finished connecting. The shared client runs with enableOfflineQueue:false,
  // so those commands reject immediately and — being uncaught — would trip the
  // process-level unhandledRejection handler at startup. The script SHAs are
  // reloaded lazily on first use (see rate-limit-redis retryableIncrement), so
  // swallowing this one-time startup rejection is safe.
  Promise.resolve(store.incrementScriptSha).catch(() => {});
  Promise.resolve(store.getScriptSha).catch(() => {});

  return store;
}

// Shared defaults: standard RateLimit-* headers, fail-open on store errors.
const base = {
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
};

// General rate limiter (kept for backwards compatibility / ad-hoc use).
const limiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  store: redisStore("rl:gen:"),
});

// Global limiter applied to every /api route. Generous enough for normal
// browsing and admin dashboard usage, but caps abusive bursts.
const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests / 15 min per IP
  message: "Too many requests from this IP, please try again later.",
  store: redisStore("rl:api:"),
});

// Brute-force guard for credential endpoints (login + password reset flow).
// Successful logins are not counted so a working admin is never locked out.
const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 failed attempts / 15 min per IP
  message: "Too many authentication attempts. Please try again later.",
  skipSuccessfulRequests: true,
  store: redisStore("rl:auth:"),
});

// Stricter rate limiter for form submissions
const formSubmissionLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 form submissions per 15 minutes
  message: "Too many form submissions from this IP, please try again later.",
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  store: redisStore("rl:form:"),
});

// Very strict rate limiter for sensitive operations
const strictLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 attempts per hour
  message: "Too many attempts from this IP, please try again later.",
  store: redisStore("rl:strict:"),
});

module.exports = {
  limiter,
  apiLimiter,
  authLimiter,
  formSubmissionLimiter,
  strictLimiter,
};

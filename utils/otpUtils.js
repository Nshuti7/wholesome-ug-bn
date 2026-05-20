const crypto = require("crypto");
const redis = require("./redisClient");
const sendEmail = require("./sendMail");
const generateOtpTemplate = require("../templates/email/otpTemplate");

//  Prevent brute force abuse
const checkOtpRestriction = async (email) => {
  if (await redis.get(`otp_lock:${email}`)) {
    throw new Error("Too many failed attempts. Try again in 30 minutes.");
  }
  if (await redis.get(`otp_spam_lock:${email}`)) {
    throw new Error("Too many OTP requests. Try again in 1 hour.");
  }
  if (await redis.get(`otp_cooldown:${email}`)) {
    throw new Error("Wait a minute before requesting another OTP.");
  }
};

//  Track OTP requests
const trackOtpRequest = async (email) => {
  const countKey = `otp_request_count:${email}`;
  let count = parseInt((await redis.get(countKey)) || "0");

  if (count >= 2) {
    await redis.set(`otp_spam_lock:${email}`, "locked", "EX", 3600); // 1 hour lock
    throw new Error("Too many OTP requests. Try again in 1 hour.");
  }

  await redis.set(countKey, count + 1, "EX", 3600); // reset every 1 hour
};

//  Generate and send OTP via email
const sendOtp = async (name, email) => {
  const otp = crypto.randomInt(1000, 9999).toString();

  const message = `Hello ${name},\n\nYour password reset code is: ${otp}.\nIt is valid for 5 minutes.`;
  const html = generateOtpTemplate(name, otp);

  await sendEmail(email, "Reset Your Password", message, html);
  await redis.set(`otp:${email}`, otp, "EX", 300); // 5 minutes
  await redis.set(`otp_cooldown:${email}`, "true", "EX", 60); // 1 minute cooldown
};

//  Validate OTP and set password reset flag
const verifyOtp = async (email, otp) => {
  const storedOtp = await redis.get(`otp:${email}`);
  const failKey = `otp_attempts:${email}`;

  if (!storedOtp) throw new Error("OTP expired or invalid");

  let failed = parseInt((await redis.get(failKey)) || "0");

  if (otp !== storedOtp) {
    if (failed >= 2) {
      await redis.set(`otp_lock:${email}`, "locked", "EX", 1800); // 30 min lock
      await redis.del(`otp:${email}`, failKey);
      throw new Error(
        "Too many failed attempts. Account locked for 30 minutes."
      );
    }
    await redis.set(failKey, failed + 1, "EX", 1800);
    throw new Error(`Incorrect OTP. ${2 - failed} attempts left.`);
  }

  await redis.del(`otp:${email}`, failKey);

  //  Mark user as verified for password reset
  await redis.set(`otp_verified:${email}`, "true", "EX", 600); // 10 min
};

module.exports = {
  checkOtpRestriction,
  trackOtpRequest,
  sendOtp,
  verifyOtp,
};

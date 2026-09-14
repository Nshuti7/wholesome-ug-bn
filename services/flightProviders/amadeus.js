// Amadeus Self-Service — flight offers search.
//
// Needs a developer account at https://developers.amadeus.com. The test
// environment is free and serves cached, non-bookable fares, which is all an
// indicative figure requires. Production needs a paid plan.
//
// Signup asks for company details and is sometimes rejected; see
// ./travelpayouts.js for the provider with the lighter onboarding.

const axios = require("axios");
const redisClient = require("../../utils/redisClient");

const TOKEN_KEY = "flight:amadeus:token:v1";
const TOKEN_TTL_SECONDS = 25 * 60; // tokens live ~30 min; renew early
const REQUEST_TIMEOUT_MS = 15000;

function baseUrl() {
  return process.env.AMADEUS_ENV === "production"
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com";
}

function isConfigured() {
  return Boolean(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
}

async function getAccessToken() {
  const cached = await redisClient.get(TOKEN_KEY);
  if (cached) return cached;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.AMADEUS_CLIENT_ID,
    client_secret: process.env.AMADEUS_CLIENT_SECRET,
  });

  const res = await axios.post(`${baseUrl()}/v1/security/oauth2/token`, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: REQUEST_TIMEOUT_MS,
  });

  const token = res.data?.access_token;
  if (!token) throw new Error("Amadeus token response had no access_token");

  const ttl = Math.min(TOKEN_TTL_SECONDS, Number(res.data.expires_in || TOKEN_TTL_SECONDS) - 60);
  await redisClient.set(TOKEN_KEY, token, Math.max(ttl, 60));
  return token;
}

/**
 * Cheapest priced offer in an Amadeus flight-offers payload.
 * Pure, so it can be tested without a network call.
 */
function pickCheapest(payload) {
  const offers = Array.isArray(payload?.data) ? payload.data : [];
  let cheapest = null;

  for (const offer of offers) {
    const total = Number(offer?.price?.grandTotal ?? offer?.price?.total);
    if (!Number.isFinite(total) || total <= 0) continue;
    if (!cheapest || total < cheapest.amount) {
      cheapest = {
        amount: total,
        currency: offer?.price?.currency || "USD",
        carrier: offer?.validatingAirlineCodes?.[0] || null,
      };
    }
  }

  return cheapest;
}

/**
 * One origin, one month. Amadeus prices specific dates, so we ask for the
 * sample departure/return the caller chose.
 * Returns null when there is no offer — an ordinary outcome on thin routes.
 */
async function sample({ originAirport, destinationCode, departureDate, returnDate }) {
  const token = await getAccessToken();

  const res = await axios.get(`${baseUrl()}/v2/shopping/flight-offers`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: REQUEST_TIMEOUT_MS,
    params: {
      originLocationCode: originAirport,
      destinationLocationCode: destinationCode,
      departureDate,
      returnDate,
      adults: 1,
      travelClass: "ECONOMY",
      currencyCode: "USD",
      max: 5,
    },
  });

  return pickCheapest(res.data);
}

module.exports = {
  id: "amadeus",
  label: "Amadeus Self-Service",
  isConfigured,
  sample,
  pickCheapest,
};

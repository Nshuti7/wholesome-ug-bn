// Travelpayouts (Aviasales) flight-prices API.
//
// Why this provider exists alongside Amadeus: signup is an ordinary account at
// https://travelpayouts.com — no company vetting, no GDS onboarding — and the
// API token is issued immediately from the dashboard (Developers → API tokens).
// Amadeus' signup rejects small operators often enough that we needed a path
// that does not depend on it.
//
// It is an affiliate network, so the same token also lets you earn commission on
// bookings made through their links. We do not use the links here — we only read
// prices — but that is why the data is free.
//
// It also fits what we actually want better than Amadeus does: this API prices
// a WHOLE MONTH in one call, which is exactly the "from $X in December" figure
// the site shows. Amadeus prices specific dates, so we have to pick a sample day
// and hope it is representative.
//
// Response shapes have varied across their API versions, so pickCheapest below
// accepts every field name we have seen rather than assuming one.

const axios = require("axios");

const BASE_URL = "https://api.travelpayouts.com";
const REQUEST_TIMEOUT_MS = 15000;

function isConfigured() {
  return Boolean(process.env.TRAVELPAYOUTS_TOKEN);
}

/**
 * Cheapest entry in a Travelpayouts prices payload.
 * Pure, so it can be tested without a network call.
 *
 * Accepts `price` (v3) or `value` (v1/v2), and tolerates the payload being
 * either an array or an object keyed by date.
 */
function pickCheapest(payload, fallbackCurrency = "USD") {
  const raw = payload?.data;
  const rows = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : [];

  let cheapest = null;

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const amount = Number(row.price ?? row.value);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (!cheapest || amount < cheapest.amount) {
      cheapest = {
        amount,
        currency: String(payload?.currency || fallbackCurrency).toUpperCase(),
        carrier: row.airline || row.gate || null,
      };
    }
  }

  return cheapest;
}

// The API answers 200 with success:false for a bad token or bad params, so a
// failure has to be read out of the body, not the status code.
function assertAccepted(payload, endpoint) {
  if (payload && payload.success === false) {
    throw new Error(
      `Travelpayouts rejected ${endpoint}: ${payload.error || "no reason given"}`
    );
  }
}

// Current endpoint. Takes a bare "YYYY-MM" for departure_at/return_at, which
// asks for the cheapest fare anywhere in that month — a true monthly floor
// rather than one sampled day.
async function sampleV3({ originAirport, destinationCode, month, returnMonth }) {
  const res = await axios.get(`${BASE_URL}/aviasales/v3/prices_for_dates`, {
    headers: { "X-Access-Token": process.env.TRAVELPAYOUTS_TOKEN },
    timeout: REQUEST_TIMEOUT_MS,
    params: {
      origin: originAirport,
      destination: destinationCode,
      departure_at: month,
      return_at: returnMonth || month,
      currency: "usd",
      sorting: "price",
      direct: false,
      one_way: false,
      limit: 30,
      page: 1,
    },
  });

  assertAccepted(res.data, "v3/prices_for_dates");
  return pickCheapest(res.data);
}

// Older calendar endpoint, kept as a fallback because their v1 and v3 surfaces
// have coexisted for years and accounts have not always had the same access to
// both. Different parameter names (departure_date, not departure_at), token in
// the query rather than a header, a required calendar_type, and a currency that
// defaults to RUB if you forget to ask for USD.
async function sampleV1({ originAirport, destinationCode, month, tripNights }) {
  const res = await axios.get(`${BASE_URL}/v1/prices/calendar`, {
    timeout: REQUEST_TIMEOUT_MS,
    params: {
      origin: originAirport,
      destination: destinationCode,
      departure_date: month,
      calendar_type: "departure_date",
      length: tripNights,
      currency: "usd",
      token: process.env.TRAVELPAYOUTS_TOKEN,
    },
  });

  assertAccepted(res.data, "v1/prices/calendar");
  // This endpoint answers with data keyed by date rather than an array;
  // pickCheapest handles both shapes.
  return pickCheapest(res.data, "USD");
}

/**
 * One origin, one month.
 *
 * Tries the current endpoint, then the older one. We have no way to know from
 * here which surface a given token is entitled to, and finding out by failing
 * the whole nightly refresh would be a poor trade — so if the first attempt
 * errors, the second gets a turn, and only both failing is a failure. The first
 * error is kept in the message because it is usually the more informative one.
 */
async function sample(args) {
  try {
    return await sampleV3(args);
  } catch (v3Error) {
    try {
      return await sampleV1(args);
    } catch (v1Error) {
      throw new Error(`v3: ${v3Error.message} | v1: ${v1Error.message}`);
    }
  }
}

module.exports = {
  id: "travelpayouts",
  label: "Travelpayouts (Aviasales)",
  isConfigured,
  sample,
  pickCheapest,
  // Exported for diagnostics: probe one surface at a time when `sample` reports
  // that both failed.
  sampleV3,
  sampleV1,
};

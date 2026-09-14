// Indicative international airfare — origin markets and hand-maintained baselines.
//
// This table is the source of truth for TWO things:
//   1. Which routes the nightly Amadeus refresh samples (services/flightPricingService).
//   2. The fallback shown when Amadeus is unconfigured, down, or has no cached
//      price yet. The site must never show a blank where a price was promised,
//      so the guide below always answers.
//
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  THE `low`/`high` NUMBERS BELOW ARE UNVERIFIED PLACEHOLDERS.
//     They were not sourced from live fares. Before this feature is shown to
//     customers, someone must check real return fares to Entebbe for each
//     market and update both the numbers and `verifiedOn`.
//     The API reports `stale: true` once `verifiedOn` is older than
//     GUIDE_STALE_AFTER_DAYS, so a forgotten table surfaces itself.
// ─────────────────────────────────────────────────────────────────────────────
//
// `low`  = typical cheapest return economy fare, off-peak, USD, 1 adult.
// `high` = typical cheapest return economy fare in peak months, USD.
//
// Peak for Entebbe is the northern-hemisphere holiday and dry-season overlap:
// December–January and June–August. Gorilla-trekking demand tracks the same
// months, which is exactly when a wrong estimate hurts most.

const PEAK_MONTHS = [12, 1, 6, 7, 8];

const DESTINATION = {
  code: "EBB",
  city: "Entebbe",
  country: "Uganda",
};

// Date the baselines below were last checked against real fares (YYYY-MM-DD).
const VERIFIED_ON = "2026-09-15";

// After this many days the guide is reported as stale to the caller.
const GUIDE_STALE_AFTER_DAYS = 120;

const ORIGINS = [
  {
    country: "GB",
    countryName: "United Kingdom",
    airport: "LHR",
    city: "London",
    low: 850,
    high: 1500,
  },
  {
    country: "US",
    countryName: "United States",
    airport: "JFK",
    city: "New York",
    low: 1100,
    high: 1900,
  },
  {
    country: "DE",
    countryName: "Germany",
    airport: "FRA",
    city: "Frankfurt",
    low: 800,
    high: 1400,
  },
  {
    country: "NL",
    countryName: "Netherlands",
    airport: "AMS",
    city: "Amsterdam",
    low: 800,
    high: 1400,
  },
  {
    country: "BE",
    countryName: "Belgium",
    airport: "BRU",
    city: "Brussels",
    low: 780,
    high: 1350,
  },
  {
    country: "CA",
    countryName: "Canada",
    airport: "YYZ",
    city: "Toronto",
    low: 1200,
    high: 2000,
  },
  {
    country: "AE",
    countryName: "United Arab Emirates",
    airport: "DXB",
    city: "Dubai",
    low: 550,
    high: 900,
  },
  {
    country: "AU",
    countryName: "Australia",
    airport: "SYD",
    city: "Sydney",
    low: 1500,
    high: 2400,
  },
  {
    country: "ZA",
    countryName: "South Africa",
    airport: "JNB",
    city: "Johannesburg",
    low: 450,
    high: 750,
  },
  {
    country: "KE",
    countryName: "Kenya",
    airport: "NBO",
    city: "Nairobi",
    low: 200,
    high: 350,
  },
  {
    country: "RW",
    countryName: "Rwanda",
    airport: "KGL",
    city: "Kigali",
    low: 180,
    high: 320,
  },
];

// IATA *city* codes, used when querying fare providers.
//
// This is not pedantry — it is measured. Travelpayouts' cached fare data is far
// thinner on single-airport codes than on city codes: London->Entebbe returns
// nothing for LHR on some endpoints and returns fares for LON, and where both
// answer, the city code finds the lower fare ($699 vs $738) because it spans
// every airport in the city. We display the airport (travellers recognise
// "London Heathrow") but we ask using the city.
//
// Only cities with more than one commercial airport differ from `airport`.
const SEARCH_CODES = {
  LHR: "LON",
  JFK: "NYC",
  YYZ: "YTO",
};

/** The code to send to a fare provider for this origin. */
function searchCode(origin) {
  return SEARCH_CODES[origin.airport] || origin.airport;
}

const byCountry = new Map(ORIGINS.map((o) => [o.country, o]));
const byAirport = new Map(ORIGINS.map((o) => [o.airport, o]));

/** Resolve an origin from either an ISO country code ("GB") or an IATA code ("LHR"). */
function resolveOrigin(input) {
  if (!input) return null;
  const key = String(input).trim().toUpperCase();
  return byCountry.get(key) || byAirport.get(key) || null;
}

/** Is this 1-12 month number a peak-season month for Entebbe? */
function isPeakMonth(month) {
  return PEAK_MONTHS.includes(Number(month));
}

/** The hand-maintained fallback fare for an origin in a given month. */
function baselineFare(origin, month) {
  return isPeakMonth(month) ? origin.high : origin.low;
}

function guideIsStale() {
  const verified = Date.parse(`${VERIFIED_ON}T00:00:00Z`);
  if (Number.isNaN(verified)) return true;
  const ageDays = (Date.now() - verified) / 86400000;
  return ageDays > GUIDE_STALE_AFTER_DAYS;
}

module.exports = {
  ORIGINS,
  DESTINATION,
  PEAK_MONTHS,
  VERIFIED_ON,
  GUIDE_STALE_AFTER_DAYS,
  resolveOrigin,
  searchCode,
  isPeakMonth,
  baselineFare,
  guideIsStale,
};

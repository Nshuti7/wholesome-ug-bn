// services/flightPricingService.js
//
// Indicative international airfare to Entebbe.
//
// Design rule, and the reason this file is shaped the way it is:
//
//   A visitor request NEVER calls the flight-price provider.
//
// Reads are served from Redis, populated by a background refresh. That keeps us
// inside the provider's quota no matter how much traffic the site gets, keeps
// page response times off a third party's latency, and means a provider outage
// degrades to the hand-maintained guide in config/flightOrigins instead of to an
// error. The cache TTL is deliberately longer than the refresh interval so a
// couple of failed refreshes in a row still leave a price on the page.
//
// The provider itself is swappable — see services/flightProviders. Nothing below
// knows which one is active.
//
// What we show is a FLOOR ("from $X"), not a quote. Fares to EBB swing hard by
// season, so we round UP to the nearest $10 — overstating the floor slightly is
// the safe direction to be wrong in when a customer is budgeting.

const redisClient = require("../utils/redisClient");
const { getProvider, describeProviders } = require("./flightProviders");
const {
  ORIGINS,
  DESTINATION,
  resolveOrigin,
  searchCode,
  isPeakMonth,
  baselineFare,
  guideIsStale,
  VERIFIED_ON,
} = require("../config/flightOrigins");

const CACHE_VERSION = "v1";
const CACHE_PREFIX = `flight:est:${CACHE_VERSION}`;
const REFRESH_LOCK_KEY = `flight:refresh:lock:${CACHE_VERSION}`;

// Cache a sampled fare for 8 days; the refresh runs daily, so this survives a
// week of failures before the guide takes over.
const FARE_TTL_SECONDS = 8 * 24 * 60 * 60;

// How far ahead we sample. Six months covers the booking window a tour operator
// actually sees without ballooning the per-refresh call count.
const MONTHS_AHEAD = 6;

// Trip length used when sampling a return fare — matches the 7-day package.
const SAMPLE_TRIP_NIGHTS = 7;

// Day of month to sample. Mid-month avoids both the month-end price cliff and
// the holiday spikes sitting at the very start and end of December.
const SAMPLE_DAY = 15;

/** "2026-12" for a Date, in UTC. */
function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Parse "2026-12" into { year, month }, or null if malformed. */
function parseMonthKey(value) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(value || "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/** The next MONTHS_AHEAD months, starting with the current one. */
function upcomingMonths() {
  const out = [];
  const now = new Date();
  for (let i = 0; i < MONTHS_AHEAD; i += 1) {
    out.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1))));
  }
  return out;
}

function cacheKey(airport, month) {
  return `${CACHE_PREFIX}:${airport}:${month}`;
}

/** Round up to the nearest $10 — see the "floor" note at the top of the file. */
function roundUpTo10(amount) {
  return Math.ceil(Number(amount) / 10) * 10;
}

/* ── Provider sampling ────────────────────────────────────── */

/**
 * Cheapest return economy fare for one origin in one month, via the active
 * provider. Returns null when the provider has no offer for the route — a real
 * outcome on thin routes, and not an error.
 *
 * Providers differ in what they price: Travelpayouts takes a month and returns
 * that month's floor; Amadeus takes exact dates. We pass both, and each provider
 * uses what it understands.
 */
async function sampleFare(origin, month) {
  const provider = getProvider();
  if (!provider) return null;

  const parsed = parseMonthKey(month);
  if (!parsed) throw new Error(`Bad month key: ${month}`);

  const departure = new Date(Date.UTC(parsed.year, parsed.month - 1, SAMPLE_DAY));
  const ret = new Date(departure.getTime() + SAMPLE_TRIP_NIGHTS * 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);

  const fare = await provider.sample({
    originAirport: searchCode(origin),
    destinationCode: DESTINATION.code,
    month,
    returnMonth: monthKey(ret),
    departureDate: iso(departure),
    returnDate: iso(ret),
    tripNights: SAMPLE_TRIP_NIGHTS,
  });

  if (!fare) return null;

  // Guard against a provider answering in a currency we did not ask for: a
  // number in the wrong currency is worse than no number, and converting here
  // would invent a rate.
  const currency = String(fare.currency || "USD").toUpperCase();
  if (currency !== "USD") {
    throw new Error(`${provider.id} returned ${currency}, expected USD`);
  }

  return {
    amount: roundUpTo10(fare.amount),
    currency: "USD",
    carrier: fare.carrier || null,
    provider: provider.id,
  };
}

/* ── Read path (what the website calls) ───────────────────────────────────── */

/**
 * Indicative fare for one origin/month. Cache-only: never calls the provider.
 * Always resolves to something displayable.
 */
async function getEstimate(originInput, monthInput) {
  const origin = resolveOrigin(originInput);
  if (!origin) return null;

  const month = parseMonthKey(monthInput) ? String(monthInput).trim() : monthKey(new Date());
  const { month: monthNumber } = parseMonthKey(month);

  // Origin fields are named exactly as /flights/origins names them, so a caller
  // can match an estimate to the entry in its own origin list by field, not by
  // remembering that one endpoint prefixes them and the other does not.
  const base = {
    country: origin.country,
    countryName: origin.countryName,
    airport: origin.airport,
    city: origin.city,
    destination: DESTINATION.code,
    destinationCity: DESTINATION.city,
    month,
    peakSeason: isPeakMonth(monthNumber),
    currency: "USD",
    tripNights: SAMPLE_TRIP_NIGHTS,
  };

  const cached = await redisClient.get(cacheKey(origin.airport, month));
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Number.isFinite(parsed?.amount)) {
        return {
          ...base,
          amount: parsed.amount,
          carrier: parsed.carrier || null,
          agency: parsed.agency || null,
          departDate: parsed.departDate || null,
          foundAt: parsed.foundAt || null,
          source: parsed.provider || "provider",
          sampledAt: parsed.sampledAt || null,
          stale: false,
        };
      }
    } catch {
      // A corrupt cache entry is not worth failing a page render over — fall
      // through to the guide below.
    }
  }

  return {
    ...base,
    amount: baselineFare(origin, monthNumber),
    carrier: null,
    agency: null,
    departDate: null,
    foundAt: null,
    source: "guide",
    sampledAt: VERIFIED_ON,
    stale: guideIsStale(),
  };
}

/** Estimates for every configured origin in one month — powers a comparison table. */
async function getEstimatesForMonth(monthInput) {
  const month = parseMonthKey(monthInput) ? String(monthInput).trim() : monthKey(new Date());
  return Promise.all(ORIGINS.map((o) => getEstimate(o.airport, month)));
}

/**
 * Every origin x every upcoming month, in one payload.
 *
 * This exists so the website can prerender the whole guide as static HTML and
 * let the visitor switch country and month with no further network calls —
 * which is how the rest of the site is cached, and it keeps a per-visitor
 * concern (where they live) off the server entirely.
 */
async function getGuideMatrix() {
  const months = upcomingMonths();
  const rows = await Promise.all(
    months.map(async (month) => ({
      month,
      estimates: await getEstimatesForMonth(month),
    }))
  );
  return { months, rows };
}

/* ── Write path (background only) ─────────────────────────────────────────── */

/**
 * Sample every origin x upcoming month and cache the results.
 * Serialised and gently paced: these APIs rate-limit hard, and this job has all
 * night to finish. A failure on one route leaves that route's previous cache
 * entry (or the guide) in place rather than blanking it.
 */
/** Write one sampled fare into the cache. */
async function cacheFare(origin, month, fare) {
  await redisClient.set(
    cacheKey(origin.airport, month),
    JSON.stringify({ ...fare, sampledAt: new Date().toISOString() }),
    FARE_TTL_SECONDS
  );
}

/**
 * Refresh one origin using a provider that can return a whole year at once.
 * One request covers every month, so this is both cheaper and better covered
 * than asking month by month — see travelpayouts.sampleYear for the measurements.
 */
async function refreshOriginByYear(provider, origin, months, result) {
  const byMonth = await provider.sampleYear({
    originAirport: searchCode(origin),
    destinationCode: DESTINATION.code,
  });

  let wrote = 0;

  for (const month of months) {
    const fare = byMonth[month];
    if (!fare) continue;

    const currency = String(fare.currency || "USD").toUpperCase();
    if (currency !== "USD") {
      throw new Error(`${provider.id} returned ${currency} for ${month}, expected USD`);
    }

    await cacheFare(origin, month, {
      amount: roundUpTo10(fare.amount),
      currency: "USD",
      carrier: fare.carrier || null,
      agency: fare.agency || null,
      provider: provider.id,
      departDate: fare.departDate || null,
      foundAt: fare.foundAt || null,
    });
    wrote += 1;
  }

  result.updated += wrote;
  // Months this origin had no data for keep whatever they had — a previous
  // sample, or the hand-maintained baseline. Never blanked.
  result.noOffers += months.length - wrote;
  return wrote;
}

/** Refresh one origin one month at a time, for providers that price single dates. */
async function refreshOriginByMonth(provider, origin, months, result) {
  for (const month of months) {
    try {
      const fare = await sampleFare(origin, month);
      if (!fare) {
        result.noOffers += 1;
      } else {
        await cacheFare(origin, month, fare);
        result.updated += 1;
      }
    } catch (err) {
      result.failed += 1;
      if (result.errors.length < 5) {
        result.errors.push(`${origin.airport}/${month}: ${err.message}`);
      }
    }
    // Pace requests so a full refresh cannot trip the provider's rate limit.
    await new Promise((r) => setTimeout(r, 250));
  }
}

/**
 * Sample every origin and cache what comes back.
 *
 * Prefers a provider's whole-year method when it has one: one request per origin
 * instead of one per origin per month, with better coverage. Falls back to
 * month-by-month for providers that only price specific dates.
 *
 * A failure on one origin leaves that origin's previous cache entries (or the
 * baseline) in place rather than blanking them.
 */
async function refreshAll({ reason = "manual" } = {}) {
  const provider = getProvider();
  if (!provider) {
    return { ok: false, skipped: "no-provider-configured", reason };
  }

  const months = upcomingMonths();
  const started = Date.now();
  const byYear = typeof provider.sampleYear === "function";
  const result = {
    reason,
    provider: provider.id,
    strategy: byYear ? "year-per-origin" : "month-by-month",
    attempted: 0,
    updated: 0,
    noOffers: 0,
    failed: 0,
    errors: [],
  };

  for (const origin of ORIGINS) {
    result.attempted += months.length;

    if (byYear) {
      try {
        await refreshOriginByYear(provider, origin, months, result);
      } catch (err) {
        result.failed += months.length;
        if (result.errors.length < 5) {
          result.errors.push(`${origin.airport}: ${err.message}`);
        }
      }
      await new Promise((r) => setTimeout(r, 250));
    } else {
      await refreshOriginByMonth(provider, origin, months, result);
    }
  }

  result.ok = result.failed < result.attempted;
  result.durationMs = Date.now() - started;
  console.log(
    `[flights] refresh (${reason}, ${provider.id}, ${result.strategy}): ` +
      `${result.updated} updated, ${result.noOffers} no-data, ` +
      `${result.failed} failed in ${Math.round(result.durationMs / 1000)}s`
  );
  return result;
}

/**
 * Start the daily refresh.
 *
 * Opt-in via FLIGHT_PRICING_REFRESH_ENABLED so that only one deployment — not
 * every developer's laptop — spends the quota. The Redis lock is a best-effort
 * guard against duplicate work when more than one replica is running; a rare
 * double refresh costs quota but produces the same result, so a simple
 * get-then-set is enough here.
 */
function startScheduledRefresh() {
  if (process.env.FLIGHT_PRICING_REFRESH_ENABLED !== "true") return null;
  const provider = getProvider();
  if (!provider) {
    console.log("[flights] refresh enabled but no provider is configured — staying on the guide");
    return null;
  }

  const intervalMs = 24 * 60 * 60 * 1000;

  const tick = async () => {
    try {
      const holder = await redisClient.get(REFRESH_LOCK_KEY);
      if (holder) return;
      // Lock for less than the interval so a crashed run self-heals.
      await redisClient.set(REFRESH_LOCK_KEY, String(process.pid), 20 * 60 * 60);
      await refreshAll({ reason: "scheduled" });
    } catch (err) {
      console.error("[flights] scheduled refresh error:", err.message);
    }
  };

  // Delay the boot run so it does not compete with startup work.
  const boot = setTimeout(tick, 60 * 1000);
  if (boot.unref) boot.unref();
  const timer = setInterval(tick, intervalMs);
  if (timer.unref) timer.unref();
  console.log(`[flights] daily indicative-fare refresh scheduled via ${provider.label}`);
  return timer;
}

/**
 * Sample one route live and report what came back, without writing to the cache.
 * This is the "is my new token working?" check — a full refresh takes minutes and
 * spends quota on every route to answer the same question.
 */
async function probeProvider({ origin = "LHR", month } = {}) {
  const providers = describeProviders();
  const target = resolveOrigin(origin);

  if (!target) return { ...providers, ok: false, error: `Unknown origin: ${origin}` };
  if (!providers.active) return { ...providers, ok: false, error: "No provider configured" };

  const targetMonth = parseMonthKey(month) ? String(month).trim() : upcomingMonths()[1];

  try {
    const fare = await sampleFare(target, targetMonth);
    return {
      ...providers,
      ok: true,
      route: `${target.airport}-${DESTINATION.code}`,
      month: targetMonth,
      result: fare || "no offers for this route/month",
    };
  } catch (err) {
    return {
      ...providers,
      ok: false,
      route: `${target.airport}-${DESTINATION.code}`,
      month: targetMonth,
      error: err.message,
    };
  }
}

module.exports = {
  getEstimate,
  getEstimatesForMonth,
  getGuideMatrix,
  refreshAll,
  startScheduledRefresh,
  describeProviders,
  probeProvider,
  upcomingMonths,
  monthKey,
  parseMonthKey,
  roundUpTo10,
};

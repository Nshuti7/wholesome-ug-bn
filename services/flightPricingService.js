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
// leaves the last good numbers on the page instead of an error. The cache TTL is
// deliberately longer than the refresh interval so a couple of failed refreshes
// in a row still leave a price up.
//
// The provider is swappable — see services/flightProviders. Nothing here knows
// which one is active.
//
// THREE TIERS, AND NO INVENTED NUMBERS
//
//   1. live   — a fare the provider found for this market and this month.
//   2. market — this market's own cheapest fare from a NEARBY month, labelled
//               with the month it was for. Coverage is monthly and patchy: we
//               often hold four real Paris fares and none for the month being
//               viewed. Skipping straight to the region there threw away the
//               best information we had and made every European country show
//               one identical figure.
//   3. region — the median of live fares from this market's region that month.
//   4. none   — we have nothing, so we show no number and offer to confirm it.
//
// There is deliberately no hand-written price table any more. The one we had was
// out by up to 61% against live fares, and wrong in the worst way: an invented
// December figure sitting beside a real November one read as seasonal insight.
//
// What we show is a FLOOR ("from $X"), not a quote, rounded UP to the nearest $10
// — overstating the floor slightly is the safe direction to be wrong in when
// somebody is budgeting.

const redisClient = require("../utils/redisClient");
const { getProvider, describeProviders } = require("./flightProviders");
const {
  ORIGINS,
  DESTINATION,
  resolveOrigin,
  isPeakMonth,
  allRegions,
} = require("../config/flightOrigins");

// Bumped to v2: entries are keyed by country now, not by display airport, and
// carry a different shape. Starting a fresh namespace is cheaper than migrating
// and avoids serving half-old half-new data during a deploy.
const CACHE_VERSION = "v2";
const CACHE_PREFIX = `flight:est:${CACHE_VERSION}`;
const REGION_PREFIX = `flight:region:${CACHE_VERSION}`;
const BEST_PREFIX = `flight:best:${CACHE_VERSION}`;
const REFRESH_LOCK_KEY = `flight:refresh:lock:${CACHE_VERSION}`;

// Cache a sampled fare for 8 days; the refresh runs daily, so this survives a
// week of failures before a market goes quiet.
const FARE_TTL_SECONDS = 8 * 24 * 60 * 60;

// How far ahead we publish. Six months covers the booking window a tour operator
// actually sees.
const MONTHS_AHEAD = 6;

// Trip length the fares describe — matches the 7-day package.
const SAMPLE_TRIP_NIGHTS = 7;

// Day of month used by providers that price exact dates rather than months.
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

function cacheKey(country, month) {
  return `${CACHE_PREFIX}:${country}:${month}`;
}

function bestKey(country) {
  return `${BEST_PREFIX}:${country}`;
}

function regionKey(region, month) {
  return `${REGION_PREFIX}:${region.replace(/\s+/g, "-")}:${month}`;
}

/** Round up to the nearest $10 — see the "floor" note at the top of the file. */
function roundUpTo10(amount) {
  return Math.ceil(Number(amount) / 10) * 10;
}

/** "2027-01" -> "January 2027", for caveats a traveller has to read. */
function monthName(month) {
  const parsed = parseMonthKey(month);
  if (!parsed) return month;
  return new Date(Date.UTC(parsed.year, parsed.month - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function median(numbers) {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/* ── Provider sampling ────────────────────────────────────────────────────── */

/**
 * Cheapest fare for one market in one month, for providers that price exact
 * dates. Tries each of the market's search cities and keeps the cheapest.
 */
async function sampleFare(origin, month) {
  const provider = getProvider();
  if (!provider) return null;

  const parsed = parseMonthKey(month);
  if (!parsed) throw new Error(`Bad month key: ${month}`);

  const departure = new Date(Date.UTC(parsed.year, parsed.month - 1, SAMPLE_DAY));
  const ret = new Date(departure.getTime() + SAMPLE_TRIP_NIGHTS * 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);

  let best = null;

  for (const code of origin.searchCodes) {
    const fare = await provider.sample({
      originAirport: code,
      destinationCode: DESTINATION.code,
      month,
      returnMonth: monthKey(ret),
      departureDate: iso(departure),
      returnDate: iso(ret),
      tripNights: SAMPLE_TRIP_NIGHTS,
    });
    if (!fare) continue;

    const currency = String(fare.currency || "USD").toUpperCase();
    if (currency !== "USD") {
      throw new Error(`${provider.id} returned ${currency}, expected USD`);
    }
    if (!best || fare.amount < best.amount) best = { ...fare, searchCode: code };
  }

  if (!best) return null;

  return {
    amount: roundUpTo10(best.amount),
    currency: "USD",
    carrier: best.carrier || null,
    agency: best.agency || null,
    provider: provider.id,
    searchCode: best.searchCode,
  };
}

/* ── Read path (what the website calls) ───────────────────────────────────── */

function describeOrigin(origin, month, monthNumber) {
  return {
    country: origin.country,
    countryName: origin.countryName,
    airport: origin.airport,
    city: origin.city,
    region: origin.region,
    destination: DESTINATION.code,
    destinationCity: DESTINATION.city,
    month,
    peakSeason: isPeakMonth(monthNumber),
    currency: "USD",
    tripNights: SAMPLE_TRIP_NIGHTS,
  };
}

// Every estimate carries these keys whatever its basis, so a caller never has to
// check which shape it got back.
const EMPTY_FARE = {
  amount: null,
  carrier: null,
  agency: null,
  departDate: null,
  foundAt: null,
  sampledAt: null,
  basisNote: null,
  basisSampleSize: null,
  basisMonth: null,
};

/**
 * Indicative fare for one market/month. Cache-only: never calls the provider.
 *
 * `amount` is null when we have nothing — callers must handle that rather than
 * printing a zero.
 */
async function getEstimate(originInput, monthInput) {
  const origin = resolveOrigin(originInput);
  if (!origin) return null;

  const month = parseMonthKey(monthInput) ? String(monthInput).trim() : monthKey(new Date());
  const { month: monthNumber } = parseMonthKey(month);
  const base = describeOrigin(origin, month, monthNumber);

  // 1. A fare for this exact market and month.
  const cached = await redisClient.get(cacheKey(origin.country, month));
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Number.isFinite(parsed?.amount)) {
        return {
          ...base,
          ...EMPTY_FARE,
          amount: parsed.amount,
          carrier: parsed.carrier || null,
          agency: parsed.agency || null,
          departDate: parsed.departDate || null,
          foundAt: parsed.foundAt || null,
          sampledAt: parsed.sampledAt || null,
          source: parsed.provider || "provider",
          basis: "live",
        };
      }
    } catch {
      // A corrupt entry is not worth failing a page render over — fall through.
    }
  }

  // 2. This market's own cheapest fare from another month in the window. More
  // specific, and more useful, than a regional average — and it is still a fare
  // somebody actually found, so long as we say which month it was for.
  const best = await redisClient.get(bestKey(origin.country));
  if (best) {
    try {
      const parsed = JSON.parse(best);
      if (Number.isFinite(parsed?.amount) && parsed.month !== month) {
        return {
          ...base,
          ...EMPTY_FARE,
          amount: parsed.amount,
          carrier: parsed.carrier || null,
          agency: parsed.agency || null,
          departDate: parsed.departDate || null,
          foundAt: parsed.foundAt || null,
          sampledAt: parsed.sampledAt || null,
          source: parsed.provider || "provider",
          basis: "market",
          basisMonth: parsed.month,
          basisNote:
            `Cheapest we have seen from ${origin.city}, for a ${monthName(parsed.month)} ` +
            `departure. We have no ${monthName(month)} fare yet.`,
        };
      }
    } catch {
      // Fall through to the region.
    }
  }

  // 3. The region's median for this month, built from real fares elsewhere.
  const regional = await redisClient.get(regionKey(origin.region, month));
  if (regional) {
    try {
      const parsed = JSON.parse(regional);
      if (Number.isFinite(parsed?.amount)) {
        return {
          ...base,
          ...EMPTY_FARE,
          amount: parsed.amount,
          sampledAt: parsed.sampledAt || null,
          source: parsed.provider || "provider",
          basis: "region",
          basisNote: `Typical for ${origin.region}. We have no fare from ${origin.city} itself this month.`,
          basisSampleSize: parsed.sampleSize || null,
        };
      }
    } catch {
      // Same as above.
    }
  }

  // 4. Nothing. Say so; do not invent.
  return {
    ...base,
    ...EMPTY_FARE,
    source: null,
    basis: "none",
    basisNote: "No live fare for this route yet — ask us and we will confirm it with your quote.",
  };
}

/** Estimates for every configured market in one month. */
async function getEstimatesForMonth(monthInput) {
  const month = parseMonthKey(monthInput) ? String(monthInput).trim() : monthKey(new Date());
  return Promise.all(ORIGINS.map((o) => getEstimate(o.country, month)));
}

/**
 * Every market x every upcoming month, in one payload.
 *
 * Lets the website prerender the whole guide as static HTML and switch country
 * or month with no further network call — which is how the rest of the site is
 * cached, and it keeps a per-visitor concern (where they live) off the server.
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

async function cacheFare(origin, month, fare) {
  await redisClient.set(
    cacheKey(origin.country, month),
    JSON.stringify({ ...fare, sampledAt: new Date().toISOString() }),
    FARE_TTL_SECONDS
  );
}

/**
 * Refresh one market using a provider that returns a whole year at once.
 *
 * Asks every search city for this country and keeps the cheapest per month. This
 * is why a market stores a LIST of cities: "NYC" returns nothing for Entebbe
 * while Atlanta, Boston and Los Angeles return fares, so asking only the obvious
 * city would write off the entire US market as unserved.
 */
async function refreshOriginByYear(provider, origin, months, result) {
  const merged = {};

  for (const code of origin.searchCodes) {
    let byMonth;
    try {
      byMonth = await provider.sampleYear({
        originAirport: code,
        destinationCode: DESTINATION.code,
      });
    } catch (err) {
      // One bad city should not cost the country its other cities.
      result.failed += 1;
      if (result.errors.length < 8) {
        result.errors.push(`${origin.country}/${code}: ${err.message}`);
      }
      continue;
    }

    for (const [month, fare] of Object.entries(byMonth)) {
      const currency = String(fare.currency || "USD").toUpperCase();
      if (currency !== "USD") continue;
      if (!merged[month] || fare.amount < merged[month].amount) {
        merged[month] = { ...fare, searchCode: code };
      }
    }

    // Pace requests so a full refresh cannot trip the provider's rate limit.
    await new Promise((r) => setTimeout(r, 120));
  }

  let wrote = 0;
  for (const month of months) {
    const fare = merged[month];
    if (!fare) continue;
    await cacheFare(origin, month, {
      amount: roundUpTo10(fare.amount),
      currency: "USD",
      carrier: fare.carrier || null,
      agency: fare.agency || null,
      provider: provider.id,
      departDate: fare.departDate || null,
      foundAt: fare.foundAt || null,
      searchCode: fare.searchCode || null,
    });
    wrote += 1;
  }

  // Keep the cheapest fare across EVERY month the provider returned, including
  // months beyond the six we publish.
  //
  // Measured reason: Madrid's only fare to Entebbe was for a departure ten months
  // out, and Sao Paulo's only fare was likewise outside the window. Both were
  // being discarded, so Spain fell back to a Europe-wide median and Brazil showed
  // nothing at all — while we held a real fare from each city. The nearby-month
  // tier already states which month a fare was for, so a distant one is honest;
  // a generic regional figure in its place is less informative, not more.
  //
  // Capped at a year out: past that the fare says more about how far ahead the
  // airline has loaded its schedule than about what the trip costs.
  const horizon = monthKey(new Date(Date.now() + 365 * 86400000));
  let best = null;
  for (const [month, fare] of Object.entries(merged)) {
    if (month > horizon) continue;
    if (!best || fare.amount < best.amount) best = { ...fare, month };
  }
  if (best) {
    await redisClient.set(
      bestKey(origin.country),
      JSON.stringify({
        amount: roundUpTo10(best.amount),
        currency: "USD",
        carrier: best.carrier || null,
        agency: best.agency || null,
        provider: provider.id,
        departDate: best.departDate || null,
        foundAt: best.foundAt || null,
        month: best.month,
        sampledAt: new Date().toISOString(),
      }),
      FARE_TTL_SECONDS
    );
    result.marketBests += 1;
  }

  result.updated += wrote;
  // Months with no data keep whatever they had, or fall through to the region.
  result.noData += months.length - wrote;
  return wrote;
}

/** Refresh one market month by month, for providers that price single dates. */
async function refreshOriginByMonth(provider, origin, months, result) {
  for (const month of months) {
    try {
      const fare = await sampleFare(origin, month);
      if (!fare) {
        result.noData += 1;
      } else {
        await cacheFare(origin, month, fare);
        result.updated += 1;
      }
    } catch (err) {
      result.failed += 1;
      if (result.errors.length < 8) {
        result.errors.push(`${origin.country}/${month}: ${err.message}`);
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

/**
 * For each market, record its cheapest live fare across the window and the month
 * it was for.
 *
 * Only used for providers that price single dates. The whole-year path writes a
 * better value itself, because it can see fares beyond the months we publish.
 *
 * Precomputed rather than worked out on read: getEstimate is called 49 markets x
 * 6 months to build the guide, and scanning every market's months on each of
 * those would turn one cache read into seven.
 */
async function buildMarketBests(months, result) {
  for (const origin of ORIGINS) {
    let best = null;

    for (const month of months) {
      const raw = await redisClient.get(cacheKey(origin.country, month));
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (!Number.isFinite(parsed?.amount)) continue;
        if (!best || parsed.amount < best.amount) best = { ...parsed, month };
      } catch {
        // Ignore unreadable entries.
      }
    }

    if (best) {
      await redisClient.set(bestKey(origin.country), JSON.stringify(best), FARE_TTL_SECONDS);
      result.marketBests += 1;
    }
  }
}

/**
 * After sampling, build each region's median fare per month from the live fares
 * just written. This is what markets with no data of their own fall back to, so
 * every number the site shows traces back to a fare somebody actually found.
 *
 * Median rather than minimum: one unusually cheap fare from one city should not
 * set the expectation for a whole region.
 */
async function buildRegionMedians(provider, months, result) {
  for (const region of allRegions()) {
    const inRegion = ORIGINS.filter((o) => o.region === region);

    for (const month of months) {
      const amounts = [];

      for (const origin of inRegion) {
        const raw = await redisClient.get(cacheKey(origin.country, month));
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (Number.isFinite(parsed?.amount)) amounts.push(parsed.amount);
        } catch {
          // Ignore unreadable entries when averaging.
        }
      }

      // One data point is an anecdote, not a regional typical figure.
      if (amounts.length < 2) continue;

      await redisClient.set(
        regionKey(region, month),
        JSON.stringify({
          amount: roundUpTo10(median(amounts)),
          sampleSize: amounts.length,
          provider: provider.id,
          sampledAt: new Date().toISOString(),
        }),
        FARE_TTL_SECONDS
      );
      result.regionsBuilt += 1;
    }
  }
}

/** How many markets have at least one live fare in the published window. */
async function countMarketsWithData(months) {
  let n = 0;
  for (const origin of ORIGINS) {
    for (const month of months) {
      if (await redisClient.get(cacheKey(origin.country, month))) {
        n += 1;
        break;
      }
    }
  }
  return n;
}

/**
 * Sample every market and cache what comes back.
 *
 * Prefers a provider's whole-year method when it has one: one request per search
 * city instead of one per city per month, with better coverage. A failure on one
 * market leaves that market's previous entries in place rather than blanking them.
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
    strategy: byYear ? "year-per-city" : "month-by-month",
    markets: ORIGINS.length,
    attempted: ORIGINS.length * months.length,
    updated: 0,
    noData: 0,
    failed: 0,
    regionsBuilt: 0,
    marketBests: 0,
    errors: [],
  };

  for (const origin of ORIGINS) {
    if (byYear) {
      await refreshOriginByYear(provider, origin, months, result);
    } else {
      await refreshOriginByMonth(provider, origin, months, result);
    }
  }

  if (!byYear) await buildMarketBests(months, result);
  await buildRegionMedians(provider, months, result);

  result.marketsWithData = await countMarketsWithData(months);
  result.ok = result.updated > 0;
  result.durationMs = Date.now() - started;

  console.log(
    `[flights] refresh (${reason}, ${provider.id}, ${result.strategy}): ` +
      `${result.updated} fares, ${result.marketBests} market bests, ` +
      `${result.regionsBuilt} region medians, ` +
      `${result.marketsWithData}/${ORIGINS.length} markets covered, ` +
      `${result.failed} failed in ${Math.round(result.durationMs / 1000)}s`
  );
  return result;
}

/**
 * Coverage report: which markets have live fares, which lean on their region,
 * and which have nothing. This is the number to watch — it is the honest answer
 * to "is this actually working?".
 */
async function getCoverage() {
  const months = upcomingMonths();
  const rows = [];

  for (const origin of ORIGINS) {
    // Counted with explicit names rather than spreading a { live, region, none }
    // object: a key called `region` there would overwrite the region NAME on the
    // row, silently turning "Western Europe" into a count.
    let liveMonths = 0;
    let marketMonths = 0;
    let regionMonths = 0;
    let noneMonths = 0;
    let cheapest = null;

    for (const month of months) {
      const e = await getEstimate(origin.country, month);
      if (e.basis === "live") {
        liveMonths += 1;
        if (cheapest === null || e.amount < cheapest) cheapest = e.amount;
      } else if (e.basis === "market") {
        marketMonths += 1;
      } else if (e.basis === "region") {
        regionMonths += 1;
      } else {
        noneMonths += 1;
      }
    }

    rows.push({
      country: origin.country,
      countryName: origin.countryName,
      city: origin.city,
      region: origin.region,
      searchCodes: origin.searchCodes,
      cheapestLive: cheapest,
      liveMonths,
      marketMonths,
      regionMonths,
      noneMonths,
    });
  }

  return {
    months,
    markets: ORIGINS.length,
    withLive: rows.filter((r) => r.liveMonths > 0).length,
    regionOnly: rows.filter((r) => r.liveMonths === 0 && r.regionMonths > 0).length,
    empty: rows.filter((r) => r.noneMonths === r.liveMonths + r.marketMonths + r.regionMonths + r.noneMonths).length,
    rows: rows.sort(
      (a, b) => b.liveMonths - a.liveMonths || a.countryName.localeCompare(b.countryName)
    ),
  };
}

/**
 * Start the daily refresh.
 *
 * Opt-in via FLIGHT_PRICING_REFRESH_ENABLED so only one deployment spends the
 * quota. The Redis lock is a best-effort guard against duplicate work across
 * replicas; a rare double refresh costs quota but produces the same result, so a
 * simple get-then-set is enough.
 */
function startScheduledRefresh() {
  if (process.env.FLIGHT_PRICING_REFRESH_ENABLED !== "true") return null;

  const provider = getProvider();
  if (!provider) {
    console.log("[flights] refresh enabled but no provider is configured — skipping");
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

  const boot = setTimeout(tick, 60 * 1000);
  if (boot.unref) boot.unref();
  const timer = setInterval(tick, intervalMs);
  if (timer.unref) timer.unref();
  console.log(`[flights] daily indicative-fare refresh scheduled via ${provider.label}`);
  return timer;
}

/**
 * Sample one route live and report what came back, without writing to the cache.
 * The "is my token working?" check — a full refresh takes minutes and spends
 * quota on every market to answer the same question.
 */
async function probeProvider({ origin = "GB", month } = {}) {
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
      route: `${target.searchCodes.join("/")} -> ${DESTINATION.code}`,
      month: targetMonth,
      result: fare || "no offers for this route/month",
    };
  } catch (err) {
    return {
      ...providers,
      ok: false,
      route: `${target.searchCodes.join("/")} -> ${DESTINATION.code}`,
      month: targetMonth,
      error: err.message,
    };
  }
}

module.exports = {
  getEstimate,
  getEstimatesForMonth,
  getGuideMatrix,
  getCoverage,
  refreshAll,
  startScheduledRefresh,
  describeProviders,
  probeProvider,
  upcomingMonths,
  monthKey,
  parseMonthKey,
  roundUpTo10,
};

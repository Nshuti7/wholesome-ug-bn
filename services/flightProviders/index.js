// Which flight-price provider to use.
//
// Set FLIGHT_PRICING_PROVIDER to pick one explicitly. Left unset, we take
// whichever is actually configured, preferring Travelpayouts: its token is
// self-serve, its data is free, and it prices a whole month in one call.
//
// When none is configured this resolves to null and the service serves the
// hand-maintained guide in config/flightOrigins.js. That is a supported state,
// not a broken one — the site always has a number to show.

const travelpayouts = require("./travelpayouts");
const amadeus = require("./amadeus");

const PROVIDERS = [travelpayouts, amadeus];

function getProvider() {
  const requested = (process.env.FLIGHT_PRICING_PROVIDER || "").trim().toLowerCase();

  if (requested === "none") return null;

  if (requested) {
    const match = PROVIDERS.find((p) => p.id === requested);
    if (!match) {
      console.warn(
        `[flights] FLIGHT_PRICING_PROVIDER="${requested}" is not a known provider ` +
          `(${PROVIDERS.map((p) => p.id).join(", ")}) — serving the guide instead`
      );
      return null;
    }
    if (!match.isConfigured()) {
      console.warn(`[flights] ${match.label} selected but its credentials are unset — serving the guide`);
      return null;
    }
    return match;
  }

  return PROVIDERS.find((p) => p.isConfigured()) || null;
}

/** Provider availability, for diagnostics and the admin UI. */
function describeProviders() {
  const active = getProvider();
  return {
    active: active ? active.id : null,
    requested: (process.env.FLIGHT_PRICING_PROVIDER || "").trim().toLowerCase() || null,
    available: PROVIDERS.map((p) => ({
      id: p.id,
      label: p.label,
      configured: p.isConfigured(),
    })),
  };
}

module.exports = { getProvider, describeProviders, PROVIDERS };

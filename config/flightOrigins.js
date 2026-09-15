// Indicative international airfare — the departure markets we answer for.
//
// HOW THIS LIST WAS BUILT
//
// Not from guesswork. Every candidate market was queried against the live fare
// provider and kept or dropped on whether real fares came back. Two things that
// exercise taught us, both baked into the shape below:
//
//   1. Which CITY you ask about matters enormously. "NYC" returns nothing for
//      Entebbe while Atlanta, Boston and Los Angeles all return fares, so a
//      country is a LIST of search cities and we take the cheapest across them.
//      Ask for one city and you conclude, wrongly, that a market has no flights.
//
//   2. Coverage is patchy and always will be — these are fares real people
//      searched for, not a schedule. Paris had five months of data, Madrid one,
//      Rome none. So a market having no data this week is normal, not an error.
//
// WHY THERE ARE NO HAND-WRITTEN PRICES HERE ANY MORE
//
// There used to be a `low`/`high` fare on every market, written by hand. They
// were wrong — measured against live fares they were out by up to 61%, and worse,
// they were wrong in a way that looked authoritative: a made-up December figure
// sat next to a real November one and read as seasonal insight.
//
// So the fallback is no longer a guess. When a market has no live fare for a
// month, we fall back to the median of live fares from its REGION that month
// (see flightPricingService). Every number the site shows now traces back to a
// fare somebody actually found. Where even the region is silent, we show no
// number and say we will confirm it — which is honest, and costs us nothing.

const PEAK_MONTHS = [12, 1, 6, 7, 8];

const DESTINATION = {
  code: "EBB",
  city: "Entebbe",
  country: "Uganda",
};

// Regions exist so a market with no data can borrow from its neighbours.
//
// These are deliberately COARSE, and that is a correction. Europe was first split
// four ways — western, northern, southern, central — which looked tidy and left
// Spain, Italy, Portugal, Greece and Malta with no number at all, because a
// median needs at least two markets reporting and southern Europe had none in
// the published window. Fare data is too sparse to support fine buckets.
//
// One Europe is also closer to the truth for this destination: nearly every
// European route to Entebbe connects through the same handful of hubs (Istanbul,
// Dubai, Doha, Addis, Amsterdam), so the fares cluster regardless of which
// European city you start from. Measured range across live European fares was
// roughly $610-890 — one band, not four.
const REGIONS = {
  EUROPE: "Europe",
  NORTH_AMERICA: "North America",
  MIDDLE_EAST: "Middle East",
  AFRICA: "Africa",
  ASIA: "Asia",
  OCEANIA: "Oceania",
  SOUTH_AMERICA: "South America",
};

// `airport` is what we SHOW (travellers recognise their own airport).
// `searchCodes` is what we ASK — IATA city codes, cheapest wins.
// `verified` records whether live fares were seen for this market when the list
// was last compiled, so a market that has never returned anything is visible
// rather than quietly padding the dropdown.
const ORIGINS = [
  /* ── Europe: western ────────────────────────────────────── */
  { country: "GB", countryName: "United Kingdom", city: "London", airport: "LHR",
    searchCodes: ["LON", "MAN", "EDI"], region: REGIONS.EUROPE, verified: true },
  { country: "FR", countryName: "France", city: "Paris", airport: "CDG",
    searchCodes: ["PAR", "NCE", "LYS"], region: REGIONS.EUROPE, verified: true },
  { country: "DE", countryName: "Germany", city: "Frankfurt", airport: "FRA",
    searchCodes: ["FRA", "MUC", "BER", "DUS", "HAM"], region: REGIONS.EUROPE, verified: true },
  { country: "NL", countryName: "Netherlands", city: "Amsterdam", airport: "AMS",
    searchCodes: ["AMS"], region: REGIONS.EUROPE, verified: true },
  { country: "BE", countryName: "Belgium", city: "Brussels", airport: "BRU",
    searchCodes: ["BRU", "ANR"], region: REGIONS.EUROPE, verified: false },
  { country: "CH", countryName: "Switzerland", city: "Zurich", airport: "ZRH",
    searchCodes: ["ZRH", "GVA", "BSL"], region: REGIONS.EUROPE, verified: true },
  { country: "AT", countryName: "Austria", city: "Vienna", airport: "VIE",
    searchCodes: ["VIE", "SZG"], region: REGIONS.EUROPE, verified: false },
  { country: "IE", countryName: "Ireland", city: "Dublin", airport: "DUB",
    searchCodes: ["DUB", "ORK"], region: REGIONS.EUROPE, verified: false },
  { country: "LU", countryName: "Luxembourg", city: "Luxembourg", airport: "LUX",
    searchCodes: ["LUX"], region: REGIONS.EUROPE, verified: false },

  /* ── Europe: nordic ─────────────────────────────────────── */
  { country: "SE", countryName: "Sweden", city: "Stockholm", airport: "ARN",
    searchCodes: ["STO", "GOT"], region: REGIONS.EUROPE, verified: true },
  { country: "DK", countryName: "Denmark", city: "Copenhagen", airport: "CPH",
    searchCodes: ["CPH", "BLL"], region: REGIONS.EUROPE, verified: true },
  { country: "NO", countryName: "Norway", city: "Oslo", airport: "OSL",
    searchCodes: ["OSL", "BGO"], region: REGIONS.EUROPE, verified: false },
  { country: "FI", countryName: "Finland", city: "Helsinki", airport: "HEL",
    searchCodes: ["HEL"], region: REGIONS.EUROPE, verified: false },
  { country: "IS", countryName: "Iceland", city: "Reykjavik", airport: "KEF",
    searchCodes: ["REK"], region: REGIONS.EUROPE, verified: false },

  /* ── Europe: southern ───────────────────────────────────── */
  { country: "ES", countryName: "Spain", city: "Madrid", airport: "MAD",
    searchCodes: ["MAD", "BCN", "AGP", "PMI"], region: REGIONS.EUROPE, verified: true },
  { country: "IT", countryName: "Italy", city: "Rome", airport: "FCO",
    searchCodes: ["ROM", "MIL", "VCE", "NAP"], region: REGIONS.EUROPE, verified: false },
  { country: "PT", countryName: "Portugal", city: "Lisbon", airport: "LIS",
    searchCodes: ["LIS", "OPO"], region: REGIONS.EUROPE, verified: false },
  { country: "GR", countryName: "Greece", city: "Athens", airport: "ATH",
    searchCodes: ["ATH", "SKG"], region: REGIONS.EUROPE, verified: false },
  { country: "MT", countryName: "Malta", city: "Valletta", airport: "MLA",
    searchCodes: ["MLA"], region: REGIONS.EUROPE, verified: false },

  /* ── Europe: central & eastern ──────────────────────────── */
  { country: "PL", countryName: "Poland", city: "Warsaw", airport: "WAW",
    searchCodes: ["WAW", "KRK"], region: REGIONS.EUROPE, verified: true },
  { country: "CZ", countryName: "Czechia", city: "Prague", airport: "PRG",
    searchCodes: ["PRG"], region: REGIONS.EUROPE, verified: false },
  { country: "HU", countryName: "Hungary", city: "Budapest", airport: "BUD",
    searchCodes: ["BUD"], region: REGIONS.EUROPE, verified: false },
  { country: "RO", countryName: "Romania", city: "Bucharest", airport: "OTP",
    searchCodes: ["BUH"], region: REGIONS.EUROPE, verified: false },
  { country: "TR", countryName: "Turkey", city: "Istanbul", airport: "IST",
    searchCodes: ["IST", "AYT"], region: REGIONS.EUROPE, verified: true },

  /* ── North America ──────────────────────────────────────── */
  // NYC returns nothing for Entebbe; Atlanta, Boston and LA return fares. This
  // is exactly why a country is a list of cities.
  { country: "US", countryName: "United States", city: "New York", airport: "JFK",
    searchCodes: ["NYC", "ATL", "BOS", "LAX", "CHI", "WAS", "MIA", "SFO", "IAD", "DFW"],
    region: REGIONS.NORTH_AMERICA, verified: true },
  { country: "CA", countryName: "Canada", city: "Toronto", airport: "YYZ",
    searchCodes: ["YTO", "YUL", "YVR", "YYC"], region: REGIONS.NORTH_AMERICA, verified: true },

  /* ── Middle East ────────────────────────────────────────── */
  { country: "AE", countryName: "United Arab Emirates", city: "Dubai", airport: "DXB",
    searchCodes: ["DXB", "AUH", "SHJ"], region: REGIONS.MIDDLE_EAST, verified: true },
  { country: "QA", countryName: "Qatar", city: "Doha", airport: "DOH",
    searchCodes: ["DOH"], region: REGIONS.MIDDLE_EAST, verified: true },
  { country: "SA", countryName: "Saudi Arabia", city: "Riyadh", airport: "RUH",
    searchCodes: ["RUH", "JED", "DMM"], region: REGIONS.MIDDLE_EAST, verified: true },
  { country: "IL", countryName: "Israel", city: "Tel Aviv", airport: "TLV",
    searchCodes: ["TLV"], region: REGIONS.MIDDLE_EAST, verified: true },

  /* ── Africa ─────────────────────────────────────────────── */
  { country: "KE", countryName: "Kenya", city: "Nairobi", airport: "NBO",
    searchCodes: ["NBO", "MBA"], region: REGIONS.AFRICA, verified: true },
  { country: "TZ", countryName: "Tanzania", city: "Dar es Salaam", airport: "DAR",
    searchCodes: ["DAR", "ZNZ", "JRO"], region: REGIONS.AFRICA, verified: true },
  { country: "RW", countryName: "Rwanda", city: "Kigali", airport: "KGL",
    searchCodes: ["KGL"], region: REGIONS.AFRICA, verified: true },
  { country: "BI", countryName: "Burundi", city: "Bujumbura", airport: "BJM",
    searchCodes: ["BJM"], region: REGIONS.AFRICA, verified: true },
  { country: "ET", countryName: "Ethiopia", city: "Addis Ababa", airport: "ADD",
    searchCodes: ["ADD"], region: REGIONS.AFRICA, verified: true },
  { country: "ZA", countryName: "South Africa", city: "Johannesburg", airport: "JNB",
    searchCodes: ["JNB", "CPT", "DUR"], region: REGIONS.AFRICA, verified: true },
  { country: "NG", countryName: "Nigeria", city: "Lagos", airport: "LOS",
    searchCodes: ["LOS", "ABV"], region: REGIONS.AFRICA, verified: true },
  { country: "GH", countryName: "Ghana", city: "Accra", airport: "ACC",
    searchCodes: ["ACC"], region: REGIONS.AFRICA, verified: true },
  { country: "EG", countryName: "Egypt", city: "Cairo", airport: "CAI",
    searchCodes: ["CAI"], region: REGIONS.AFRICA, verified: true },
  { country: "ZM", countryName: "Zambia", city: "Lusaka", airport: "LUN",
    searchCodes: ["LUN"], region: REGIONS.AFRICA, verified: true },
  { country: "ZW", countryName: "Zimbabwe", city: "Harare", airport: "HRE",
    searchCodes: ["HRE"], region: REGIONS.AFRICA, verified: true },

  /* ── Asia ───────────────────────────────────────────────── */
  { country: "IN", countryName: "India", city: "Delhi", airport: "DEL",
    searchCodes: ["DEL", "BOM", "BLR"], region: REGIONS.ASIA, verified: false },
  { country: "CN", countryName: "China", city: "Beijing", airport: "PEK",
    searchCodes: ["BJS", "PEK", "SHA", "CAN"], region: REGIONS.ASIA, verified: true },
  { country: "SG", countryName: "Singapore", city: "Singapore", airport: "SIN",
    searchCodes: ["SIN"], region: REGIONS.ASIA, verified: false },
  { country: "TH", countryName: "Thailand", city: "Bangkok", airport: "BKK",
    searchCodes: ["BKK"], region: REGIONS.ASIA, verified: true },
  { country: "JP", countryName: "Japan", city: "Tokyo", airport: "NRT",
    searchCodes: ["TYO"], region: REGIONS.ASIA, verified: false },

  /* ── Oceania ────────────────────────────────────────────── */
  { country: "AU", countryName: "Australia", city: "Sydney", airport: "SYD",
    searchCodes: ["SYD", "MEL", "BNE", "PER"], region: REGIONS.OCEANIA, verified: false },
  { country: "NZ", countryName: "New Zealand", city: "Auckland", airport: "AKL",
    searchCodes: ["AKL"], region: REGIONS.OCEANIA, verified: false },

  /* ── South America ──────────────────────────────────────── */
  { country: "BR", countryName: "Brazil", city: "Sao Paulo", airport: "GRU",
    searchCodes: ["SAO", "RIO"], region: REGIONS.SOUTH_AMERICA, verified: true },
];

const byCountry = new Map(ORIGINS.map((o) => [o.country, o]));
const byAirport = new Map(ORIGINS.map((o) => [o.airport, o]));

/** Resolve an origin from an ISO country code ("GB") or its display airport ("LHR"). */
function resolveOrigin(input) {
  if (!input) return null;
  const key = String(input).trim().toUpperCase();
  return byCountry.get(key) || byAirport.get(key) || null;
}

/** Is this 1-12 month number a peak-season month for Entebbe? */
function isPeakMonth(month) {
  return PEAK_MONTHS.includes(Number(month));
}

/** Every distinct region name in the list. */
function allRegions() {
  return [...new Set(ORIGINS.map((o) => o.region))];
}

module.exports = {
  ORIGINS,
  DESTINATION,
  REGIONS,
  PEAK_MONTHS,
  resolveOrigin,
  isPeakMonth,
  allRegions,
};

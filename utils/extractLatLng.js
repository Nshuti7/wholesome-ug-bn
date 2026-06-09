// utils/extractLatLng.js
//
// Derive { latitude, longitude } from a Google Maps link so the admin doesn't
// have to type coordinates by hand in addition to pasting the maps link.
//
// Handles the common shapes:
//   • Full place URL:   .../@1.0949,34.4704,15z         (path center)
//   • Place data block:  ...!3d{lat}!4d{lng}...          (the exact pin)
//   • Embed iframe pb:   ...!2d{lng}!3d{lat}...          (camera center, reversed!)
//   • Query params:      ?q=1.09,34.47  / ?ll=...  / ?query=...
//   • A pasted <iframe>: the src= URL is extracted first.
//
// Short links (maps.app.goo.gl, goo.gl/maps, g.co) carry no coordinates in the
// text — they must be resolved by following the redirect, then parsed.

const axios = require("axios");

const inRange = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

const pair = (lat, lng) => {
  const la = parseFloat(lat);
  const lo = parseFloat(lng);
  return inRange(la, lo) ? { latitude: la, longitude: lo } : null;
};

// If an <iframe ...> snippet was pasted, pull out the src URL.
function unwrapIframe(input) {
  const m = String(input).match(/src=["']([^"']+)["']/i);
  return m ? m[1] : String(input).trim();
}

// Parse coordinates from an already-expanded URL (no network).
function parseLatLngFromUrl(input) {
  if (!input) return null;
  const url = unwrapIframe(input);
  let m;

  // 1) Place data block — the exact pin: !3d{lat}!4d{lng}
  if ((m = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/))) {
    const r = pair(m[1], m[2]);
    if (r) return r;
  }
  // 2) Embed camera center: !2d{lng}!3d{lat}  (longitude comes first here)
  if ((m = url.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/))) {
    const r = pair(m[2], m[1]);
    if (r) return r;
  }
  // 3) URL path center: @{lat},{lng}
  if ((m = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/))) {
    const r = pair(m[1], m[2]);
    if (r) return r;
  }
  // 4) Query params: q= / ll= / query= / center=  {lat},{lng}
  if ((m = url.match(/[?&](?:q|ll|query|center|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i))) {
    const r = pair(m[1], m[2]);
    if (r) return r;
  }
  return null;
}

function isShortLink(url) {
  return /(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/)/i.test(url || "");
}

// Follow redirects to expand a short link into the full URL.
async function expandUrl(url) {
  try {
    const resp = await axios.get(url, {
      maxRedirects: 5,
      timeout: 8000,
      // A browser-like UA so Google returns the place URL, not a consent wall.
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WholesomeBot/1.0)" },
      validateStatus: (s) => s >= 200 && s < 400,
    });
    return resp.request?.res?.responseUrl || resp.request?.responseURL || url;
  } catch (err) {
    // Even on failure axios may have followed far enough to expose the URL.
    return (
      err.request?.res?.responseUrl ||
      err.response?.request?.res?.responseUrl ||
      null
    );
  }
}

// Top-level: parse directly, or resolve a short link first, then parse.
async function extractLatLng(input) {
  if (!input || typeof input !== "string") return null;
  const url = unwrapIframe(input);

  const direct = parseLatLngFromUrl(url);
  if (direct) return direct;

  if (isShortLink(url)) {
    const expanded = await expandUrl(url);
    if (expanded) return parseLatLngFromUrl(expanded);
  }
  return null;
}

module.exports = { extractLatLng, parseLatLngFromUrl };

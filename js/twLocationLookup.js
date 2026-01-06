// js/twLocationLookup.js
// Local Taiwan city/district -> lat/lon lookup (no remote geocoding required)

import { TZ } from "./config.js";

// Path to your pure JSON file (no comments inside JSON)
const TW_LOCATIONS_URL = "./data/tw_locations.json";

// Internal state (lazy-loaded)
let _loaded = false;

// Key: "city|district" -> item
let _byCityDistrict = new Map();

// Key: "district" -> [item, item, ...] (for ambiguous district names)
let _byDistrict = new Map();

// key: "taipei|xinyi" -> item in English
let _byCityDistrictEn = new Map(); 

// key: "xinyi" -> [item...] in English
let _byDistrictEn = new Map();     


/**
 * Normalize a user-provided string for zh-TW matching.
 * - Trim spaces
 * - Convert 臺 -> 台
 * - Replace comma with space and collapse multiple spaces
 */
function normZh(input) {
  let s = String(input || "").trim();
  if (!s) return "";

  s = s.replace(/臺/g, "台");
  s = s.replace(/[，,]/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Normalize a user-provided string for en-US matching.
 * - Trim spaces
 * - Lowercase
 * - Replace comma with space and collapse multiple spaces
 * - Remove common suffix words for matching
*/
function normEn(input) {
  let s = String(input || "").trim().toLowerCase();
  if (!s) return "";

  // Normalize punctuation and whitespace
  s = s.replace(/[，,]/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  // Remove common suffix words for matching
  // (Keep it conservative; you can add more if needed)
  s = s.replace(/\b(city|county|district|township)\b/g, "");
  s = s.replace(/\s+/g, " ").trim();

  return s;
}


/**
 * Remove a common trailing administrative suffix for district matching.
 * Note: We intentionally do NOT strip "縣/市" here to avoid breaking city names.
 */
function stripDistrictSuffix(name) {
  return String(name || "").trim().replace(/[區鄉鎮市]$/, "");
}

/** Build a stable map key for city+district lookup. */
function makeKey(city, district) {
  return `${city}|${district}`;
}

/**
 * Load tw_locations.json and build fast lookup indexes.
 * This is safe to call multiple times (it loads only once).
 */
export async function ensureTwLocationsLoaded() {
  if (_loaded) return true;

  const res = await fetch(TW_LOCATIONS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`TW locations JSON HTTP ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("TW locations JSON is not an array");

  _byCityDistrict = new Map();
  _byDistrict = new Map();

  for (const cityObj of data) {
    const city = normZh(cityObj?.city);
    if (!city) continue;

    const districts = Array.isArray(cityObj?.districts) ? cityObj.districts : [];
    for (const d of districts) {
      const district = normZh(d?.name);
      
      if (!district) continue;

      const latitude = Number(d?.latitude);
      const longitude = Number(d?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

      const item = {
        city,
        district,
        city_en: String(cityObj?.city_en || ""),
        district_en: String(d?.name_en || ""),
        latitude,
        longitude,
      };

      _byCityDistrict.set(makeKey(city, district), item);

      if (!_byDistrict.has(district)) _byDistrict.set(district, []);
      _byDistrict.get(district).push(item);

      const cityEn = normEn(cityObj?.city_en);
      const distEn = normEn(d?.name_en);

      if (cityEn && distEn) {
        _byCityDistrictEn.set(makeKey(cityEn, distEn), item);

        if (!_byDistrictEn.has(distEn)) _byDistrictEn.set(distEn, []);
        _byDistrictEn.get(distEn).push(item);
      }

    }
  }

  _loaded = true;
  return true;
}

/**
 * Try to find a Taiwan location from local JSON table (English input).
 *
 * Return value (compatible with your weather.js geocode output):   
 */ 
function lookupTwLocationEn(rawInput) {
  const raw = normEn(rawInput);
  if (!raw) return null;

  const tokens = raw.split(" ").filter(Boolean);

  // Collect English city names
  const cities = new Set();
  for (const k of _byCityDistrictEn.keys()) {
    cities.add(k.split("|")[0]);
  }

  // Detect city name
  let foundCity = "";
  for (const c of cities) {
    if (raw.includes(c)) {
      foundCity = c;
      break;
    }
  }

  // Build district candidates
  let districtCandidates = [];
  if (tokens.length) districtCandidates.push(tokens[0]);
  if (tokens.length) districtCandidates.push(tokens[tokens.length - 1]);

  // 1) City + district exact match
  if (foundCity) {
    for (const d of districtCandidates) {
      const hit = _byCityDistrictEn.get(makeKey(foundCity, d));
      if (hit) {
        return {
          latitude: hit.latitude,
          longitude: hit.longitude,
          name: hit.district_en || hit.district,
          admin1: hit.city_en || hit.city,
          admin2: "",
          timezone: TZ,
          country_code: "TW",
          matched_name: `${hit.city_en || hit.city} ${hit.district_en || hit.district}`,
        };
      }
    }
  }

  // 2) District-only match
  for (const d of districtCandidates) {
    const list = _byDistrictEn.get(d);
    if (list && list.length) {
      const hit = list[0];
      return {
        latitude: hit.latitude,
        longitude: hit.longitude,
        name: hit.district_en || hit.district,
        admin1: hit.city_en || hit.city,
        admin2: "",
        timezone: TZ,
        country_code: "TW",
        matched_name: hit.district_en || hit.district,
      };
    }
  }

  return null;
}


/**
 * Try to find a Taiwan location from local JSON table.
 *
 * Return value (compatible with your weather.js geocode output):
 * {
 *   latitude, longitude,
 *   name, admin1, admin2,
 *   timezone, country_code,
 *   matched_name
 * }
 *
 * Returns null if no match.
 */
export function lookupTwLocation(rawInput) {

    if (!rawInput) return null;

    // Detect language by checking CJK characters
    const isZh = /[\u4e00-\u9fff]/.test(String(rawInput));

    if (!isZh) {
        // ---------- English lookup path ----------
        return lookupTwLocationEn(rawInput);
    }

  const raw = normZh(rawInput);
  if (!raw) return null;

  // Split by space after normalization
  const tokens = raw.split(" ").filter(Boolean);

  // Collect all city names from keys (no extra data structure required)
  // This is acceptable because it runs only when lookup is called (not per frame)
  const cities = new Set();
  for (const k of _byCityDistrict.keys()) cities.add(k.split("|")[0]);

  // Try to detect city by substring match
  let foundCity = "";
  for (const c of cities) {
    if (raw.includes(c)) {
      foundCity = c;
      break;
    }
  }

  // Build district candidates from:
  // - Remaining string after removing city (if city is found)
  // - Last token
  // - Stripped suffix variant
  let districtCandidates = [];

  if (foundCity) {
    const rest = raw.replace(foundCity, "").trim();
    if (rest) districtCandidates.push(rest);
  }

  if (tokens.length >= 1) districtCandidates.push(tokens[tokens.length - 1]);

  districtCandidates = districtCandidates
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .flatMap((x) => {
      const stripped = stripDistrictSuffix(x);
      return stripped && stripped !== x ? [x, stripped] : [x];
    });

  // 1) Exact match using "city|district"
  if (foundCity) {
    for (const d of districtCandidates) {
      const hit = _byCityDistrict.get(makeKey(foundCity, d));
      if (!hit) continue;

      return {
        latitude: hit.latitude,
        longitude: hit.longitude,
        name: hit.district,
        admin1: hit.city,
        admin2: "",
        timezone: TZ,
        country_code: "TW",
        matched_name: `${hit.city}${hit.district}`,
      };
    }
  }

  // 2) District-only match (may be ambiguous)
  // For MVP: pick the first match deterministically
  for (const d of districtCandidates) {
    const list = _byDistrict.get(d);
    if (!list || list.length === 0) continue;

    const hit = list[0];
    return {
      latitude: hit.latitude,
      longitude: hit.longitude,
      name: hit.district,
      admin1: hit.city,
      admin2: "",
      timezone: TZ,
      country_code: "TW",
      matched_name: hit.district,
    };
  }

  return null;
}

/**
 * Optional: expose ambiguity check for UI improvements later.
 * If you want, you can call this to see if a district name maps to multiple cities.
 */
export function getDistrictCandidates(districtName) {
  const d = normZh(districtName);
  return _byDistrict.get(d) ? Array.from(_byDistrict.get(d)) : [];
}

/**
 * Weather fetching and caching logic for Web Wall Calendar Dashboard
 * Path: js/weather.js
 * Author: Chia Wei Chien 
 * License: MIT
 */

import { $, } from "./dom.js";
import { DEBUG, TZ, GEO_CACHE_PREFIX, GEO_CACHE_TTL_MS } from "./config.js";
import { getCurrentLang, t } from "./i18n.js";
import { loadCache, saveCache, makeWeatherCacheKey, shouldRefreshWeather } from "./cache.js";
import { getResolvedLoc, updateLocationTexts } from "./location.js";
import { formatTimeHHMM } from "./ui.js";
import { ensureTwLocationsLoaded, lookupTwLocation } from "./twLocationLookup.js";


function log(...args) { if (DEBUG) console.log("[WCD]", ...args); }

// Geocoding cache key
function makeGeoCacheKey(loc) {
  return `${GEO_CACHE_PREFIX}${getCurrentLang()}:${loc}`;
}

function loadGeoCache(loc) {
  try {
    const raw = localStorage.getItem(makeGeoCacheKey(loc));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    if (Date.now() - (obj.savedAt || 0) > GEO_CACHE_TTL_MS) return null;
    if (typeof obj.latitude !== "number" || typeof obj.longitude !== "number") return null;
    return obj;
  } catch {
    return null;
  }
}

function saveGeoCache(loc, payload) {
  try {
    const obj = { ...payload, savedAt: Date.now() };
    localStorage.setItem(makeGeoCacheKey(loc), JSON.stringify(obj));
  } catch {
    // ignore
  }
}

function buildGeocodeCandidates(loc) {
  const raw = String(loc || "").trim();
  if (!raw) return [];

  const candidates = [];
  const push = (s) => {
    const v = String(s || "").trim();
    if (!v) return;
    if (!candidates.includes(v)) candidates.push(v);
  };

  push(raw);

  if (getCurrentLang() === "zh") {
    let s = raw;
    s = s.replace(/^新北市?/, "");
    s = s.replace(/^新北/, "");
    s = s.replace(/^臺北市?/, "");
    s = s.replace(/^台北市?/, "");
    push(s);
    push(s.replace(/[區鄉鎮市]$/, ""));

    // if (raw.length >= 5) push(raw.slice(-2));
    // if (raw.length >= 6) push(raw.slice(-3));
    // if (raw.length >= 7) push(raw.slice(-4));

  } else {
    let s = raw;
    push(s.split(",")[0]);
    push(s.replace(", New Taipei City", ""));
    push(s.replace(" District", ""));
  }

  return candidates;
}

async function geocodeLocation(loc) {
  const cached = loadGeoCache(loc);
  if (cached) return cached;

  // Local TW lookup (prefer local table, fallback to remote geocoding)
  if (getCurrentLang() === "zh" || getCurrentLang() === "en") {
    try {
      await ensureTwLocationsLoaded();
      const local = lookupTwLocation(loc);

      if (local && Number.isFinite(local.latitude) && Number.isFinite(local.longitude)) {
        log("Local TW geocode hit", { loc, local });
        saveGeoCache(loc, local);
        return local;
      }
    } catch (e) {
      // If local JSON is missing/invalid, we silently fallback to remote geocoding
      log("Local TW lookup failed, fallback to remote geocoding", { message: e?.message });
    }
  }
  const candidates = buildGeocodeCandidates(loc);

  const callGeocode = async (name, withCountryCode) => {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", name);
    url.searchParams.set("count", "5");
    url.searchParams.set("language", getCurrentLang() === "en" ? "en" : "zh");
    if (withCountryCode) url.searchParams.set("countryCode", "TW");

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
    return await res.json();
  };

  for (const withCountryCode of [true, false]) {
    for (const name of candidates) {
      log("Geocode try", { name, withCountryCode });

      const data = await callGeocode(name, withCountryCode);
      if (!data || !Array.isArray(data.results) || data.results.length === 0) continue;

      const top = data.results[0];
      const out = {
        latitude: Number(top.latitude),
        longitude: Number(top.longitude),
        name: top.name || name,
        admin1: top.admin1 || "",
        admin2: top.admin2 || "",
        timezone: top.timezone || TZ,
        country_code: top.country_code || "TW",
        matched_name: name,
      };

      if (!Number.isFinite(out.latitude) || !Number.isFinite(out.longitude)) continue;

      saveGeoCache(loc, out);
      return out;
    }
  }

  throw new Error("No geocoding results");
}

async function fetchTodayWeatherByLatLon(latitude, longitude) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("timezone", TZ);
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("temperature_unit", "celsius");

  url.searchParams.set("current", [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "weather_code",
  ].join(","));

  url.searchParams.set("daily", [
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_probability_max",
  ].join(","));

  url.searchParams.set("hourly", "temperature_2m");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Forecast HTTP ${res.status}`);
  return await res.json();
}

function round0(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function wxDescKeyFromCode(code) {
  const c = Number(code);
  if (!Number.isFinite(c)) return "wx.unknown";

  const known = new Set([
    0, 1, 2, 3, 45, 48,
    51, 53, 55, 56, 57,
    61, 63, 65, 66, 67,
    71, 73, 75, 77,
    80, 81, 82, 85, 86,
    95, 96, 99
  ]);
  if (known.has(c)) return `wx.${c}`;
  return "wx.unknown";
}

function wxEmojiFromCode(code) {
  const c = Number(code);
  if (!Number.isFinite(c)) return "🌤️";

  if (c === 0) return "☀️";
  if (c === 1) return "🌤️";
  if (c === 2) return "⛅";
  if (c === 3) return "☁️";
  if (c === 45 || c === 48) return "🌫️";
  if ((c >= 51 && c <= 57) || (c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return "🌧️";
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "🌨️";
  if (c === 95 || c === 96 || c === 99) return "⛈️";

  return "🌤️";
}

function setWeatherLoadingState() {
  if ($("wxText")) $("wxText").textContent = t("weather.loading");
  if ($("wxNow")) $("wxNow").textContent = `--°C`;
  if ($("wxFeels")) $("wxFeels").textContent = `--°C`;
  if ($("wxRange")) $("wxRange").textContent = `--°C ~ --°C`;
  if ($("wxRain")) $("wxRain").textContent = `--%`;
  if ($("wxHum")) $("wxHum").textContent = `--%`;
  if ($("wxIcon")) $("wxIcon").textContent = "…";
  clearWeatherUpdatedAt();
}

function setWeatherNAState() {
  const na = t("weather.na");
  if ($("wxText")) $("wxText").textContent = na;
  if ($("wxNow")) $("wxNow").textContent = na;
  if ($("wxFeels")) $("wxFeels").textContent = na;
  if ($("wxRange")) $("wxRange").textContent = na;
  if ($("wxRain")) $("wxRain").textContent = na;
  if ($("wxHum")) $("wxHum").textContent = na;
  if ($("wxIcon")) $("wxIcon").textContent = "❓";
  clearWeatherUpdatedAt();
}

export function renderWeatherFromForecast(wx) {
  const cur = wx?.current || {};
  const daily = wx?.daily || {};

  const temp = round0(cur.temperature_2m);
  const feels = round0(cur.apparent_temperature);
  const hum = round0(cur.relative_humidity_2m);
  const code = (cur.weather_code ?? null);

  const tmax = Array.isArray(daily.temperature_2m_max) ? round0(daily.temperature_2m_max[0]) : null;
  const tmin = Array.isArray(daily.temperature_2m_min) ? round0(daily.temperature_2m_min[0]) : null;
  const rain = Array.isArray(daily.precipitation_probability_max) ? round0(daily.precipitation_probability_max[0]) : null;

  const descKey = wxDescKeyFromCode(code);
  const desc = t(descKey);
  const emoji = wxEmojiFromCode(code);

  $("wxIcon").textContent = emoji;
  $("wxText").textContent = desc;

  $("wxNow").textContent = (temp === null) ? `--°C` : `${temp}°C`;
  $("wxFeels").textContent = (feels === null) ? `--°C` : t("weather.feels", { v: feels });

  if (tmin !== null && tmax !== null) {
    $("wxRange").textContent = `${tmin}°C ~ ${tmax}°C`;
  } else {
    $("wxRange").textContent = `--°C ~ --°C`;
  }

  $("wxRain").textContent = (rain === null) ? `--%` : `${rain}%`;
  $("wxHum").textContent = (hum === null) ? `--%` : `${hum}%`;

  renderTempSparkline(wx);
}

function renderWeatherUpdatedTime(dateObj = new Date()) {
    const el = $("wxUpdatedText");
    if (!el) return;
    el.textContent = `${t("label.updated")}${formatTimeHHMM(dateObj)}`;
}


function setWeatherUpdatedAt(tsMs) {
  const el = document.getElementById("weatherUpdatedAt");
  if (!el) return;

  if (!tsMs) { el.textContent = ""; return; }

  const d = new Date(tsMs);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  el.textContent = `${t("label.updated")}${hh}:${mm}`;
}

function clearWeatherUpdatedAt() {
  setWeatherUpdatedAt(null);
}

/**
 * Render temperature trend sparkline
 * @param {object} wx Weather forecast object
 * 
 */
function renderTempSparkline(wx) {
    const svg = document.getElementById("wxTempTrend");
    if (!svg) return;

    const hourly = wx?.hourly;
    if (!hourly?.time || !hourly?.temperature_2m) return;

    const now = Date.now();

    // Collect next 6 hours
    const points = [];
    for (let i = 0; i < hourly.time.length; i++) {
        const t = new Date(hourly.time[i]).getTime();
        if (t >= now) {
            points.push({
                t,
                temp: hourly.temperature_2m[i]
            });
        }
        if (points.length >= 6) break;
    }

    if (points.length < 2) return;

    const temps = points.map(p => p.temp);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const range = Math.max(1, max - min);

    // Build SVG path (0~100 x, 5~25 y)
    const stepX = 100 / (points.length - 1);

    const path = points.map((p, i) => {
        const x = i * stepX;
        const y = 25 - ((p.temp - min) / range) * 20;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
    }).join(" ");

    const circles = points.map((p, i) => {
      const x = i * stepX;
      const y = 25 - ((p.temp - min) / range) * 20;
      return `<circle cx="${x}" cy="${y}" r="2.2" />`;
    }).join("");

    svg.innerHTML = `
      <path d="${path}" />
      ${circles}
    `;
}

function renderHourlyTrend(wx, hours = 6) {
    const svg = $("wxTrendSvg");
    const line = $("wxTrendLine");
    const dots = $("wxTrendDots");
    const leftLabel = $("wxTrendLeft");
    const rightLabel = $("wxTrendRight");
    const title = $("wxTrendTitle");

    if (!svg || !line || !dots || !leftLabel || !rightLabel) return;

    if (title) title.textContent = (getCurrentLang() === "en")
        ? `Next ${hours} hours temp`
        : `未來 ${hours} 小時溫度`;

    // Validate hourly arrays
    const ht = wx?.hourly?.time;
    const htemp = wx?.hourly?.temperature_2m;
    if (!Array.isArray(ht) || !Array.isArray(htemp) || ht.length === 0 || htemp.length === 0) {
        // fallback: hide labels but keep baseline
        line.setAttribute("points", "");
        dots.innerHTML = "";
        leftLabel.textContent = "--°";
        rightLabel.textContent = "--°";
        return;
    }

    // Find "now" index in hourly.time (timezone already requested as TZ)
    const now = new Date();
    const nowMs = now.getTime();

    // hourly.time is like "2026-01-06T14:00"
    const parseIsoLocal = (s) => {
        // new Date("YYYY-MM-DDTHH:mm") works as local time in browsers
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    };

    let startIdx = 0;
    for (let i = 0; i < ht.length; i++) {
        const d = parseIsoLocal(ht[i]);
        if (!d) continue;
        if (d.getTime() >= nowMs) { startIdx = i; break; }
    }

    const count = Math.max(2, Math.min(hours + 1, ht.length - startIdx));
    const temps = [];
    for (let i = 0; i < count; i++) {
        temps.push(Number(htemp[startIdx + i]));
    }

    const finiteTemps = temps.filter(Number.isFinite);
    if (finiteTemps.length < 2) {
        line.setAttribute("points", "");
        dots.innerHTML = "";
        leftLabel.textContent = "--°";
        rightLabel.textContent = "--°";
        return;
    }

    // SVG geometry (match viewBox)
    const W = 520;
    const H = 46;

    // Leave space for the left/right temperature pills so dots won't overlap labels
    const LEFT_PAD = 36;   // tweak: 28~48 depending on your pill width
    const RIGHT_PAD = 36;  // keep symmetric, also protects the right pill

    const x0 = 10 + LEFT_PAD;
    const x1 = 510 - RIGHT_PAD;

    const yMid = 20; // draw line a bit upper
    const yRange = 18;

    const minT = Math.min(...finiteTemps);
    const maxT = Math.max(...finiteTemps);
    const span = Math.max(1, (maxT - minT)); // avoid div0

    const xs = [];
    const pts = [];
    for (let i = 0; i < temps.length; i++) {
        const tval = temps[i];
        const x = x0 + (x1 - x0) * (i / (temps.length - 1));
        const norm = Number.isFinite(tval) ? (tval - minT) / span : 0.5;
        const y = yMid + (0.5 - norm) * yRange;
        xs.push(x);
        pts.push([x, y]);
    }

    line.setAttribute("points", pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" "));

    // Dots (start/end stronger, mid lighter)
    dots.innerHTML = "";
    for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", String(x));
        c.setAttribute("cy", String(y));
        c.setAttribute("r", (i === 0 || i === pts.length - 1) ? "4" : "3");
        c.setAttribute("class", (i === 0 || i === pts.length - 1) ? "wx-trend-dot" : "wx-trend-dot mid");
        dots.appendChild(c);
    }

    // C: only start/end labels
    const t0 = temps[0];
    const tN = temps[temps.length - 1];
    leftLabel.textContent = Number.isFinite(t0) ? `${Math.round(t0)}°` : "--°";
    rightLabel.textContent = Number.isFinite(tN) ? `${Math.round(tN)}°` : "--°";
}



/**
 * Refresh weather with N-hour cache.
 * Cache key is `${lang}:${loc}`.
 */
export async function refreshWeather() {
  setWeatherLoadingState();

  const loc = getResolvedLoc();
  const wxCacheKey = makeWeatherCacheKey(getCurrentLang(), loc);
  const cached = loadCache(wxCacheKey);

  if (!shouldRefreshWeather(cached)) {
    log("Weather cache hit", { key: wxCacheKey, ageMs: Date.now() - cached.ts });
    updateLocationTexts({ geocodeOk: true });
    renderWeatherFromForecast(cached.wx);
    setWeatherUpdatedAt(cached.ts);
    return;
  }

  log("Weather refresh start", {
    lang: getCurrentLang(),
    loc,
    url: window.location.href,
    online: navigator.onLine,
    tz: TZ,
    cacheKey: wxCacheKey,
  });

  try {
    const geo = await geocodeLocation(loc);
    log("Geocoding OK", geo);
    updateLocationTexts({ geocodeOk: true });

    const wx = await fetchTodayWeatherByLatLon(geo.latitude, geo.longitude);
    log("Forecast raw", wx);

    renderWeatherFromForecast(wx);
    renderHourlyTrend(wx, 6);
    renderWeatherUpdatedTime(new Date());

    saveCache(wxCacheKey, {
      ts: Date.now(),
      wx,
      meta: {
        loc,
        lang: getCurrentLang(),
        geo: { latitude: geo.latitude, longitude: geo.longitude },
      },
    });

    setWeatherUpdatedAt(Date.now());

  } catch (err) {
    updateLocationTexts({ geocodeOk: false });
    setWeatherNAState();

    console.warn("[Weather] refresh failed:", {
      message: err?.message,
      stack: err?.stack,
      err
    });
  }
}

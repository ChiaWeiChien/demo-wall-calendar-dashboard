/**
 * Web Wall Calendar Dashboard main application logic
 * Path: js/app.js
 * Author: Chia Wei Chien
 * License: MIT
 */

import { CLOCK_TICK_RATE } from "./config.js";
import { getInitialLang, setLang } from "./i18n.js";
import { loadCache, getTaipeiYYYYMMDD, makeWeatherCacheKey } from "./cache.js";
import { setupNetworkStatus, updateNetworkText, refreshDateTexts, setUpdatedAtNow, updateVersionText, formatTimeHHMM, applyYiJiClampForPortrait } from "./ui.js";
import { syncResolvedLocFromUrlOrDefault, updateLocationTexts, getResolvedLoc } from "./location.js";
import { refreshWeather, renderWeatherFromForecast, renderHourlyTrend, renderWeatherUpdatedTime } from "./weather.js";
import { refreshLunarDaily, getLunarCacheKey, renderLunarFromRaw } from "./lunar.js";
import { createLogger } from "./logger.js";

// Logger
const log = createLogger("WCD:app");

// Prevent overlapping refresh calls
let _refreshInFlight = false;

// Last location for weather-only refreshes
let _lastLocForWeatherOnly = null;

// Day rollover guard
let _lastTaipeiDateKey = null;
let _lastRolloverCheckMs = 0;
const ROLLOVER_CHECK_MIN_INTERVAL_MS = 60 * 1000;

function ensureTaipeiDateKeyInitialized() {
  if (_lastTaipeiDateKey === null) {
    _lastTaipeiDateKey = getTaipeiYYYYMMDD();
  }
}

async function checkDayRolloverAndRefresh(reason = "unknown") {
  ensureTaipeiDateKeyInitialized();

  const keyNow = getTaipeiYYYYMMDD();
  if (keyNow === _lastTaipeiDateKey) return;

  log("Day rollover detected", {
    from: _lastTaipeiDateKey,
    to: keyNow,
    reason,
    visibility: document.visibilityState,
  });

  _lastTaipeiDateKey = keyNow;

  refreshDateTexts();

  try {
    await refreshLunarOnly();
  } catch (e) {
    log.warn("Day rollover refresh failed", e);
  }
}

function setupForegroundRolloverChecks() {
  const onResume = () => {
    log.info("resume", { at: new Date().toISOString(), vis: document.visibilityState });
    _lastRolloverCheckMs = 0;
    checkDayRolloverAndRefresh("resume");
    refreshWeatherOnly();
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") onResume();
  });

  window.addEventListener("focus", onResume);
  window.addEventListener("pageshow", () => onResume());
}

// Clock tick
function tickClock() {
  const now = new Date();
  const nowMs = Date.now();

  const el = document.getElementById("timeBig");
  if (el) el.textContent = formatTimeHHMM(now);

  if (nowMs - _lastRolloverCheckMs >= ROLLOVER_CHECK_MIN_INTERVAL_MS) {
    _lastRolloverCheckMs = nowMs;
    checkDayRolloverAndRefresh("clock_tick");
  }
}

// Render from caches (fast initial UI)
function renderFromCaches() {
  // Lunar: render cached raw
  const lunarCache = loadCache(getLunarCacheKey());
  if (lunarCache && lunarCache.raw) {
    try { renderLunarFromRaw(lunarCache.raw); } catch { /* ignore */ }
  }

  // Weather: render cached wx (even if stale)
  const wxCacheKey = makeWeatherCacheKey(
    // current lang already set in setLang()
    document.documentElement.lang === "en" ? "en" : "zh",
    getResolvedLoc()
  );
  const wxCache = loadCache(wxCacheKey);
  if (wxCache && wxCache.wx) {
    try {
      updateLocationTexts({ geocodeOk: true });
      renderWeatherFromForecast(wxCache.wx);
      renderHourlyTrend(wxCache.wx, 6);

      // show cache time if available
      const ts = wxCache.renderedAt || wxCache.ts;
      if (ts) renderWeatherUpdatedTime(new Date(ts));

    } catch {
      // ignore
    }
  }
}

// Sync location + render cached stuff
function syncLocationAndRenderFromCache() {
  syncResolvedLocFromUrlOrDefault();
  updateLocationTexts({ geocodeOk: true });
  renderFromCaches();
}

// Refresh all
async function refreshData() {
  if (_refreshInFlight) {
    log("refreshData skipped (in-flight)");
    return;
  }
  _refreshInFlight = true;

  try {
    syncLocationAndRenderFromCache();
    refreshDateTexts();

    await Promise.all([
      refreshWeather(),
      refreshLunarDaily(),
    ]);

    setUpdatedAtNow(new Date());
  } finally {
    _refreshInFlight = false;
  }
}

async function refreshWeatherOnly() {
  if (_refreshInFlight) {
    log("refreshWeatherOnly skipped (in-flight)");
    return;
  }
  _refreshInFlight = true;
  try {

    // read from cache + sync location
    // syncLocationAndRenderFromCache();

    // Sync location (but do NOT render cache every time to avoid flicker)
    const prevLoc = _lastLocForWeatherOnly;
    const locNow = syncResolvedLocFromUrlOrDefault(); // returns resolvedLoc

    // Update texts (location string), regardless of geocode success
    updateLocationTexts({ geocodeOk: true });

    // If location changed, allow one fast cache render to avoid empty UI
    if (prevLoc !== locNow) {
      _lastLocForWeatherOnly = locNow;
      renderFromCaches(); // uses the current resolvedLoc
    }

    await refreshWeather();
    setUpdatedAtNow(new Date());

  } finally {
    _refreshInFlight = false;
  }
}

async function refreshLunarOnly() {
  if (_refreshInFlight) {
    log("refreshLunarOnly skipped (in-flight)");
    return;
  }
  _refreshInFlight = true;
  try {
    await refreshLunarDaily();
    setUpdatedAtNow(new Date());
  } finally {
    _refreshInFlight = false;
  }
}

// Aligned scheduler (every 2 hours at HH:00, even hours)
function getNextAligned2HourTick(now = new Date()) {
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  if (d.getHours() % 2 === 1) d.setHours(d.getHours() + 1);
  return d;
}

function scheduleAlignedEvery2Hours(fn) {
  const now = new Date();
  const next = getNextAligned2HourTick(now);
  const delay = next.getTime() - now.getTime();

  log("Aligned schedule armed", { now: now.toISOString(), next: next.toISOString(), delayMs: delay });

  setTimeout(async () => {
    try { await fn(); } catch (e) { log.warn("aligned tick failed:", e); }

    setInterval(() => {
      Promise.resolve(fn()).catch((e) => log.warn("aligned interval failed:", e));
    }, 2 * 60 * 60 * 1000);
  }, delay);
}

// Language switch handler (minimal: keep your previous behavior)
function setLangAndRerender(lang) {
  setLang(lang);

  // Language affects default location and text rendering
  syncResolvedLocFromUrlOrDefault();
  updateLocationTexts({ geocodeOk: true });

  updateNetworkText();
  refreshDateTexts();

  renderFromCaches();
}

// Hidden "debug reset" trigger: multi-tap footer status bar to clear caches & reload.
function setupHiddenCacheReset() {
  const el = document.getElementById("versionText");
  if (!el) return;

  let taps = 0;
  let timer = null;

  const TAP_WINDOW_MS = 1200;  // taps must happen within this window
  const TAP_TARGET = 7;        // how many taps to trigger

  const resetCounter = () => {
    taps = 0;
    if (timer) clearTimeout(timer);
    timer = null;
  };

  el.addEventListener("click", async (e) => {
    taps += 1;

    // Restart the timer every tap
    if (timer) clearTimeout(timer);
    timer = setTimeout(resetCounter, TAP_WINDOW_MS);

    // Optional: show a tiny hint on long press / multi-tap
    // log(`[Reset] taps=${taps}`);

    if (taps < TAP_TARGET) return;

    resetCounter();

    const ok = confirm("Clear caches and reload?");
    if (!ok) return;

    await hardClearAllCaches();

    // Force a "fresh" load; replace avoids adding history entries
    const url = new URL(location.href);
    url.searchParams.set("_", String(Date.now()));
    location.replace(url.toString());
  }, { passive: true });
}

/**
 * Clear app-level storage + Cache Storage + Service Worker (if any).
 * This is a best-effort cleanup for iPad Safari caching issues.
 */
async function hardClearAllCaches() {
  try {
    // 1) Clear your app's own storage
    try { localStorage.clear(); } catch (_) {}
    try { sessionStorage.clear(); } catch (_) {}

    // 2) Clear Cache Storage (if supported)
    if (window.caches && typeof caches.keys === "function") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // 3) Unregister Service Worker (if you use one)
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }

    // 4) Try to clear SW-controlled fetches immediately (best effort)
    // Note: Some browsers may still keep a memory cache; reload with a query param helps.
  } catch (e) {
    log.warn("hardClearAllCaches failed:", e);
  }
}


function main() {
  updateVersionText();
  setLangAndRerender(getInitialLang());

  setupNetworkStatus();
  tickClock();
  setupHiddenCacheReset();

  // Re-clamp on resize / rotate
  window.addEventListener("resize", () => requestAnimationFrame(() => applyYiJiClampForPortrait()));
  window.addEventListener("orientationchange", () => requestAnimationFrame(() => applyYiJiClampForPortrait()));

  setupForegroundRolloverChecks();

  refreshData();

  setInterval(tickClock, CLOCK_TICK_RATE);

  scheduleAlignedEvery2Hours(refreshWeatherOnly);
}

main();

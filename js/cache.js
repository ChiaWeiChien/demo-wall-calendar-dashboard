/**
 * Utility functions for caching and date handling.
 * @module js/cache
 * @license MIT
 */

import { TZ, WEATHER_UPDATE_RATE, CACHE_KEYS } from "./config.js";

function safeJsonParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

export function loadCache(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? safeJsonParse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCache(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

export function getTaipeiYYYYMMDD(d = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

export function getTaipeiYMD(d = new Date()) {
  const ymd = getTaipeiYYYYMMDD(d);
  const [y, m, day] = ymd.split("-").map(Number);
  return { year: y, month: m, day };
}

export function makeWeatherCacheKey(lang, loc) {
  return `${CACHE_KEYS.wxPrefix}${lang}:${loc}`;
}

export function shouldRefreshWeather(cacheObj) {
  if (!cacheObj || typeof cacheObj !== "object") return true;
  if (cacheObj.wx == null) return true;

  const ts = Number(cacheObj.ts);
  if (!Number.isFinite(ts) || ts <= 0) return true;

  const age = Date.now() - ts;

  // If clock jumps backwards or ts is in the future, force refresh to recover
  if (!Number.isFinite(age) || age < 0) return true;

  return age >= WEATHER_UPDATE_RATE;
}

export function shouldRefreshLunarDaily(cacheObj) {
  const today = getTaipeiYYYYMMDD();
  if (!cacheObj || typeof cacheObj !== "object") return true;
  if (!cacheObj.date || cacheObj.date !== today) return true;
  if (!cacheObj.raw) return true;
  return false;
}

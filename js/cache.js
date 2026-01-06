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
  if (!cacheObj.ts || !cacheObj.wx) return true;
  return (Date.now() - cacheObj.ts) >= WEATHER_UPDATE_RATE;
}

export function shouldRefreshLunarDaily(cacheObj) {
  const today = getTaipeiYYYYMMDD();
  if (!cacheObj || typeof cacheObj !== "object") return true;
  if (!cacheObj.date || cacheObj.date !== today) return true;
  if (!cacheObj.raw) return true;
  return false;
}

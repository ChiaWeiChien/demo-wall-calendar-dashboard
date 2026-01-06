/**
 * i18n.js - language table + language state management for Web Wall Calendar Dashboard
 * Author: Chia Wei Chien <https://github.com/ChiaWeiChien>
 * License: MIT
 */
import { LANG_STORAGE_KEY } from "./config.js";

export const I18N = {
  zh: {
    "panel.weather.title": "今日天氣",
    "panel.lunar.title": "農民曆",
    "label.now": "現在：",
    "label.updated": "更新：",
    "lunar.yi": "宜",
    "lunar.ji": "忌",
    "weather.today": "今日",
    "weather.rain": "降雨",
    "weather.humidity": "濕度",
    "weather.feels": "體感 {v}°C",
    "net.ok": "Wi-Fi：OK",
    "net.offline": "Wi-Fi：離線",
    "hint.lunar": "資料來源：待接農民曆 API",
    "dateSub.placeholder": "農曆：等待更新 · 節氣：等待更新",

    // Location-related UI text (dynamic)
    "location.footer": "地點：{loc}",
    "location.weatherHint": "地點：{loc}",
    "location.weatherHint.fail": "地點：{loc}（地名解析失敗，請換個寫法）",

    // Weather UI fallback
    "weather.na": "無資料",
    "weather.loading": "更新中…",

    // Weather descriptions (WMO weather codes)
    "wx.0": "晴朗",
    "wx.1": "大致晴朗",
    "wx.2": "局部多雲",
    "wx.3": "陰天",
    "wx.45": "有霧",
    "wx.48": "霧（霧淞）",
    "wx.51": "毛毛雨（小）",
    "wx.53": "毛毛雨（中）",
    "wx.55": "毛毛雨（大）",
    "wx.56": "凍毛毛雨（小）",
    "wx.57": "凍毛毛雨（大）",
    "wx.61": "下雨（小）",
    "wx.63": "下雨（中）",
    "wx.65": "下雨（大）",
    "wx.66": "凍雨（小）",
    "wx.67": "凍雨（大）",
    "wx.71": "下雪（小）",
    "wx.73": "下雪（中）",
    "wx.75": "下雪（大）",
    "wx.77": "雪粒",
    "wx.80": "陣雨（小）",
    "wx.81": "陣雨（中）",
    "wx.82": "陣雨（大）",
    "wx.85": "陣雪（小）",
    "wx.86": "陣雪（大）",
    "wx.95": "雷雨",
    "wx.96": "雷雨（冰雹）",
    "wx.99": "強雷雨（冰雹）",
    "wx.unknown": "天氣狀態",
  },
  en: {
    "panel.weather.title": "Weather",
    "panel.lunar.title": "Lunar Almanac",
    "label.now": "Now: ",
    "label.updated": "Updated: ",
    "lunar.yi": "Auspicious",
    "lunar.ji": "Inauspicious",
    "weather.today": "Today",
    "weather.rain": "Rain",
    "weather.humidity": "Humidity",
    "weather.feels": "Feels like {v}°C",
    "net.ok": "Wi-Fi: OK",
    "net.offline": "Wi-Fi: Offline",
    "hint.lunar": "Source: Lunar API TBD",
    "dateSub.placeholder": "Lunar: TBD · Solar term: TBD",

    // Location-related UI text (dynamic)
    "location.footer": "Location: {loc}",
    "location.weatherHint": "Location: {loc}",
    "location.weatherHint.fail": "Location: {loc} (Geocoding failed. Try another name.)",

    // Weather UI fallback
    "weather.na": "N/A",
    "weather.loading": "Updating…",

    // Weather descriptions (WMO weather codes)
    "wx.0": "Clear sky",
    "wx.1": "Mainly clear",
    "wx.2": "Partly cloudy",
    "wx.3": "Overcast",
    "wx.45": "Fog",
    "wx.48": "Rime fog",
    "wx.51": "Drizzle (light)",
    "wx.53": "Drizzle (moderate)",
    "wx.55": "Drizzle (dense)",
    "wx.56": "Freezing drizzle (light)",
    "wx.57": "Freezing drizzle (dense)",
    "wx.61": "Rain (slight)",
    "wx.63": "Rain (moderate)",
    "wx.65": "Rain (heavy)",
    "wx.66": "Freezing rain (light)",
    "wx.67": "Freezing rain (heavy)",
    "wx.71": "Snow (slight)",
    "wx.73": "Snow (moderate)",
    "wx.75": "Snow (heavy)",
    "wx.77": "Snow grains",
    "wx.80": "Rain showers (slight)",
    "wx.81": "Rain showers (moderate)",
    "wx.82": "Rain showers (violent)",
    "wx.85": "Snow showers (slight)",
    "wx.86": "Snow showers (heavy)",
    "wx.95": "Thunderstorm",
    "wx.96": "Thunderstorm with hail",
    "wx.99": "Thunderstorm with heavy hail",
    "wx.unknown": "Weather",
  },
};

let currentLang = "zh";

export function getCurrentLang() {
  return currentLang;
}

export function t(key, vars = null) {
  const table = I18N[currentLang] || I18N.zh;
  let s = table[key] ?? I18N.zh[key] ?? key;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

export function getLangFromUrl() {
  const url = new URL(window.location.href);
  const q = url.searchParams.get("lang");
  if (q === "en" || q === "zh") return q;
  return null;
}

export function getInitialLang() {
  const fromUrl = getLangFromUrl();
  if (fromUrl) return fromUrl;

  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved === "en" || saved === "zh") return saved;

  return "zh";
}

export function applyI18n() {
  document.documentElement.lang = (currentLang === "en") ? "en" : "zh-Hant";

  const nodes = document.querySelectorAll("[data-i18n]");
  nodes.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
}

export function setLang(lang) {
  currentLang = (lang === "en") ? "en" : "zh";
  localStorage.setItem(LANG_STORAGE_KEY, currentLang);
  applyI18n();
}

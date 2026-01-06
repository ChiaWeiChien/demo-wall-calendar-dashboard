/**
 * Location handling for Web Wall Calendar Dashboard
 * Path: js/location.js
 * Author: Chia Wei Chien 
 * License: MIT
 */

import { $ } from "./dom.js";
import { getCurrentLang, t } from "./i18n.js";

// Location configuration (language-dependent defaults)
export const DEFAULT_LOCATION = {
  zh: "台北市信義區",
  en: "Xinyi District Taipei",
};

let resolvedLoc = DEFAULT_LOCATION.zh;

export function getResolvedLoc() {
  return resolvedLoc;
}

export function setResolvedLoc(loc) {
  resolvedLoc = loc;
}

export function getLocFromUrl() {
  const url = new URL(window.location.href);
  const loc = url.searchParams.get("loc");
  if (!loc) return null;

  const trimmed = loc.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveLocationFromUrlOrDefault() {
  const fromUrl = getLocFromUrl();
  if (fromUrl) return fromUrl;

  return (getCurrentLang() === "en") ? DEFAULT_LOCATION.en : DEFAULT_LOCATION.zh;
}

export function syncResolvedLocFromUrlOrDefault() {
  resolvedLoc = resolveLocationFromUrlOrDefault();
  return resolvedLoc;
}

export function updateLocationTexts({ geocodeOk = true } = {}) {
  const loc = resolvedLoc;

  const footerEl = $("locationText");
  if (footerEl) footerEl.textContent = t("location.footer", { loc });

  const weatherHintEl = $("weatherLocText") || $("weatherHint");
  if (weatherHintEl) {
    weatherHintEl.textContent = geocodeOk
      ? t("location.weatherHint", { loc })
      : t("location.weatherHint.fail", { loc });
  }
}

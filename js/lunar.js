/**
 * Lunar calendar and Yi/Ji integration for Web Wall Calendar Dashboard
 * Path: js/lunar.js
 * Author: Chia Wei Chien 
 * License: MIT
 */

import { $ } from "./dom.js";
import { YIJI_DICT_VERSION } from "./config.js";
import { getCurrentLang } from "./i18n.js";
import { loadCache, saveCache, getTaipeiYYYYMMDD, getTaipeiYMD, shouldRefreshLunarDaily } from "./cache.js";
import { clampList, applyYiJiClampForPortrait } from "./ui.js";
import { createLogger } from "./logger.js";

// Logger
const log = createLogger("WCD:lunar");

// Cache key for lunar daily
const LUNAR_CACHE_KEY = "wcd_lunar_daily_v1";

// ================================
// Yi/Ji dictionary
// ================================
let yijiIndex = null;
export const UNKNOWN_YIJI = new Set();
window.WCD_UNKNOWN_YIJI = UNKNOWN_YIJI;

function normalizeYiJiToken(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";

  // Normalize common separators to spaces
  s = s
    .replace(/[、，,；;。\.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If API accidentally returns multiple tokens in one string,
  // keep the first token only.
  if (s.includes(" ")) s = s.split(" ")[0];

  return s;
}

/**
 * Load Yi/Ji dictionary (v5) and build lookup index.
 * Dict format:
 * {
 *   version: number,
 *   items: [{ zhCN, zhTW, en, aliases?: [] }, ...]
 * }
 */
export async function loadYiJiDict() {
  if (yijiIndex) return;

  const res = await fetch(`./data/yiji.json?v=${YIJI_DICT_VERSION}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`YiJi dict HTTP ${res.status}`);

  const dict = await res.json();
  const index = new Map();

  for (const it of (dict.items || [])) {
    if (!it) continue;

    // Canonical keys
    const kCN = normalizeYiJiToken(it.zhCN);
    const kTW = normalizeYiJiToken(it.zhTW);

    // 1) zhCN is canonical (most important)
    if (kCN) index.set(kCN, it);

    // 2) Also index zhTW (even if aliases not provided)
    //    so input could be either simplified or traditional.
    if (kTW) index.set(kTW, it);

    // 3) Index aliases if any
    if (Array.isArray(it.aliases)) {
      for (const a of it.aliases) {
        const ak = normalizeYiJiToken(a);
        if (ak) index.set(ak, it);
      }
    }
  }

  yijiIndex = index;
  log("YiJi dict ready, size =", yijiIndex.size, "version =", dict?.version);
}


function translateYiJiTerm(term) {
  const raw = String(term || "").trim();
  const key = normalizeYiJiToken(raw);
  if (!key) return "";

  // Dict not loaded yet: return original normalized token
  if (!yijiIndex) return key;

  const it = yijiIndex.get(key);
  if (!it) {
    // Keep raw key for debugging; do not spam duplicates
    if (!UNKNOWN_YIJI.has(key)) {
      UNKNOWN_YIJI.add(key);
      log.warn("Unknown YiJi term:", key, "from:", raw);
    }
    return key;
  }

  if (getCurrentLang() === "en") return it.en || it.zhTW || it.zhCN || key;
  return it.zhTW || it.zhCN || key;
}


// ================================
// Jieqi mapping
// ================================
const JIEQI_S2T = {
  "谷雨": "穀雨",
  "惊蛰": "驚蟄",
  "处暑": "處暑",
  "白露": "白露",
  "霜降": "霜降",
};

const JIEQI_EN = {
  "立春": "Start of Spring",
  "雨水": "Rain Water",
  "驚蟄": "Awakening of Insects",
  "春分": "Spring Equinox",
  "清明": "Clear and Bright",
  "穀雨": "Grain Rain",

  "立夏": "Start of Summer",
  "小滿": "Grain Full",
  "芒種": "Grain in Ear",
  "夏至": "Summer Solstice",
  "小暑": "Minor Heat",
  "大暑": "Major Heat",

  "立秋": "Start of Autumn",
  "處暑": "End of Heat",
  "白露": "White Dew",
  "秋分": "Autumn Equinox",
  "寒露": "Cold Dew",
  "霜降": "Frost's Descent",

  "立冬": "Start of Winter",
  "小雪": "Minor Snow",
  "大雪": "Major Snow",
  "冬至": "Winter Solstice",
  "小寒": "Minor Cold",
  "大寒": "Major Cold",
};

function translateJieqi(termZh) {
  let s = String(termZh || "").trim();
  if (!s) return "";

  if (JIEQI_S2T[s]) s = JIEQI_S2T[s];

  if (getCurrentLang() !== "en") return s;
  return JIEQI_EN[s] || s;
}

// ================================
// Calendar API integration (query endpoint)
// ================================
async function fetchCalendarApi({ year, month, day }) {
  const url = new URL("https://api.doctorfate.net/query");
  url.searchParams.set("year", String(year));
  url.searchParams.set("month", String(month));
  url.searchParams.set("day", String(day));

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": "PowerLife-APP-2025-v1",
      "Accept": "application/json",
    },
    cache: "no-store"
  });

  if (!res.ok) throw new Error(`Calendar API HTTP ${res.status}`);

  const json = await res.json();

  
  log("API response:", {
    query: { year, month, day },
    code: json?.code,
    message: json?.message,
    yi: json?.data?.yi,
    ji: json?.data?.ji,
    jieqi: json?.data?.jieqi,
  });
  
  return json;
}

function splitYiJiPipe(text) {
  const s = String(text || "").trim();
  if (!s) return [];
  return s.split("|").map(x => x.trim()).filter(Boolean);
}

function adaptCalendarApiPayload(raw) {
  if (!raw || raw.code !== 200 || !raw.data) {
    throw new Error("Calendar API invalid response");
  }

  const d = raw.data;

  let lunarDateText = `${d.nyue || ""} ${d.nri || ""}`.trim();

  if (getCurrentLang() === "en") {
    const y = Number(d.YIYEAR);
    const m = Number(d.YIMONTH);
    const day = Number(d.YIDAY);

    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(day)) {
      lunarDateText = `Year ${y}, Month ${m}, Day ${day}`;
    }
  }

  const solarTermText = translateJieqi(d.jieqi);

  const yiTokens = splitYiJiPipe(d.yi);
  const jiTokens = splitYiJiPipe(d.ji);

  const yi = yiTokens.map(translateYiJiTerm);
  const ji = jiTokens.map(translateYiJiTerm);

  return { lunarDateText, solarTermText, yi, ji };
}

// ================================
// Rendering
// ================================
function setListItems(listId, items) {
  const ul = $(listId);
  if (!ul) return;

  ul.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = (getCurrentLang() === "en") ? "N/A" : "無";
    ul.appendChild(li);
    return;
  }

  for (const s of items) {
    const li = document.createElement("li");
    li.textContent = String(s);
    ul.appendChild(li);
  }
}

function renderLunar(data) {
  const lunarDateText = data?.lunarDateText || "";
  const solarTermText = data?.solarTermText || "";

  if ($("dateSub")) {
    if (lunarDateText || solarTermText) {
      const sep = (lunarDateText && solarTermText) ? " · " : "";
      $("dateSub").textContent =
        `${getCurrentLang() === "en" ? "Lunar: " : "農曆："}${lunarDateText}` +
        `${sep}` +
        `${getCurrentLang() === "en" ? "Solar term: " : "節氣："}${solarTermText}`;
    }
  }

  setListItems("lunarYi", Array.isArray(data?.yi) ? data.yi : []);
  setListItems("lunarJi", Array.isArray(data?.ji) ? data.ji : []);

  const hint = $("lunarHint");
  if (hint) hint.style.display = "none";

  // Clamp in portrait mode after DOM is updated
  requestAnimationFrame(() => applyYiJiClampForPortrait());
}

// ================================
// Public refresh API
// ================================
export function renderLunarFromRaw(raw) {
  const lunar = adaptCalendarApiPayload(raw);
  renderLunar({
    ...lunar,
    yi: clampList(lunar.yi, 6),
    ji: clampList(lunar.ji, 6),
  });
}

export async function refreshLunarDaily() {
  await loadYiJiDict();

  const cache = loadCache(LUNAR_CACHE_KEY);

  if (!shouldRefreshLunarDaily(cache)) {
    log("Lunar cache hit", { date: cache.date });
    renderLunarFromRaw(cache.raw);
    return;
  }

  log("Lunar refresh start (daily)");
  try {
    const ymd = getTaipeiYMD();
    const raw = await fetchCalendarApi(ymd);

    saveCache(LUNAR_CACHE_KEY, {
      date: getTaipeiYYYYMMDD(),
      savedAt: Date.now(),
      raw,
    });

    renderLunarFromRaw(raw);
  } catch (err) {
    log.warn("API failed:", err);
    // Keep UI as-is
  }
}

export function getLunarCacheKey() {
  return LUNAR_CACHE_KEY;
}

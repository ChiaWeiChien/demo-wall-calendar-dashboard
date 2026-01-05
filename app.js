// Wall Calendar Dashboard
// - Layout A (big date on the left, info stack on the right)
// - i18n via URL: ?lang=zh or ?lang=en
// - Location via URL: ?loc=... (language-dependent)
//   - lang=zh => loc is interpreted as Chinese place name
//   - lang=en => loc is interpreted as an English place name
// - Default location: Banqiao (New Taipei City)
// - Weather via Open-Meteo:
//   - Geocoding API: place name -> lat/lon
//   - Forecast API: current + today's min/max + rain prob max
// - English comments only (project style)

const $ = (id) => document.getElementById(id);

// Explicit timezone for formatting and Open-Meteo daily aggregation
const TZ = "Asia/Taipei";

// ================================
// Debug logging
// ================================
const DEBUG = true;

function log(...args) {
    if (DEBUG) console.log("[WCD]", ...args);
}
function warn(...args) {
    if (DEBUG) console.warn("[WCD]", ...args);
}

// ================================
// Update interval configuration
// ================================

// Weather refresh interval (milliseconds)
const WEATHER_UPDATE_RATE = 2* 60 * 60 * 1000; // 2 hours

// Clock update interval (milliseconds)
const CLOCK_TICK_RATE = 10 * 1000; // 10 seconds

// Dictionary cache-busting version (bump when data/yiji.json changes)
const YIJI_DICT_VERSION = 4;

// ================================
// Cache (localStorage)
// ================================
const CACHE_KEYS = {
    lunarDaily: "wcd_lunar_daily_v1", // stores raw calendar API payload for today
    // Weather cache is location + language aware to avoid wrong city after URL change
    wxPrefix: "wcd_wx_v1:", // `${prefix}${lang}:${loc}`
};

function safeJsonParse(raw) {
    try { return JSON.parse(raw); } catch { return null; }
}

function loadCache(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? safeJsonParse(raw) : null;
    } catch (e) {
        warn("cache load failed", key, e);
        return null;
    }
}

function saveCache(key, obj) {
    try {
        localStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {
        warn("cache save failed", key, e);
    }
}

function getTaipeiYYYYMMDD(d = new Date()) {
    // "en-CA" produces YYYY-MM-DD
    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    return fmt.format(d);
}

function makeWeatherCacheKey(lang, loc) {
    return `${CACHE_KEYS.wxPrefix}${lang}:${loc}`;
}

function shouldRefreshWeather(cacheObj) {
    if (!cacheObj || typeof cacheObj !== "object") return true;
    if (!cacheObj.ts || !cacheObj.wx) return true;
    return (Date.now() - cacheObj.ts) >= WEATHER_UPDATE_RATE;
}

function shouldRefreshLunarDaily(cacheObj) {
    const today = getTaipeiYYYYMMDD();
    if (!cacheObj || typeof cacheObj !== "object") return true;
    if (!cacheObj.date || cacheObj.date !== today) return true;
    if (!cacheObj.raw) return true;
    return false;
}

// Prevent overlapping refresh calls (interval + manual triggers)
let _refreshInFlight = false;

// ================================
// i18n (URL-driven language switch)
// ================================
const LANG_STORAGE_KEY = "wcd_lang";

const I18N = {
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

// Location configuration (language-dependent defaults)
const DEFAULT_LOCATION = {
    zh: "板橋",
    en: "Banqiao", // B (more standard / less ambiguous)
};

let resolvedLoc = DEFAULT_LOCATION.zh;

function t(key, vars = null) {
    // Resolve translation by current language with fallback to zh.
    const table = I18N[currentLang] || I18N.zh;
    let s = table[key] ?? I18N.zh[key] ?? key;

    // Simple template replacement: {name}
    if (vars) {
        for (const [k, v] of Object.entries(vars)) {
            s = s.replaceAll(`{${k}}`, String(v));
        }
    }
    return s;
}

function getLangFromUrl() {
    // URL param example: ?lang=en or ?lang=zh
    const url = new URL(window.location.href);
    const q = url.searchParams.get("lang");
    if (q === "en" || q === "zh") return q;
    return null;
}

function getInitialLang() {
    // Priority: URL -> localStorage -> default zh
    const fromUrl = getLangFromUrl();
    if (fromUrl) return fromUrl;

    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "en" || saved === "zh") return saved;

    return "zh";
}

function applyI18n() {
    // Apply translations to all nodes with data-i18n.
    document.documentElement.lang = (currentLang === "en") ? "en" : "zh-Hant";

    const nodes = document.querySelectorAll("[data-i18n]");
    nodes.forEach((el) => {
        const key = el.getAttribute("data-i18n");
        el.textContent = t(key);
    });
}

function setLang(lang) {
    // Set language and apply translations.
    currentLang = (lang === "en") ? "en" : "zh";
    localStorage.setItem(LANG_STORAGE_KEY, currentLang);

    applyI18n();

    // Language affects locale formatting and also the default location string.
    resolvedLoc = resolveLocationFromUrlOrDefault();
    updateLocationTexts();

    // Refresh dynamic strings that are composed in JS.
    updateNetworkText();
    refreshDateTexts();

    // Re-render from cache if available (no API call).
    renderFromCaches();
}

// ================================
// Location (URL-driven)
// ================================
function getLocFromUrl() {
    // URL param example: ?loc=新北三重 or ?loc=Zhongshan%20District,%20Taipei%20City
    // URLSearchParams automatically decodes percent-encoding.
    const url = new URL(window.location.href);
    const loc = url.searchParams.get("loc");
    if (!loc) return null;

    const trimmed = loc.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function resolveLocationFromUrlOrDefault() {
    // Location is language-dependent by design.
    // - If ?loc exists, use it as-is (no conversion).
    // - Else, use default location for the current language.
    const fromUrl = getLocFromUrl();
    if (fromUrl) return fromUrl;

    return (currentLang === "en") ? DEFAULT_LOCATION.en : DEFAULT_LOCATION.zh;
}

function updateLocationTexts({ geocodeOk = true } = {}) {
    // Update footer and weather hint with resolved location.
    const loc = resolvedLoc;

    const footerEl = $("locationText");
    if (footerEl) footerEl.textContent = t("location.footer", { loc });

    const weatherHintEl = $("weatherHint");
    if (weatherHintEl) {
        weatherHintEl.textContent = geocodeOk
            ? t("location.weatherHint", { loc })
            : t("location.weatherHint.fail", { loc });
    }
}

// ================================
// Open-Meteo integration
// ================================

// Geocoding cache policy
const GEO_CACHE_PREFIX = "wcd_geo_v1:";
const GEO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function makeGeoCacheKey(loc) {
    // Keep cache language-aware because geocoding may behave differently by language.
    return `${GEO_CACHE_PREFIX}${currentLang}:${loc}`;
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
        // Ignore storage errors (e.g., quota).
    }
}

function buildGeocodeCandidates(loc) {
    // Build multiple query candidates to improve geocoding hit rate.
    // Observation: "板橋" / "Banqiao" matches better than full admin strings sometimes.

    const raw = String(loc || "").trim();
    if (!raw) return [];

    const candidates = [];
    const push = (s) => {
        const v = String(s || "").trim();
        if (!v) return;
        if (!candidates.includes(v)) candidates.push(v);
    };

    // Always try raw input first.
    push(raw);

    if (currentLang === "zh") {
        // Remove common prefixes (New Taipei / Taipei)
        let s = raw;
        s = s.replace(/^新北市?/, "");
        s = s.replace(/^新北/, "");
        s = s.replace(/^臺北市?/, "");
        s = s.replace(/^台北市?/, "");
        push(s);

        // Remove common suffixes (區/鄉/鎮/市) from the end
        push(s.replace(/[區鄉鎮市]$/, ""));

        // If user uses "新北板橋" style, try extracting the last 2~4 chars as core keyword
        // Example: "新北板橋" -> "板橋"
        if (raw.length >= 2) push(raw.slice(-2));
        if (raw.length >= 3) push(raw.slice(-3));
        if (raw.length >= 4) push(raw.slice(-4));
    } else {
        // English candidates:
        // Example: "Banqiao District, New Taipei City" -> "Banqiao District" -> "Banqiao"
        let s = raw;
        push(s.split(",")[0]);
        push(s.replace(", New Taipei City", ""));
        push(s.replace(" District", ""));
    }

    return candidates;
}

async function geocodeLocation(loc) {
    // Geocode with candidate queries + cache.
    // Try multiple "name" candidates because some Chinese admin formats may not match reliably.

    const cached = loadGeoCache(loc);
    if (cached) return cached;

    const candidates = buildGeocodeCandidates(loc);

    const callGeocode = async (name, withCountryCode) => {
        const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
        url.searchParams.set("name", name);
        url.searchParams.set("count", "5");
        url.searchParams.set("language", currentLang === "en" ? "en" : "zh");
        if (withCountryCode) url.searchParams.set("countryCode", "TW");

        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
        return await res.json();
    };

    // Try with countryCode first (more precise), then without (more permissive).
    for (const withCountryCode of [true, false]) {
        for (const name of candidates) {
            log("Geocode try", { name, withCountryCode });

            const data = await callGeocode(name, withCountryCode);
            if (!data || !Array.isArray(data.results) || data.results.length === 0) {
                continue;
            }

            const top = data.results[0];
            const out = {
                latitude: Number(top.latitude),
                longitude: Number(top.longitude),
                name: top.name || name,
                admin1: top.admin1 || "",
                admin2: top.admin2 || "",
                timezone: top.timezone || TZ,
                country_code: top.country_code || "TW",
                // Optional: record which candidate matched (useful for debugging)
                matched_name: name,
            };

            if (!Number.isFinite(out.latitude) || !Number.isFinite(out.longitude)) {
                continue;
            }

            saveGeoCache(loc, out);
            return out;
        }
    }

    throw new Error("No geocoding results");
}

async function fetchTodayWeatherByLatLon(latitude, longitude) {
    // Open-Meteo Forecast API:
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("timezone", TZ);
    url.searchParams.set("forecast_days", "1");
    url.searchParams.set("temperature_unit", "celsius");

    url.searchParams.set(
        "current",
        [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "weather_code",
        ].join(",")
    );

    url.searchParams.set(
        "daily",
        [
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
        ].join(",")
    );

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
    const wxText = $("wxText");
    const wxNow = $("wxNow");
    const wxFeels = $("wxFeels");
    const wxRange = $("wxRange");
    const wxRain = $("wxRain");
    const wxHum = $("wxHum");
    const wxIcon = $("wxIcon");

    if (wxText) wxText.textContent = t("weather.loading");
    if (wxNow) wxNow.textContent = `--°C`;
    if (wxFeels) wxFeels.textContent = `--°C`;
    if (wxRange) wxRange.textContent = `--°C ~ --°C`;
    if (wxRain) wxRain.textContent = `--%`;
    if (wxHum) wxHum.textContent = `--%`;
    if (wxIcon) wxIcon.textContent = "…";
}

function setWeatherNAState() {
    const wxText = $("wxText");
    const wxNow = $("wxNow");
    const wxFeels = $("wxFeels");
    const wxRange = $("wxRange");
    const wxRain = $("wxRain");
    const wxHum = $("wxHum");
    const wxIcon = $("wxIcon");

    const na = t("weather.na");
    if (wxText) wxText.textContent = na;
    if (wxNow) wxNow.textContent = na;
    if (wxFeels) wxFeels.textContent = na;
    if (wxRange) wxRange.textContent = na;
    if (wxRain) wxRain.textContent = na;
    if (wxHum) wxHum.textContent = na;
    if (wxIcon) wxIcon.textContent = "❓";
}

function renderWeatherFromForecast(wx) {
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

    // Update UI
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
}

/**
 * Refresh weather with 1-hour cache.
 * - Cache key is `${lang}:${loc}` to avoid mixing results after URL changes.
 */
async function refreshWeather() {
    setWeatherLoadingState();

    const wxCacheKey = makeWeatherCacheKey(currentLang, resolvedLoc);
    const cached = loadCache(wxCacheKey);

    // Use cache if still fresh
    if (!shouldRefreshWeather(cached)) {
        log("Weather cache hit", { key: wxCacheKey, ageMs: Date.now() - cached.ts });
        updateLocationTexts({ geocodeOk: true });
        renderWeatherFromForecast(cached.wx);
        return;
    }

    log("Weather refresh start", {
        lang: currentLang,
        loc: resolvedLoc,
        url: window.location.href,
        online: navigator.onLine,
        tz: TZ,
        cacheKey: wxCacheKey,
    });

    try {
        const geo = await geocodeLocation(resolvedLoc);
        log("Geocoding OK", geo);
        updateLocationTexts({ geocodeOk: true });

        const wx = await fetchTodayWeatherByLatLon(geo.latitude, geo.longitude);
        log("Forecast raw", wx);

        // Render
        renderWeatherFromForecast(wx);

        // Save cache
        saveCache(wxCacheKey, {
            ts: Date.now(),
            wx,
            meta: {
                loc: resolvedLoc,
                lang: currentLang,
                geo: { latitude: geo.latitude, longitude: geo.longitude },
            },
        });
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

// ================================
// Date / time helpers
// ================================
function pad2(n) { return String(n).padStart(2, "0"); }

function formatDateParts(d) {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    return `${y}-${m}-${day}`;
}

function formatTimeHHMM(d) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function weekdayShort(d) {
    // Format weekday based on current language.
    const locale = (currentLang === "en") ? "en-US" : "zh-TW";
    return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: TZ }).format(d);
}

function tickClock() {
    // Update only the live clock.
    const now = new Date();
    $("timeBig").textContent = formatTimeHHMM(now);
}

function setUpdatedAtNow(d) {
    $("updatedAt").textContent = formatTimeHHMM(d);
}



function refreshDateTexts() {
    // Re-render date-related texts which depend on language/locale.
    const now = new Date();

    $("dateBig").textContent = formatDateParts(now);

    const mm = pad2(now.getMonth() + 1);
    const dd = pad2(now.getDate());
    $("mmdd").textContent = `${mm}/${dd}`;
    $("dow").textContent = weekdayShort(now);
    $("yyyy").textContent = String(now.getFullYear());

    // Placeholder until lunar API is plugged in (will be overwritten if we have cached/real data).
    $("dateSub").textContent = t("dateSub.placeholder");
}
/*
function refreshDateTexts() {
    const now = new Date();

    // Month line: "M 月" (no leading zero)
    const month = now.getMonth() + 1;
    $("mmdd").textContent = `${month} 月`;

    // Big day: "DD" (with leading zero)
    const day = pad2(now.getDate());
    $("dateBig").textContent = day;

    // Weekday line
    $("dow").textContent = weekdayShort(now);

    // Optional: keep year somewhere if you still want it
    // If you don't want year displayed, you can hide it via CSS (see below).
    $("yyyy").textContent = String(now.getFullYear());

    // Placeholder until lunar API is plugged in (will be overwritten if we have cached/real data).
    $("dateSub").textContent = t("dateSub.placeholder");
}
*/

// ================================
// Network status
// ================================
function updateNetworkText() {
    $("netText").textContent = navigator.onLine ? t("net.ok") : t("net.offline");
}

function setupNetworkStatus() {
    const update = () => updateNetworkText();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
}

function clampList(list, maxItems) {
    if (!Array.isArray(list)) return [];
    if (list.length <= maxItems) return list;
    return [...list.slice(0, maxItems), "…"];
}

// ================================
// Lunar Almanac rendering
// ================================
function renderLunar(data) {
    const lunarDateText = data?.lunarDateText || "";
    const solarTermText = data?.solarTermText || "";

    // Update the sub-date line under the big date panel
    if ($("dateSub")) {
        if (lunarDateText || solarTermText) {
            const sep = (lunarDateText && solarTermText) ? " · " : "";
            $("dateSub").textContent =
                `${currentLang === "en" ? "Lunar: " : "農曆："}${lunarDateText}` +
                `${sep}` +
                `${currentLang === "en" ? "Solar term: " : "節氣："}${solarTermText}`;
        }
    }

    // Update Yi/Ji lists
    setListItems("lunarYi", Array.isArray(data?.yi) ? data.yi : []);
    setListItems("lunarJi", Array.isArray(data?.ji) ? data.ji : []);

    // Hide "hint" once we have real data
    const hint = $("lunarHint");
    if (hint) hint.style.display = "none";
}

function setListItems(listId, items) {
    const ul = $(listId);
    if (!ul) return;

    ul.innerHTML = "";
    if (!items.length) {
        const li = document.createElement("li");
        li.textContent = (currentLang === "en") ? "N/A" : "無";
        ul.appendChild(li);
        return;
    }

    for (const s of items) {
        const li = document.createElement("li");
        li.textContent = String(s);
        ul.appendChild(li);
    }
}

// ================================
// Yi/Ji dictionary (lookup table)
// ================================

let yijiIndex = null;
const UNKNOWN_YIJI = new Set();

// Expose unknown tokens for quick debugging in DevTools.
window.WCD_UNKNOWN_YIJI = UNKNOWN_YIJI;

/**
 * Load Yi/Ji dictionary (data/yiji.json) once and build a fast lookup index.
 * Uses a versioned query string to avoid Safari cache issues.
 */
async function loadYiJiDict() {
    if (yijiIndex) return;

    const res = await fetch(`./data/yiji.json?v=${YIJI_DICT_VERSION}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`YiJi dict HTTP ${res.status}`);

    const dict = await res.json();
    const index = new Map();

    for (const it of (dict.items || [])) {
        if (!it) continue;

        const key = normalizeYiJiToken(it.key);
        if (key) index.set(key, it);

        // Index aliases too (if present)
        if (Array.isArray(it.aliases)) {
            for (const a of it.aliases) {
                const ak = normalizeYiJiToken(a);
                if (ak) index.set(ak, it);
            }
        }
    }

    yijiIndex = index;
    // window.WCD_YIJI_INDEX = yijiIndex;
    console.log("[WCD] YiJi dict ready, size =", yijiIndex.size);
}

// Minimal Simplified->Traditional mapping for common Yi/Ji tokens.
const S2T_TERM = new Map([
    ["开市", "開市"],
    ["纳财", "納財"],
    ["纳采", "納采"],
    ["纳畜", "納畜"],
    ["动土", "動土"],
    ["修造", "修造"],
    ["上梁", "上樑"],
    ["入宅", "入宅"],
    ["祈福", "祈福"],
    ["掘井", "掘井"],
    ["安门", "安門"],
    ["安葬", "安葬"],
    ["作灶", "作灶"],
    ["补垣", "補垣"],
    ["开池", "開池"],
    ["取渔", "取漁"],
    ["嫁娶", "嫁娶"],
    ["安床", "安床"],
    ["立券", "立券"],
    // "交易" is the same in both
]);

function normalizeYiJiToken(raw) {
    let s = String(raw || "").trim();
    // if (!s) return "";

    // Remove common punctuation and normalize spaces.
    s = s
        .replace(/[、，,；;。\.]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // If it still contains spaces (e.g., packed synonyms), keep the first segment.
    if (s.includes(" ")) s = s.split(" ")[0];
    if (S2T_TERM.has(s)) s = S2T_TERM.get(s);

    return s;
}

/**
 * Translate a single Yi/Ji token via dictionary.
 * - Normalizes the raw token for robust matching.
 * - If not found, returns the normalized token and records it in UNKNOWN_YIJI.
 */
function translateYiJiTerm(term) {
    const raw = String(term || "").trim();
    const key = normalizeYiJiToken(raw);
    if (!key) return "";
    if (!yijiIndex) return key;
    
    const it = yijiIndex?.get(key);
    if (!it) {
        UNKNOWN_YIJI.add(key);
        if (DEBUG) console.warn("[WCD] Unknown YiJi term:", key, "from:", raw);
        return key;
    }

    if (currentLang === "en") return it.en || it.zhHant || it.key || key;
    return it.zhHant || it.key || key;
}

// ================================
// Calendar API integration
// ================================
/**
 * Fetch calendar/almanac data from the provider.
 * NOTE: This request requires X-API-Key header.
 */
async function fetchCalendarApi() {
    const API_URL = "https://api.doctorfate.net/today";

    const res = await fetch(API_URL, {
        method: "GET",
        headers: {
            "X-API-Key": "PowerLife-APP-2025-v1",
            "Accept": "application/json",
        },
        cache: "no-store"
    });

    if (!res.ok) {
        throw new Error(`Calendar API HTTP ${res.status}`);
    }

    const json = await res.json();

    if (DEBUG) {
        console.log("[Lunar API] response:", {
            code: json?.code,
            message: json?.message,
            yi: json?.data?.yi,
            ji: json?.data?.ji,
            jieqi: json?.data?.jieqi,
        });
    }
    return json;
}

function splitYiJiPipe(text) {
    const s = String(text || "").trim();
    if (!s) return [];
    return s.split("|").map(x => x.trim()).filter(Boolean);
}

// ================================
// Solar terms (24 Jieqi) mapping
// ================================

// Minimal Simplified -> Traditional mapping for solar terms
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

    if (currentLang !== "en") return s;
    return JIEQI_EN[s] || s;
}

/**
 * Adapt provider payload into the UI-friendly structure.
 * Returns: { lunarDateText, solarTermText, yi: string[], ji: string[] }
 */
function adaptCalendarApiPayload(raw) {
    if (!raw || raw.code !== 200 || !raw.data) {
        throw new Error("Calendar API invalid response");
    }

    const d = raw.data;

    // Lunar date text (this API already provides Chinese numerals)
    let lunarDateText = `${d.nyue || ""} ${d.nri || ""}`.trim();

    if (currentLang === "en") {
        const y = Number(d.YIYEAR);
        const m = Number(d.YIMONTH);
        const day = Number(d.YIDAY);

        if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(day)) {
            lunarDateText = `Year ${y}, Month ${m}, Day ${day}`;
        }
    }

    // Solar term (jieqi)
    const solarTermText = translateJieqi(d.jieqi);

    // Yi/Ji tokens (pipe-separated)
    const yiTokens = splitYiJiPipe(d.yi);
    const jiTokens = splitYiJiPipe(d.ji);

    // Translate/normalize via dictionary
    const yi = yiTokens.map(translateYiJiTerm);
    const ji = jiTokens.map(translateYiJiTerm);

    return { lunarDateText, solarTermText, yi, ji };
}

// ================================
// Render from caches (no API call)
// ================================
function renderFromCaches() {
    // Lunar: render from cached raw (if today)
    const lunarCache = loadCache(CACHE_KEYS.lunarDaily);
    if (lunarCache && !shouldRefreshLunarDaily(lunarCache)) {
        try {
            // Dict may not be ready yet; best-effort render (will be updated after loadYiJiDict in refreshData)
            const lunar = adaptCalendarApiPayload(lunarCache.raw);
            renderLunar({
                ...lunar,
                yi: clampList(lunar.yi, 6),
                ji: clampList(lunar.ji, 6),
            });
        } catch {
            // ignore
        }
    }

    // Weather: render from cached forecast if exists (even if stale), to show something immediately
    const wxCacheKey = makeWeatherCacheKey(currentLang, resolvedLoc);
    const wxCache = loadCache(wxCacheKey);
    if (wxCache && wxCache.wx) {
        try {
            updateLocationTexts({ geocodeOk: true });
            renderWeatherFromForecast(wxCache.wx);
        } catch {
            // ignore
        }
    }
}

// ================================
// Data refresh (split: Weather hourly, Lunar daily)
// ================================
async function refreshLunarDaily() {
    await loadYiJiDict();

    const cache = loadCache(CACHE_KEYS.lunarDaily);

    // Use today's cached raw payload
    if (!shouldRefreshLunarDaily(cache)) {
        log("Lunar cache hit", { date: cache.date });
        const lunar = adaptCalendarApiPayload(cache.raw);
        renderLunar({
            ...lunar,
            yi: clampList(lunar.yi, 6),
            ji: clampList(lunar.ji, 6),
        });
        return;
    }

    // Fetch once per day
    log("Lunar refresh start (daily)");
    try {
        const raw = await fetchCalendarApi();

        saveCache(CACHE_KEYS.lunarDaily, {
            date: getTaipeiYYYYMMDD(),
            savedAt: Date.now(),
            raw,
        });

        const lunar = adaptCalendarApiPayload(raw);
        renderLunar({
            ...lunar,
            yi: clampList(lunar.yi, 6),
            ji: clampList(lunar.ji, 6),
        });
    } catch (err) {
        console.warn("[Lunar] API failed:", err);
        // Keep UI as-is; do not overwrite with placeholder.
    }
}

/**
 * Refresh all dynamic data on the dashboard.
 * - Weather: cached 1 hour
 * - Lunar almanac: cached 1 day (by Taipei date)
 */
async function refreshData() {
    if (_refreshInFlight) {
        log("refreshData skipped (in-flight)");
        return;
    }
    _refreshInFlight = true;

    const now = new Date();

    try {
        // Resolve location from URL (in case URL changed) and update location texts.
        resolvedLoc = resolveLocationFromUrlOrDefault();
        updateLocationTexts({ geocodeOk: true });

        refreshDateTexts();

        // Ensure we have immediate display from caches (fast UI)
        renderFromCaches();

        // Refresh weather + lunar in parallel (each has its own cache policy)
        await Promise.all([
            refreshWeather(),
            refreshLunarDaily(),
        ]);

        // Updated timestamp should reflect "data refresh done"
        setUpdatedAtNow(now);
    } finally {
        _refreshInFlight = false;
    }
}


// ================================
// Aligned scheduler (every 2 hours at HH:00, even hours)
// ================================
function getNextAligned2HourTick(now = new Date()) {
    // Next tick time at even hour, minute=0, second=0
    const d = new Date(now);

    // Move to next hour boundary
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);

    // If hour is odd, move 1 more hour to make it even
    if (d.getHours() % 2 === 1) {
        d.setHours(d.getHours() + 1);
    }
    return d;
}

function scheduleAlignedEvery2Hours(fn) {
    const now = new Date();
    const next = getNextAligned2HourTick(now);
    const delay = next.getTime() - now.getTime();

    log("Aligned schedule armed", {
        now: now.toISOString(),
        next: next.toISOString(),
        delayMs: delay
    });

    setTimeout(async () => {
        // Fire once at the aligned boundary
        try { await fn(); } catch (e) { console.warn("[WCD] aligned tick failed:", e); }

        // Then repeat every 2 hours exactly
        setInterval(() => {
            Promise.resolve(fn()).catch((e) => console.warn("[WCD] aligned interval failed:", e));
        }, 2 * 60 * 60 * 1000);
    }, delay);
}


// ================================
// App entry
// ================================
function main() {
    setLang(getInitialLang());

    setupNetworkStatus();
    tickClock();

    // Initial paint (from caches) + refresh (with cache policies)
    refreshData();

    // Update clock periodically
    setInterval(tickClock, CLOCK_TICK_RATE);

    // Refresh on aligned even-hour boundaries: 00:00, 02:00, 04:00...
    // - Weather: will call API at most once per 2 hours, aligned to HH:00
    // - Lunar: still at most once per day (Taipei date)
    scheduleAlignedEvery2Hours(refreshData);

}

main();

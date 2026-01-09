/**
 * Configuration constants for Web Wall Calendar Dashboard
 * Path: js/config.js
 * Author: Chia Wei Chien <https://github.com/ChiaWeiChien>
 * License: MIT
 */

// App version
export const APP_VERSION = "0.1.4";

// Timezone
export const TZ = "Asia/Taipei";

// Debug logging
export const DEBUG = false;

// Daily reload at 4:00:00
export const DAILY_RELOAD = true;
export const DAILY_RELOAD_TIME = {hour: 4, minute: 0, second: 0, ms: 0,};

// Weather refresh interval (milliseconds)
// export const WEATHER_UPDATE_RATE = 3 * 1000; // 30 seconds for test
export const WEATHER_UPDATE_RATE = 2 * 60 * 60 * 1000; // 2 hours

// Clock update interval (milliseconds)
export const CLOCK_TICK_RATE = 10 * 1000; // 10 seconds

// Dictionary cache-busting version (bump when data/yiji.json changes)
export const YIJI_DICT_VERSION = 4;

// Cache keys (localStorage)
export const CACHE_KEYS = {
  lunarDaily: "wcd_lunar_daily_v1",
  wxPrefix: "wcd_wx_v1:", // `${prefix}${lang}:${loc}`
};

// Geocoding cache policy
export const GEO_CACHE_PREFIX = "wcd_geo_v1:";
export const GEO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Language storage
export const LANG_STORAGE_KEY = "wcd_lang";



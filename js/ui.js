/**
 * UI utility functions for Web Wall Calendar Dashboard
 * Path: js/ui.js
 * Author: Chia Wei Chien 
 * License: MIT
 */

import { $ } from "./dom.js";
import { TZ, APP_VERSION } from "./config.js";
import { getCurrentLang, t } from "./i18n.js";
import { createLogger } from "./logger.js";

const log = createLogger("WCD:ui");

export function pad2(n) { return String(n).padStart(2, "0"); }

export function formatDateParts(d) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

export function formatTimeHHMM(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function weekdayShort(d) {
  const locale = (getCurrentLang() === "en") ? "en-US" : "zh-TW";
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: TZ }).format(d);
}

export function refreshDateTexts() {
  const now = new Date();
  const m =  now.getMonth() + 1;
  const d = now.getDate();
  $("dateBig").textContent = formatDateParts(now);

  if (getCurrentLang() === "zh") {
    $("mmdd").textContent = `${m} 月 ${d} 日`
  }
  else {
    const mm = pad2(m);
    const dd = pad2(d);
    $("mmdd").textContent = `${mm} / ${dd}`;
  }
  $("dow").textContent = weekdayShort(now);
  $("yyyy").textContent = String(now.getFullYear());

  $("dateSub").textContent = t("dateSub.placeholder");
}

export function setUpdatedAtNow(d) {
  $("updatedAt").textContent = formatTimeHHMM(d);
}

export function updateNetworkText() {
  $("netText").textContent = navigator.onLine ? t("net.ok") : t("net.offline");
}

export function updateVersionText() {
  $("versionText").textContent = `v${APP_VERSION}`;
}

export function setupNetworkStatus() {
  const update = () => updateNetworkText();
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

export function clampList(list, maxItems) {
  if (!Array.isArray(list)) return [];
  if (list.length <= maxItems) return list;
  return [...list.slice(0, maxItems), "…"];
}

/**
 * Clamp a <ul> list to maxLines and append "+N" if overflow.
 * Works for your portrait "tag flow" mode (flex-wrap) by measuring offsetTop.
 */
export function clampListToLines(ul, { maxLines = 2, moreClass = "item-more" } = {}) {
  if (!ul) return;

  const oldMore = ul.querySelector(`li.${moreClass}`);
  if (oldMore) oldMore.remove();

  const items = Array.from(ul.children).filter(li => li.tagName === "LI");
  if (items.length === 0) return;

  // Reset to visible first (important on resize)
  for (const li of items) li.style.display = "";

  // Force layout
  // eslint-disable-next-line no-unused-expressions
  ul.offsetHeight;

  const firstTop = items[0].offsetTop;
  let lineCount = 1;
  let lastTop = firstTop;
  let keepCount = 0;

  for (const li of items) {
    const top = li.offsetTop;
    if (top > lastTop) {
      lineCount += 1;
      lastTop = top;
    }
    if (lineCount > maxLines) break;
    keepCount += 1;
  }

  const hiddenCount = items.length - keepCount;
  if (hiddenCount <= 0) return;

  /* Reserve space for "+N" by hiding ONE MORE item */
  const reserve = 1;
  const visibleCount = Math.max(0, keepCount - reserve);

  for (let i = visibleCount; i < items.length; i++) {
    items[i].style.display = "none";
  }

  const more = document.createElement("li");
  more.className = moreClass;
  more.textContent = `+${items.length - visibleCount}`;

  /*
  for (let i = keepCount; i < items.length; i++) {
    items[i].style.display = "none";
  }

  const more = document.createElement("li");
  more.className = moreClass;
  more.textContent = `+${hiddenCount}`;
  */

  ul.appendChild(more);
}

export function applyYiJiClampForPortrait() {
  // const isPortraitNarrow = window.matchMedia("(max-width: 900px)").matches;
  // if (!isPortraitNarrow) return;
  // const cssLines = getComputedStyle(document.body)
  //   .getPropertyValue("--lunar-max-lines")
  //   .trim();
  // const maxLines = Number(cssLines) || 2;

  // fix one line
  const yiUl = $("lunarYi");
  const jiUl = $("lunarJi");
  clampListToLines(yiUl, { maxLines: 1 });   // maxLines: 2
  clampListToLines(jiUl, { maxLines: 1 });   // maxLines: 2

  log.debug("YiJi clamp applied (portrait)");
}

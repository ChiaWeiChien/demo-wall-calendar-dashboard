/**
 * Logger utility for Web Wall Calendar Dashboard
 * Path: js/logger.js
 * Author: Chia Wei Chien
 * License: MIT
 */

import { DEBUG } from "./config.js";

export function createLogger(tag = "WCD") {
  const prefix = `[${tag}]`;

  function log(...args) {
    if (DEBUG) console.log(prefix, ...args);
  }

  // attach methods onto the function
  log.debug = (...args) => {
    if (DEBUG) console.debug(prefix, ...args);
  };

  log.info = (...args) => {
    console.info(prefix, ...args);
  };

  log.warn = (...args) => {
    console.warn(prefix, ...args);
  };

  log.error = (...args) => {
    console.error(prefix, ...args);
  };

  return log;
}

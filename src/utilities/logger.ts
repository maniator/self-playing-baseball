/**
 * Shared colored console logger for the main app.
 *
 * Usage:
 *   import { createLogger } from "../utilities/logger";
 *   const log = createLogger("app");
 *   log.log("SW registered — scope:", reg.scope);
 *   log.warn("permission denied");
 *   log.error("fatal:", err);
 *
 * Produces a coloured badge in DevTools that looks identical to the SW logger.
 *
 * NOTE: src/sw.ts is a classic service-worker script and cannot import modules.
 *       The CSS constants below are therefore duplicated there.
 *       If you change the colours here, update sw.ts to match.
 */

// CSS badge styles — keep in sync with STYLE_* constants in src/sw.ts.
export const LOG_STYLES = {
  info:  "background:#0f4c2a;color:#4ade80;font-weight:bold;padding:1px 5px;border-radius:3px;font-size:11px",
  warn:  "background:#4a3500;color:#fbbf24;font-weight:bold;padding:1px 5px;border-radius:3px;font-size:11px",
  error: "background:#4a0000;color:#f87171;font-weight:bold;padding:1px 5px;border-radius:3px;font-size:11px",
  reset: "color:inherit;font-weight:normal",
} as const;

export interface AppLogger {
  log:   (msg: string, ...args: unknown[]) => void;
  warn:  (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

/**
 * Creates a coloured console logger that prefixes every message with a
 * styled `tag` badge — identical in appearance to the SW logger in sw.ts.
 *
 * @param tag  Short label shown in the badge, e.g. "app" or "DecisionPanel".
 */
export const createLogger = (tag: string): AppLogger => ({
  log: (msg: string, ...rest: unknown[]) =>
    console.log(`%c ${tag} %c ${msg}`, LOG_STYLES.info, LOG_STYLES.reset, ...rest),
  warn: (msg: string, ...rest: unknown[]) =>
    console.warn(`%c ${tag} %c ${msg}`, LOG_STYLES.warn, LOG_STYLES.reset, ...rest),
  error: (msg: string, ...rest: unknown[]) =>
    console.error(`%c ${tag} %c ${msg}`, LOG_STYLES.error, LOG_STYLES.reset, ...rest),
});

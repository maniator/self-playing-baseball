/**
 * Shared colored console logger.
 *
 * Two singletons are vended from this module:
 *   - `appLog` — singleton for the main-app context (imported directly by app files).
 *     The ES module cache ensures it is created exactly once per page load.
 *   - SW logger — the service worker imports `createLogger` and creates its own
 *     singleton tagged with its version: `createLogger(\`SW v${SW_VERSION}\`)`.
 *
 * Both produce the same styled badge output in DevTools.
 * To view SW logs: DevTools → Application → Service Workers → Inspect.
 */

export const LOG_STYLES = {
  info: "background:#0f4c2a;color:#4ade80;font-weight:bold;padding:1px 5px;border-radius:3px;font-size:11px",
  warn: "background:#4a3500;color:#fbbf24;font-weight:bold;padding:1px 5px;border-radius:3px;font-size:11px",
  error:
    "background:#4a0000;color:#f87171;font-weight:bold;padding:1px 5px;border-radius:3px;font-size:11px",
  reset: "color:inherit;font-weight:normal",
} as const;

export interface AppLogger {
  log: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

/**
 * Creates a coloured console logger whose every message is prefixed with a
 * styled `tag` badge.
 *
 * @param tag  Short label shown in the badge, e.g. "app" or "SW v1.3.0".
 */
export const createLogger = (tag: string): AppLogger => ({
  log: (msg: string, ...rest: unknown[]) =>
    console.log(`%c ${tag} %c ${msg}`, LOG_STYLES.info, LOG_STYLES.reset, ...rest),
  warn: (msg: string, ...rest: unknown[]) =>
    console.warn(`%c ${tag} %c ${msg}`, LOG_STYLES.warn, LOG_STYLES.reset, ...rest),
  error: (msg: string, ...rest: unknown[]) =>
    console.error(`%c ${tag} %c ${msg}`, LOG_STYLES.error, LOG_STYLES.reset, ...rest),
});

/**
 * Singleton logger for the main-app context.
 * Import this directly — do not call `createLogger("app")` again in app files.
 */
export const appLog: AppLogger = createLogger("app");

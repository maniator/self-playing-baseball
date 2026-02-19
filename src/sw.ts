/// <reference lib="webworker" />

// Increment this tag whenever the SW changes so logs identify the active build.
const SW_VERSION = "1.3.0";

// CSS badge styles for colored console logging.
// Visible in DevTools → Application → Service Workers → Inspect.
// IMPORTANT: keep in sync with LOG_STYLES in src/utilities/logger.ts.
// (The SW is a classic script and cannot import modules, so these are duplicated here.)
const STYLE_TAG   = "background:#0f4c2a;color:#4ade80;font-weight:bold;padding:1px 5px;border-radius:3px;font-size:11px";
const STYLE_WARN  = "background:#4a3500;color:#fbbf24;font-weight:bold;padding:1px 5px;border-radius:3px;font-size:11px";
const STYLE_ERR   = "background:#4a0000;color:#f87171;font-weight:bold;padding:1px 5px;border-radius:3px;font-size:11px";
const STYLE_RESET = "color:inherit;font-weight:normal";

const swLog = (msg: string, ...args: unknown[]): void =>
  console.log(`%c SW v${SW_VERSION} %c ${msg}`, STYLE_TAG, STYLE_RESET, ...args);

const swWarn = (msg: string, ...args: unknown[]): void =>
  console.warn(`%c SW v${SW_VERSION} %c ${msg}`, STYLE_WARN, STYLE_RESET, ...args);

const swError = (msg: string, ...args: unknown[]): void =>
  console.error(`%c SW v${SW_VERSION} %c ${msg}`, STYLE_ERR, STYLE_RESET, ...args);

// Activate immediately on install so navigator.serviceWorker.ready resolves
// on the very first page load without requiring a reload.
self.addEventListener("install", (event) => {
  swLog("install event fired — calling skipWaiting()");
  (event as ExtendableEvent).waitUntil(
    (self as unknown as ServiceWorkerGlobalScope)
      .skipWaiting()
      .then(() => swLog("skipWaiting() resolved — SW will activate immediately"))
      .catch((err) => swError("skipWaiting() failed:", err))
  );
});

// Claim all open windows so this SW controls them right away.
self.addEventListener("activate", (event) => {
  swLog("activate event fired — calling clients.claim()");
  (event as ExtendableEvent).waitUntil(
    (clients as Clients)
      .claim()
      .then(() => swLog("clients.claim() resolved — SW is now controlling all clients"))
      .catch((err) => swError("clients.claim() failed:", err))
  );
});

// Log messages sent from the page to the SW (rare, but useful for debugging).
self.addEventListener("message", (event) => {
  const me = event as ExtendableMessageEvent;
  swLog("message received from page:", me.data);
});

// Handle notification action button clicks and notification body clicks.
// Posts a NOTIFICATION_ACTION message back to the game page so it can
// dispatch the correct reducer action without the user needing to open the tab.
self.addEventListener("notificationclick", (event) => {
  const ne = event as NotificationEvent;
  const action = ne.action || "focus";
  swLog(`notificationclick fired — action="${action}", tag="${ne.notification.tag}"`);
  ne.notification.close();

  ne.waitUntil(
    (clients as Clients)
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const windowClients = clientList as WindowClient[];
        swLog(`matchAll found ${windowClients.length} window client(s)`);

        const client = windowClients[0];
        if (!client) {
          swWarn("No window clients found — cannot deliver NOTIFICATION_ACTION; user may need to re-open the tab");
          return;
        }

        swLog(`Posting NOTIFICATION_ACTION action="${action}" to client — url="${client.url}"`);
        // action is '' when the user clicks the notification body (not an action button)
        client.postMessage({
          type: "NOTIFICATION_ACTION",
          action,
          payload: ne.notification.data,
        });

        return client
          .focus()
          .then(() => swLog("client.focus() resolved — tab brought to foreground"))
          .catch((err) => swWarn("client.focus() failed (may be blocked by browser):", err));
      })
      .catch((err) => swError("notificationclick handler failed:", err))
  );
});

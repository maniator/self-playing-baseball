/// <reference lib="webworker" />
import { manifest, version } from "@parcel/service-worker";
import { createLogger } from "./utilities/logger";

// Singleton logger for the service worker.
// The main app uses the `appLog` singleton exported from utilities/logger.ts.
// `version` comes from @parcel/service-worker and changes every time the bundle changes,
// so it serves as a built-in version tag (no manual SW_VERSION constant needed).
const log = createLogger(`SW ${version.slice(0, 8)}`);

// ---------------------------------------------------------------------------
// Pre-caching — install all bundles from the Parcel manifest into a versioned
// cache so the app works offline and upgrades atomically.
// ---------------------------------------------------------------------------
async function install() {
  log.log(`install — pre-caching ${manifest.length} bundle(s)`);
  const cache = await caches.open(version);
  await cache.addAll(manifest);
  log.log("install — pre-cache complete, calling skipWaiting()");
  await (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
  log.log("skipWaiting() resolved — SW will activate immediately");
}

async function activate() {
  log.log("activate — cleaning up old caches");
  const keys = await caches.keys();
  const deleted = await Promise.all(
    keys.map(key => {
      if (key !== version) {
        log.log(`activate — deleting stale cache "${key}"`);
        return caches.delete(key);
      }
      return Promise.resolve(false);
    })
  );
  const count = deleted.filter(Boolean).length;
  log.log(`activate — removed ${count} stale cache(s), calling clients.claim()`);
  await (clients as Clients).claim();
  log.log("clients.claim() resolved — SW is now controlling all clients");
}

self.addEventListener("install",  (e) => (e as ExtendableEvent).waitUntil(install()));
self.addEventListener("activate", (e) => (e as ExtendableEvent).waitUntil(activate()));

// ---------------------------------------------------------------------------
// Network-first fetch with cache fallback for navigation requests.
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const fe = event as FetchEvent;
  // Only handle same-origin GET requests; let everything else pass through.
  if (fe.request.method !== "GET") return;
  try {
    const url = new URL(fe.request.url);
    if (url.origin !== location.origin) return;
  } catch {
    return;
  }

  fe.respondWith(
    fetch(fe.request)
      .then(response => {
        // Update the cache with the fresh response.
        const clone = response.clone();
        caches.open(version).then(cache => cache.put(fe.request, clone));
        return response;
      })
      .catch(() => caches.match(fe.request).then(r => r ?? Response.error()))
  );
});

// ---------------------------------------------------------------------------
// Log messages sent from the page to the SW (rare, but useful for debugging).
// ---------------------------------------------------------------------------
self.addEventListener("message", (event) => {
  const me = event as ExtendableMessageEvent;
  log.log("message received from page:", me.data);
});

// ---------------------------------------------------------------------------
// Handle notification action button clicks and notification body clicks.
// Posts a NOTIFICATION_ACTION message back to the game page so it can
// dispatch the correct reducer action without the user needing to open the tab.
// ---------------------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  const ne = event as NotificationEvent;
  const action = ne.action || "focus";
  log.log(`notificationclick fired — action="${action}", tag="${ne.notification.tag}"`);
  ne.notification.close();

  ne.waitUntil(
    (clients as Clients)
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const windowClients = clientList as WindowClient[];
        log.log(`matchAll found ${windowClients.length} window client(s)`);

        const client = windowClients[0];
        if (!client) {
          log.warn("No window clients found — cannot deliver NOTIFICATION_ACTION; user may need to re-open the tab");
          return;
        }

        log.log(`Posting NOTIFICATION_ACTION action="${action}" to client — url="${client.url}"`);
        client.postMessage({
          type: "NOTIFICATION_ACTION",
          action,
          payload: ne.notification.data,
        });

        return client
          .focus()
          .then(() => log.log("client.focus() resolved — tab brought to foreground"))
          .catch((err) => log.warn("client.focus() failed (may be blocked by browser):", err));
      })
      .catch((err) => log.error("notificationclick handler failed:", err))
  );
});


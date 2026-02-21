/// <reference lib="webworker" />

import { createLogger } from "@utils/logger";

// `self.__WB_MANIFEST` is injected by vite-plugin-pwa's injectManifest strategy at build
// time with an array of all pre-cached asset entries ({url, revision}).
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const WB_MANIFEST: Array<{ url: string; revision: string | null }> = self.__WB_MANIFEST ?? [];

// Derive a stable version string by hashing the full manifest so the cache
// name rotates whenever any entry URL or revision changes (including when
// revision is null for fingerprinted filenames, whose URL prefix is stable).
function hashManifest(entries: Array<{ url: string; revision: string | null }>): string {
  if (entries.length === 0) return "dev";
  const input = JSON.stringify(entries.map(({ url, revision }) => ({ url, revision })));
  let h = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV-1a 32-bit prime
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const version = hashManifest(WB_MANIFEST);

const log = createLogger(`SW ${version.slice(0, 8)}`);

// ---------------------------------------------------------------------------
// Pre-caching — install all bundles from the Workbox manifest into a versioned
// cache so the app works offline and upgrades atomically.
// ---------------------------------------------------------------------------
async function install() {
  log.log(`install — pre-caching ${WB_MANIFEST.length} bundle(s)`);
  const cache = await caches.open(version);
  await cache.addAll(WB_MANIFEST.map((e) => e.url));
  log.log("install — pre-cache complete, calling skipWaiting()");
  await (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
  log.log("skipWaiting() resolved — SW will activate immediately");
}

async function activate(): Promise<void> {
  log.log("activate — claiming clients");
  await (clients as Clients).claim();
}

self.addEventListener("install", (e) => (e as ExtendableEvent).waitUntil(install()));
self.addEventListener("activate", (e) => (e as ExtendableEvent).waitUntil(activate()));

self.addEventListener("fetch", (event) => {
  const fe = event as FetchEvent;
  if (fe.request.method !== "GET") return;
  try {
    const url = new URL(fe.request.url);
    if (url.origin !== location.origin) return;
  } catch {
    return;
  }

  fe.respondWith(
    fetch(fe.request)
      .then((response) => {
        const clone = response.clone();
        caches.open("ballgame-v1").then((cache) => cache.put(fe.request, clone));
        return response;
      })
      .catch(() => caches.match(fe.request).then((r) => r ?? Response.error())),
  );
});

self.addEventListener("message", (event) => {
  const me = event as ExtendableMessageEvent;
  log.log("message received from page:", me.data);
});

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
          log.warn("No window clients found — cannot deliver NOTIFICATION_ACTION");
          return;
        }

        log.log(`Posting NOTIFICATION_ACTION action="${action}" to client`);
        client.postMessage({
          type: "NOTIFICATION_ACTION",
          action,
          payload: ne.notification.data,
        });

        return client
          .focus()
          .then(() => log.log("client.focus() resolved"))
          .catch((err) => log.warn("client.focus() failed:", err));
      })
      .catch((err) => log.error("notificationclick handler failed:", err)),
  );
});

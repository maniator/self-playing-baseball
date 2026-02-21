/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precache } from "workbox-precaching";

import { createLogger } from "./utils/logger";

declare const self: ServiceWorkerGlobalScope;

const log = createLogger("SW");

// vite-plugin-pwa replaces self.__WB_MANIFEST at build time with the asset list.
precache(self.__WB_MANIFEST);
cleanupOutdatedCaches();

async function install(): Promise<void> {
  log.log("install — skipWaiting");
  await self.skipWaiting();
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

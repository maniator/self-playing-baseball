/// <reference lib="webworker" />

// Increment this tag whenever the SW changes so logs show the active version.
const SW_VERSION = "1.1.0";

const swLog = (...args: unknown[]): void =>
  console.log(`[SW v${SW_VERSION}]`, ...args);

const swError = (...args: unknown[]): void =>
  console.error(`[SW v${SW_VERSION}]`, ...args);

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
          swError("No window clients found — cannot deliver NOTIFICATION_ACTION");
          return;
        }

        swLog(`Posting NOTIFICATION_ACTION action="${action}" to client url="${client.url}"`);
        // action is '' when the user clicks the notification body (not a button)
        client.postMessage({
          type: "NOTIFICATION_ACTION",
          action,
          payload: ne.notification.data,
        });

        return client.focus().then(() => swLog("client.focus() resolved"));
      })
      .catch((err) => swError("notificationclick handler failed:", err))
  );
});

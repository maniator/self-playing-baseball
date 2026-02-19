/// <reference lib="webworker" />

// Activate immediately on install so navigator.serviceWorker.ready resolves
// on the very first page load without requiring a reload.
self.addEventListener("install", (event) => {
  (event as ExtendableEvent).waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).skipWaiting()
  );
});

// Claim all open windows so this SW controls them right away.
self.addEventListener("activate", (event) => {
  (event as ExtendableEvent).waitUntil(
    (clients as Clients).claim()
  );
});

// Handle notification action button clicks and notification body clicks.
// Posts a NOTIFICATION_ACTION message back to the game page so it can
// dispatch the correct reducer action without the user needing to open the tab.
self.addEventListener("notificationclick", (event) => {
  const ne = event as NotificationEvent;
  ne.notification.close();

  ne.waitUntil(
    (clients as Clients)
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const client = (clientList as WindowClient[])[0];
        if (!client) return;

        // action is '' when the user clicks the notification body (not a button)
        client.postMessage({
          type: "NOTIFICATION_ACTION",
          action: ne.action || "focus",
          payload: ne.notification.data,
        });

        return client.focus();
      })
  );
});

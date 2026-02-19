/// <reference lib="webworker" />

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

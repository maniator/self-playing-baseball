import * as React from "react";

export interface ServiceWorkerUpdateHook {
  updateAvailable: boolean;
  dismiss: () => void;
}

/**
 * Listens for a `SW_UPDATED` message posted by the service worker after it
 * activates and claims clients during a real app update (not first install).
 *
 * Returns `updateAvailable: true` when that message is received, prompting
 * the UI to show an update banner.  `dismiss()` hides the banner without
 * reloading — the user can reload manually later.
 */
export function useServiceWorkerUpdate(): ServiceWorkerUpdateHook {
  const [updateAvailable, setUpdateAvailable] = React.useState(false);

  React.useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        setUpdateAvailable(true);
      }
    };

    sw.addEventListener("message", handler);
    return () => sw.removeEventListener("message", handler);
  }, []);

  const dismiss = React.useCallback(() => setUpdateAvailable(false), []);

  return { updateAvailable, dismiss };
}

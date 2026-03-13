import * as React from "react";

import { useRegisterSW } from "virtual:pwa-register/react";

export interface ServiceWorkerUpdateHook {
  updateAvailable: boolean;
  dismiss: () => void;
  reload: () => void;
}

const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

/**
 * Registers the service worker via vite-plugin-pwa's `useRegisterSW` and
 * exposes update state to the UI.
 *
 * - `updateAvailable` becomes `true` when a new SW has installed and is
 *   waiting to take over (the user has not yet reloaded).
 * - `reload()` sends SKIP_WAITING to the waiting SW and reloads the page once
 *   the new SW is in control — guaranteeing the updated assets are served.
 * - `dismiss()` hides the banner without reloading; the SW stays waiting until
 *   the next reload.
 *
 * Update checks are also triggered on tab focus and every 60 minutes so the
 * app detects new versions even when installed as a PWA (where the browser's
 * built-in navigation-based update check never fires).
 */
export function useServiceWorkerUpdate(): ServiceWorkerUpdateHook {
  const registrationRef = React.useRef<ServiceWorkerRegistration | undefined>(undefined);

  // Allow E2E visual tests to force the banner visible without a real service
  // worker by navigating to /?_sw_update=1.  The value is captured once on
  // mount (lazy useState) so the URLSearchParams parse runs only once rather
  // than on every render.
  const [forceShow, setForceShow] = React.useState(() =>
    new URLSearchParams(window.location.search).has("_sw_update"),
  );

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration;
    },
  });

  React.useEffect(() => {
    const checkForUpdate = () => registrationRef.current?.update().catch(() => {});

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const intervalId = setInterval(checkForUpdate, UPDATE_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  const dismiss = React.useCallback(() => {
    setNeedRefresh(false);
    setForceShow(false);
  }, [setNeedRefresh]);
  const reload = React.useCallback(() => updateServiceWorker(true), [updateServiceWorker]);

  return { updateAvailable: needRefresh || forceShow, dismiss, reload };
}

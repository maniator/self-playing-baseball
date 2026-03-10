import * as React from "react";

import { appLog } from "@shared/utils/logger";

/**
 * Acquires a Screen Wake Lock while `active` is true, preventing the device
 * screen from dimming during an in-progress game.
 *
 * Falls back silently on browsers that do not support the Wake Lock API.
 * Re-acquires the lock automatically when the page regains visibility, since
 * browsers release wake locks automatically when a document is hidden.
 */
export const useWakeLock = (active: boolean): void => {
  const wakeLockRef = React.useRef<WakeLockSentinel | null>(null);

  const acquire = React.useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    if (wakeLockRef.current && !wakeLockRef.current.released) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch (err) {
      // Not a critical error — the app still works, screen may dim.
      appLog.warn("[wakeLock] Could not acquire screen wake lock:", err);
    }
  }, []);

  const release = React.useCallback(async () => {
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignore release errors.
      }
    }
    wakeLockRef.current = null;
  }, []);

  React.useEffect(() => {
    if (!active) {
      void release();
      return;
    }

    void acquire();

    // Reacquire after the page becomes visible again — browsers automatically
    // release wake locks when the document visibility changes to "hidden".
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void release();
    };
  }, [active, acquire, release]);
};

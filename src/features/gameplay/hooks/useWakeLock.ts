import * as React from "react";

import { appLog } from "@shared/utils/logger";

/**
 * Acquires a Screen Wake Lock while `active` is true, preventing the device
 * screen from dimming during an in-progress game.
 *
 * Falls back silently on browsers that do not support the Wake Lock API.
 * Re-acquires the lock automatically when the page regains visibility (browser
 * releases wake locks on tab hide) or when the OS drops it while the page is
 * still visible (e.g. power-saver policy).
 */
export const useWakeLock = (active: boolean): void => {
  const wakeLockRef = React.useRef<WakeLockSentinel | null>(null);
  // Keep a stable ref to `active` so the sentinel release handler can check
  // the current value without being re-created on every render.
  const activeRef = React.useRef(active);
  activeRef.current = active;

  const acquire = React.useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    if (wakeLockRef.current && !wakeLockRef.current.released) return;
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;

      // Reacquire if the OS drops the lock while the page is still active and
      // visible (e.g. power-saver policy). Browsers fire the sentinel's
      // "release" event in this case — separate from the visibilitychange path.
      // `once: true` ensures the listener auto-removes after firing; a sentinel
      // can only be released once.
      sentinel.addEventListener(
        "release",
        () => {
          if (activeRef.current && document.visibilityState === "visible") {
            // Clear the released sentinel before attempting a fresh acquire.
            wakeLockRef.current = null;
            void acquire();
          }
        },
        { once: true },
      );
    } catch (err) {
      // Not a critical error — the app still works, screen may dim.
      appLog.warn("[wakeLock] Could not acquire screen wake lock:", err);
    }
  }, []);

  const release = React.useCallback(async () => {
    // Clear the ref immediately (before awaiting) so concurrent calls are
    // idempotent and do not attempt to release the same sentinel twice.
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch {
        // Ignore release errors.
      }
    }
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

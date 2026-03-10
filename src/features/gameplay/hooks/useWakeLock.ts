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
  // Monotonically-increasing counter: each call to acquire() stamps the
  // in-flight request with the current value. If the counter advances before
  // the promise resolves (another acquire() started) or active has flipped
  // false, the resolved sentinel is stale and must be released immediately.
  const acquireIdRef = React.useRef(0);

  const acquire = React.useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    // Don't attempt to acquire when the document is hidden — the browser rejects
    // the request anyway. The visibilitychange handler will reacquire once the
    // page becomes visible again.
    if (document.visibilityState !== "visible") return;
    if (wakeLockRef.current && !wakeLockRef.current.released) return;
    const acquireId = ++acquireIdRef.current;
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      // Guard: discard the sentinel if deactivated/unmounted while the request
      // was in-flight, or if a newer acquire() call superseded this one.
      if (!activeRef.current || acquireIdRef.current !== acquireId) {
        try {
          await sentinel.release();
        } catch {
          // Ignore release errors on the stale sentinel.
        }
        return;
      }
      wakeLockRef.current = sentinel;

      // Reacquire if the OS drops the lock while the page is still active and
      // visible (e.g. power-saver policy). Browsers fire the sentinel's
      // "release" event in this case — separate from the visibilitychange path.
      // `once: true` ensures the listener auto-removes after firing; a sentinel
      // can only be released once.
      sentinel.addEventListener(
        "release",
        () => {
          // Only reacquire for an OS-policy drop, not for an explicit release()
          // call from cleanup/unmount. release() clears wakeLockRef.current
          // *before* awaiting sentinel.release(), so if the ref has already been
          // cleared the event was triggered by our own release call — skip.
          if (
            wakeLockRef.current === sentinel &&
            activeRef.current &&
            document.visibilityState === "visible"
          ) {
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
    // Invalidate any in-flight acquire() call so a concurrently-resolving
    // request does not store its sentinel after we've released.
    acquireIdRef.current++;
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

import * as loggerModule from "@shared/utils/logger";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWakeLock } from "./useWakeLock";

type ReleaseListener = () => void;

const makeMockSentinel = (overrides: Partial<WakeLockSentinel> = {}): WakeLockSentinel => {
  const listeners: ReleaseListener[] = [];
  const sentinel: any = {
    released: false,
    type: "screen",
    // Models the real WakeLockSentinel: sets released, fires listeners (once), clears them.
    release: vi.fn().mockImplementation(async () => {
      if (sentinel.released) return;
      sentinel.released = true;
      listeners.forEach((fn) => fn());
      listeners.length = 0;
    }),
    addEventListener: vi.fn((event: string, handler: ReleaseListener) => {
      if (event === "release") listeners.push(handler);
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(true),
    onrelease: null,
    // Helper to simulate the OS/browser dropping the lock (same semantics as release()).
    fireRelease: () => {
      if (sentinel.released) return;
      sentinel.released = true;
      listeners.forEach((fn) => fn());
      listeners.length = 0;
    },
    ...overrides,
  };
  return sentinel as WakeLockSentinel;
};

const installWakeLock = (sentinel: WakeLockSentinel) => {
  (navigator as any).wakeLock = {
    request: vi.fn().mockResolvedValue(sentinel),
  };
};

const removeWakeLock = () => {
  delete (navigator as any).wakeLock;
};

let originalVisibilityStateDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  originalVisibilityStateDescriptor = Object.getOwnPropertyDescriptor(document, "visibilityState");
  vi.spyOn(loggerModule.appLog, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  removeWakeLock();
  if (originalVisibilityStateDescriptor) {
    Object.defineProperty(document, "visibilityState", originalVisibilityStateDescriptor);
  } else {
    delete (document as any).visibilityState;
  }
});

describe("useWakeLock", () => {
  it("requests a screen wake lock when active is true", async () => {
    const sentinel = makeMockSentinel();
    installWakeLock(sentinel);

    await act(async () => {
      renderHook(() => useWakeLock(true));
    });

    expect((navigator as any).wakeLock.request).toHaveBeenCalledWith("screen");
  });

  it("does not request a wake lock when active is false", async () => {
    const sentinel = makeMockSentinel();
    installWakeLock(sentinel);

    await act(async () => {
      renderHook(() => useWakeLock(false));
    });

    expect((navigator as any).wakeLock.request).not.toHaveBeenCalled();
  });

  it("releases the wake lock when active flips to false", async () => {
    const sentinel = makeMockSentinel();
    installWakeLock(sentinel);

    const { rerender } = renderHook((active: boolean) => useWakeLock(active), {
      initialProps: true,
    });

    await act(async () => {});

    await act(async () => {
      rerender(false);
    });

    expect(sentinel.release).toHaveBeenCalledTimes(1);
  });

  it("releases the wake lock on unmount", async () => {
    const sentinel = makeMockSentinel();
    installWakeLock(sentinel);

    const { unmount } = renderHook(() => useWakeLock(true));
    await act(async () => {});

    await act(async () => {
      unmount();
    });

    expect(sentinel.release).toHaveBeenCalledTimes(1);
  });

  it("does not throw when Wake Lock API is unavailable", async () => {
    removeWakeLock();
    await act(async () => {
      expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
    });
  });

  it("logs a warning when wake lock request fails", async () => {
    (navigator as any).wakeLock = {
      request: vi.fn().mockRejectedValue(new Error("permission denied")),
    };

    await act(async () => {
      renderHook(() => useWakeLock(true));
    });

    await act(async () => {});

    expect(loggerModule.appLog.warn).toHaveBeenCalledWith(
      "[wakeLock] Could not acquire screen wake lock:",
      expect.any(Error),
    );
  });

  it("reacquires the wake lock when page becomes visible again", async () => {
    const sentinel = makeMockSentinel();
    installWakeLock(sentinel);

    await act(async () => {
      renderHook(() => useWakeLock(true));
    });

    // Simulate the browser releasing the lock (e.g., tab was hidden)
    (sentinel as any).released = true;

    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect((navigator as any).wakeLock.request).toHaveBeenCalledTimes(2);
  });

  it("does not request a new lock if existing lock is still held", async () => {
    const sentinel = makeMockSentinel({ released: false });
    installWakeLock(sentinel);

    await act(async () => {
      renderHook(() => useWakeLock(true));
    });

    // Trigger visibilitychange with an unreleased sentinel — acquire guard should block re-request
    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Should only have been called once (on mount)
    expect((navigator as any).wakeLock.request).toHaveBeenCalledTimes(1);
  });

  it("reacquires when the OS drops the lock while the page is still visible", async () => {
    const sentinel = makeMockSentinel();
    installWakeLock(sentinel);

    await act(async () => {
      renderHook(() => useWakeLock(true));
    });

    // Set up the next sentinel for the re-acquire call
    const sentinel2 = makeMockSentinel();
    (navigator as any).wakeLock.request.mockResolvedValueOnce(sentinel2);

    // Simulate OS releasing the lock (sentinel release event fires, page still visible)
    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      (sentinel as unknown as { fireRelease: () => void }).fireRelease();
    });

    expect((navigator as any).wakeLock.request).toHaveBeenCalledTimes(2);
  });

  it("does not reacquire from sentinel release event when page is hidden", async () => {
    const sentinel = makeMockSentinel();
    installWakeLock(sentinel);

    await act(async () => {
      renderHook(() => useWakeLock(true));
    });

    // Simulate OS releasing the lock but page is hidden (normal tab-switch flow)
    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      (sentinel as unknown as { fireRelease: () => void }).fireRelease();
    });

    // Should NOT reacquire — visibilitychange handler will do it when tab becomes visible
    expect((navigator as any).wakeLock.request).toHaveBeenCalledTimes(1);
  });

  it("does not reacquire on unmount even when page is visible and active was true", async () => {
    const sentinel = makeMockSentinel();
    installWakeLock(sentinel);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    const { unmount } = renderHook(() => useWakeLock(true));
    await act(async () => {});

    // Unmount while active=true and page is visible — cleanup calls release(),
    // which fires the sentinel release event. The handler must NOT reacquire.
    await act(async () => {
      unmount();
    });

    // release() triggered the sentinel release event, but the ref was already
    // cleared — so request should only have been called once (initial acquire).
    expect((navigator as any).wakeLock.request).toHaveBeenCalledTimes(1);
    expect(sentinel.release).toHaveBeenCalledTimes(1);
  });

  it("does not reacquire from sentinel release event when no longer active", async () => {
    const sentinel = makeMockSentinel();
    installWakeLock(sentinel);

    const { rerender } = renderHook((active: boolean) => useWakeLock(active), {
      initialProps: true,
    });
    await act(async () => {});

    // Deactivate the hook, then fire the release event
    await act(async () => {
      rerender(false);
    });

    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      (sentinel as unknown as { fireRelease: () => void }).fireRelease();
    });

    // Still only 1 call (the initial acquire); no re-acquire after deactivation
    expect((navigator as any).wakeLock.request).toHaveBeenCalledTimes(1);
  });

  it("releases stale sentinel when deactivated before request resolves", async () => {
    // Arrange: request promise won't resolve until we manually trigger it
    let resolveRequest!: (s: WakeLockSentinel) => void;
    const inflightPromise = new Promise<WakeLockSentinel>((res) => {
      resolveRequest = res;
    });
    (navigator as any).wakeLock = { request: vi.fn().mockReturnValue(inflightPromise) };
    const staleSentinel = makeMockSentinel();

    const { rerender } = renderHook((active: boolean) => useWakeLock(active), {
      initialProps: true as boolean,
    });

    // Deactivate before the in-flight request resolves
    await act(async () => {
      rerender(false);
    });

    // Now the in-flight request resolves — sentinel must be released immediately
    await act(async () => {
      resolveRequest(staleSentinel);
    });

    expect(staleSentinel.release).toHaveBeenCalledTimes(1);
    // The stale sentinel must NOT be stored (wakeLockRef stays null)
    expect((navigator as any).wakeLock.request).toHaveBeenCalledTimes(1);
  });

  it("releases stale sentinel when unmounted before request resolves", async () => {
    let resolveRequest!: (s: WakeLockSentinel) => void;
    const inflightPromise = new Promise<WakeLockSentinel>((res) => {
      resolveRequest = res;
    });
    (navigator as any).wakeLock = { request: vi.fn().mockReturnValue(inflightPromise) };
    const staleSentinel = makeMockSentinel();

    const { unmount } = renderHook(() => useWakeLock(true));

    // Unmount before the request resolves
    await act(async () => {
      unmount();
    });

    // Now the in-flight request resolves — sentinel must be released immediately
    await act(async () => {
      resolveRequest(staleSentinel);
    });

    expect(staleSentinel.release).toHaveBeenCalledTimes(1);
  });
});

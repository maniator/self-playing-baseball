import * as loggerModule from "@shared/utils/logger";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWakeLock } from "./useWakeLock";

const makeMockSentinel = (overrides: Partial<WakeLockSentinel> = {}): WakeLockSentinel => ({
  released: false,
  type: "screen",
  release: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn().mockReturnValue(true),
  onrelease: null,
  ...overrides,
});

const installWakeLock = (sentinel: WakeLockSentinel) => {
  (navigator as any).wakeLock = {
    request: vi.fn().mockResolvedValue(sentinel),
  };
};

const removeWakeLock = () => {
  delete (navigator as any).wakeLock;
};

beforeEach(() => {
  vi.spyOn(loggerModule.appLog, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  removeWakeLock();
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

    expect(sentinel.release).toHaveBeenCalled();
  });

  it("releases the wake lock on unmount", async () => {
    const sentinel = makeMockSentinel();
    installWakeLock(sentinel);

    const { unmount } = renderHook(() => useWakeLock(true));
    await act(async () => {});

    await act(async () => {
      unmount();
    });

    expect(sentinel.release).toHaveBeenCalled();
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
});

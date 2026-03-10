import * as React from "react";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useServiceWorkerUpdate } from "./useServiceWorkerUpdate";

describe("useServiceWorkerUpdate", () => {
  const mockSW = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  beforeEach(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: mockSW,
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  const getMessageHandler = (): ((e: MessageEvent) => void) => {
    const call = mockSW.addEventListener.mock.calls.find(([event]) => event === "message");
    if (!call) throw new Error("No 'message' listener registered on navigator.serviceWorker");
    return call[1] as (e: MessageEvent) => void;
  };

  it("registers a message listener on mount", () => {
    renderHook(() => useServiceWorkerUpdate());
    expect(mockSW.addEventListener).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("removes the message listener on unmount", () => {
    const { unmount } = renderHook(() => useServiceWorkerUpdate());
    unmount();
    expect(mockSW.removeEventListener).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("starts with updateAvailable = false", () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());
    expect(result.current.updateAvailable).toBe(false);
  });

  it("sets updateAvailable to true when SW_UPDATED message is received", () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());
    act(() => getMessageHandler()({ data: { type: "SW_UPDATED" } } as MessageEvent));
    expect(result.current.updateAvailable).toBe(true);
  });

  it("ignores messages with a different type", () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());
    act(() => getMessageHandler()({ data: { type: "NOTIFICATION_ACTION" } } as MessageEvent));
    expect(result.current.updateAvailable).toBe(false);
  });

  it("ignores messages with no data", () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());
    act(() => getMessageHandler()({ data: null } as MessageEvent));
    expect(result.current.updateAvailable).toBe(false);
  });

  it("dismiss() resets updateAvailable to false", () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());
    act(() => getMessageHandler()({ data: { type: "SW_UPDATED" } } as MessageEvent));
    expect(result.current.updateAvailable).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.updateAvailable).toBe(false);
  });

  it("does nothing when serviceWorker is unavailable", () => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    // Should not throw and should return the default state.
    const { result } = renderHook(() => useServiceWorkerUpdate());
    expect(result.current.updateAvailable).toBe(false);
    expect(mockSW.addEventListener).not.toHaveBeenCalled();
  });
});

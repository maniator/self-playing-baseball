import * as React from "react";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: vi.fn(),
}));

import { useRegisterSW } from "virtual:pwa-register/react";

import { useServiceWorkerUpdate } from "./useServiceWorkerUpdate";

const mockUseRegisterSW = vi.mocked(useRegisterSW);

describe("useServiceWorkerUpdate", () => {
  const mockSetNeedRefresh = vi.fn();
  const mockUpdateServiceWorker = vi.fn();

  // Capture the original visibilityState descriptor before any test mutates it
  // so it can be restored in afterEach, preventing cross-test state leakage.
  let originalVisibilityStateDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalVisibilityStateDescriptor = Object.getOwnPropertyDescriptor(
      document,
      "visibilityState",
    );
    vi.clearAllMocks();
    mockUseRegisterSW.mockReturnValue({
      needRefresh: [false, mockSetNeedRefresh],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: mockUpdateServiceWorker,
    });
  });

  afterEach(() => {
    if (originalVisibilityStateDescriptor) {
      Object.defineProperty(document, "visibilityState", originalVisibilityStateDescriptor);
    } else {
      delete (document as unknown as Record<string, unknown>).visibilityState;
    }
  });

  it("returns updateAvailable: false when needRefresh is false", () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());
    expect(result.current.updateAvailable).toBe(false);
  });

  it("returns updateAvailable: true when needRefresh is true", () => {
    mockUseRegisterSW.mockReturnValue({
      needRefresh: [true, mockSetNeedRefresh],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: mockUpdateServiceWorker,
    });
    const { result } = renderHook(() => useServiceWorkerUpdate());
    expect(result.current.updateAvailable).toBe(true);
  });

  it("dismiss() calls setNeedRefresh(false)", () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());
    act(() => result.current.dismiss());
    expect(mockSetNeedRefresh).toHaveBeenCalledWith(false);
  });

  it("reload() calls updateServiceWorker(true)", () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());
    act(() => result.current.reload());
    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
  });

  it("registers a visibilitychange listener and interval on mount", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    renderHook(() => useServiceWorkerUpdate());

    expect(addEventListenerSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60 * 60 * 1000);

    addEventListenerSpy.mockRestore();
    setIntervalSpy.mockRestore();
  });

  it("removes the visibilitychange listener and clears the interval on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { unmount } = renderHook(() => useServiceWorkerUpdate());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(clearIntervalSpy).toHaveBeenCalled();

    removeEventListenerSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it("calls registration.update() when the tab becomes visible after SW registers", () => {
    const mockRegistration = {
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    let capturedOnRegistered: ((swUrl: string, reg: ServiceWorkerRegistration) => void) | undefined;
    mockUseRegisterSW.mockImplementation((options) => {
      capturedOnRegistered = options?.onRegisteredSW;
      return {
        needRefresh: [false, mockSetNeedRefresh],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: mockUpdateServiceWorker,
      };
    });

    renderHook(() => useServiceWorkerUpdate());

    // Simulate SW registration — stores it in the ref
    act(() => capturedOnRegistered?.("/sw.js", mockRegistration));

    // Simulate tab becoming visible
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(mockRegistration.update).toHaveBeenCalled();
  });

  it("does not throw when visibilitychange fires before the SW registers", () => {
    renderHook(() => useServiceWorkerUpdate());

    // No registration set yet — ref is undefined; should be a safe no-op
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    expect(() => document.dispatchEvent(new Event("visibilitychange"))).not.toThrow();
  });
});

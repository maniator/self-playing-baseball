import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as announceModule from "@utils/announce";

import { useHomeScreenMusic } from "./useHomeScreenMusic";

afterEach(() => vi.restoreAllMocks());

describe("useHomeScreenMusic", () => {
  it("calls startHomeScreenMusic on mount", () => {
    const start = vi.spyOn(announceModule, "startHomeScreenMusic").mockImplementation(() => {});
    vi.spyOn(announceModule, "stopHomeScreenMusic").mockImplementation(() => {});
    renderHook(() => useHomeScreenMusic());
    expect(start).toHaveBeenCalledOnce();
  });

  it("calls stopHomeScreenMusic on unmount", () => {
    vi.spyOn(announceModule, "startHomeScreenMusic").mockImplementation(() => {});
    const stop = vi.spyOn(announceModule, "stopHomeScreenMusic").mockImplementation(() => {});
    const { unmount } = renderHook(() => useHomeScreenMusic());
    expect(stop).not.toHaveBeenCalled();
    unmount();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("does not restart music when re-rendered without unmounting", () => {
    const start = vi.spyOn(announceModule, "startHomeScreenMusic").mockImplementation(() => {});
    vi.spyOn(announceModule, "stopHomeScreenMusic").mockImplementation(() => {});
    const { rerender } = renderHook(() => useHomeScreenMusic());
    rerender();
    rerender();
    expect(start).toHaveBeenCalledOnce();
  });
});

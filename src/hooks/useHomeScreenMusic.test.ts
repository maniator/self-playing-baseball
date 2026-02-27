import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as announceModule from "@utils/announce";

import { useHomeScreenMusic } from "./useHomeScreenMusic";

afterEach(() => vi.restoreAllMocks());

describe("useHomeScreenMusic", () => {
  it("calls startHomeScreenMusic on mount when alertVolume > 0", () => {
    const start = vi.spyOn(announceModule, "startHomeScreenMusic").mockImplementation(() => {});
    vi.spyOn(announceModule, "stopHomeScreenMusic").mockImplementation(() => {});
    renderHook(() => useHomeScreenMusic(1));
    expect(start).toHaveBeenCalledOnce();
  });

  it("does not call startHomeScreenMusic when alertVolume is 0 (muted)", () => {
    const start = vi.spyOn(announceModule, "startHomeScreenMusic").mockImplementation(() => {});
    vi.spyOn(announceModule, "stopHomeScreenMusic").mockImplementation(() => {});
    renderHook(() => useHomeScreenMusic(0));
    expect(start).not.toHaveBeenCalled();
  });

  it("calls stopHomeScreenMusic when alertVolume is 0 (muted on mount)", () => {
    vi.spyOn(announceModule, "startHomeScreenMusic").mockImplementation(() => {});
    const stop = vi.spyOn(announceModule, "stopHomeScreenMusic").mockImplementation(() => {});
    renderHook(() => useHomeScreenMusic(0));
    expect(stop).toHaveBeenCalled();
  });

  it("calls stopHomeScreenMusic on unmount", () => {
    vi.spyOn(announceModule, "startHomeScreenMusic").mockImplementation(() => {});
    const stop = vi.spyOn(announceModule, "stopHomeScreenMusic").mockImplementation(() => {});
    const { unmount } = renderHook(() => useHomeScreenMusic(1));
    stop.mockClear();
    unmount();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("restarts music when transitioning from muted to unmuted", () => {
    const start = vi.spyOn(announceModule, "startHomeScreenMusic").mockImplementation(() => {});
    vi.spyOn(announceModule, "stopHomeScreenMusic").mockImplementation(() => {});
    const { rerender } = renderHook(({ vol }) => useHomeScreenMusic(vol), {
      initialProps: { vol: 0 },
    });
    expect(start).not.toHaveBeenCalled();
    rerender({ vol: 0.8 });
    expect(start).toHaveBeenCalledOnce();
  });

  it("stops music when transitioning from unmuted to muted", () => {
    vi.spyOn(announceModule, "startHomeScreenMusic").mockImplementation(() => {});
    const stop = vi.spyOn(announceModule, "stopHomeScreenMusic").mockImplementation(() => {});
    const { rerender } = renderHook(({ vol }) => useHomeScreenMusic(vol), {
      initialProps: { vol: 1 },
    });
    stop.mockClear();
    rerender({ vol: 0 });
    expect(stop).toHaveBeenCalled();
  });

  it("does not restart music when re-rendered with the same unmuted volume", () => {
    const start = vi.spyOn(announceModule, "startHomeScreenMusic").mockImplementation(() => {});
    vi.spyOn(announceModule, "stopHomeScreenMusic").mockImplementation(() => {});
    const { rerender } = renderHook(({ vol }) => useHomeScreenMusic(vol), {
      initialProps: { vol: 0.8 },
    });
    start.mockClear();
    rerender({ vol: 0.5 }); // still > 0 — no restart
    expect(start).not.toHaveBeenCalled();
  });
});

import { act, renderHook } from "@testing-library/react";
import type * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as announceModule from "@utils/announce";

import { useVolumeControls } from "./useVolumeControls";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("useVolumeControls", () => {
  it("returns default volumes of 1 when localStorage is empty", () => {
    const { result } = renderHook(() => useVolumeControls());
    expect(result.current.announcementVolume).toBe(1);
    expect(result.current.alertVolume).toBe(1);
  });

  it("syncs announcementVolume to audio module on mount", () => {
    const spy = vi.spyOn(announceModule, "setAnnouncementVolume").mockImplementation(() => {});
    renderHook(() => useVolumeControls());
    expect(spy).toHaveBeenCalledWith(1);
  });

  it("syncs alertVolume to audio module on mount", () => {
    const spy = vi.spyOn(announceModule, "setAlertVolume").mockImplementation(() => {});
    renderHook(() => useVolumeControls());
    expect(spy).toHaveBeenCalledWith(1);
  });

  it("handleAlertVolumeChange updates alertVolume", () => {
    const { result } = renderHook(() => useVolumeControls());
    act(() => {
      result.current.handleAlertVolumeChange({
        target: { value: "0.5" },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.alertVolume).toBe(0.5);
  });

  it("handleAnnouncementVolumeChange updates announcementVolume", () => {
    const { result } = renderHook(() => useVolumeControls());
    act(() => {
      result.current.handleAnnouncementVolumeChange({
        target: { value: "0.3" },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.announcementVolume).toBe(0.3);
  });

  it("handleToggleAlertMute mutes when volume > 0", () => {
    const { result } = renderHook(() => useVolumeControls());
    act(() => {
      result.current.handleToggleAlertMute();
    });
    expect(result.current.alertVolume).toBe(0);
  });

  it("handleToggleAlertMute restores volume when already muted", () => {
    const { result } = renderHook(() => useVolumeControls());
    // First mute
    act(() => {
      result.current.handleToggleAlertMute();
    });
    expect(result.current.alertVolume).toBe(0);
    // Then unmute — should restore to 1
    act(() => {
      result.current.handleToggleAlertMute();
    });
    expect(result.current.alertVolume).toBe(1);
  });

  it("handleToggleAnnouncementMute mutes when volume > 0", () => {
    const { result } = renderHook(() => useVolumeControls());
    act(() => {
      result.current.handleToggleAnnouncementMute();
    });
    expect(result.current.announcementVolume).toBe(0);
  });

  it("handleToggleAnnouncementMute restores volume when already muted", () => {
    const { result } = renderHook(() => useVolumeControls());
    act(() => {
      result.current.handleToggleAnnouncementMute();
    });
    act(() => {
      result.current.handleToggleAnnouncementMute();
    });
    expect(result.current.announcementVolume).toBe(1);
  });
});

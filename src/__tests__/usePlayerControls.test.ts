import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlayerControls } from "../GameControls/hooks/usePlayerControls";

afterEach(() => vi.restoreAllMocks());

const makeArgs = (overrides: Record<string, any> = {}) => ({
  managerMode: false,
  setManagerMode: vi.fn(),
  autoPlay: false,
  setAutoPlay: vi.fn(),
  announcementVolume: 1,
  setAnnouncementVolumeState: vi.fn(),
  alertVolume: 1,
  setAlertVolumeState: vi.fn(),
  setStrategy: vi.fn(),
  setManagedTeam: vi.fn(),
  dispatchLog: vi.fn(),
  ...overrides,
});

describe("usePlayerControls", () => {
  it("handleAutoPlayChange turning off autoPlay also turns off managerMode", () => {
    const setManagerMode = vi.fn();
    const setAutoPlay = vi.fn();
    const { result } = renderHook(() =>
      usePlayerControls(makeArgs({ managerMode: true, setManagerMode, setAutoPlay, autoPlay: true }))
    );
    act(() => {
      result.current.handleAutoPlayChange({ target: { checked: false } } as any);
    });
    expect(setAutoPlay).toHaveBeenCalledWith(false);
    expect(setManagerMode).toHaveBeenCalledWith(false);
  });

  it("handleAutoPlayChange enabling autoPlay does not touch managerMode", () => {
    const setManagerMode = vi.fn();
    const { result } = renderHook(() =>
      usePlayerControls(makeArgs({ managerMode: false, setManagerMode }))
    );
    act(() => {
      result.current.handleAutoPlayChange({ target: { checked: true } } as any);
    });
    expect(setManagerMode).not.toHaveBeenCalled();
  });

  it("handleManagerModeChange enabling manager mode requests notification permission", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    (Notification as any).permission = "default";
    (Notification as any).requestPermission = requestPermission;
    const { result } = renderHook(() => usePlayerControls(makeArgs()));
    await act(async () => {
      result.current.handleManagerModeChange({ target: { checked: true } } as any);
    });
    expect(requestPermission).toHaveBeenCalled();
  });

  it("handleAnnouncementVolumeChange clamps and calls setter", () => {
    const setAnnouncementVolumeState = vi.fn();
    const { result } = renderHook(() =>
      usePlayerControls(makeArgs({ setAnnouncementVolumeState }))
    );
    act(() => {
      result.current.handleAnnouncementVolumeChange({ target: { value: "0.5" } } as any);
    });
    expect(setAnnouncementVolumeState).toHaveBeenCalledWith(0.5);
  });

  it("handleToggleAnnouncementMute mutes when volume > 0", () => {
    const setAnnouncementVolumeState = vi.fn();
    const { result } = renderHook(() =>
      usePlayerControls(makeArgs({ announcementVolume: 0.8, setAnnouncementVolumeState }))
    );
    act(() => { result.current.handleToggleAnnouncementMute(); });
    expect(setAnnouncementVolumeState).toHaveBeenCalledWith(0);
  });

  it("handleToggleAlertMute mutes when alertVolume > 0", () => {
    const setAlertVolumeState = vi.fn();
    const { result } = renderHook(() =>
      usePlayerControls(makeArgs({ alertVolume: 0.5, setAlertVolumeState }))
    );
    act(() => { result.current.handleToggleAlertMute(); });
    expect(setAlertVolumeState).toHaveBeenCalledWith(0);
  });
});

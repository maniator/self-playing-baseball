/**
 * Tests for src/GameControls/hooks/
 */

import * as React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as rngModule from "../utilities/rng";
import * as announceModule from "../utilities/announce";
import { useGameRefs } from "../GameControls/hooks/useGameRefs";
import { useGameAudio } from "../GameControls/hooks/useGameAudio";
import { usePitchDispatch } from "../GameControls/hooks/usePitchDispatch";
import { useAutoPlayScheduler } from "../GameControls/hooks/useAutoPlayScheduler";
import { useKeyboardPitch } from "../GameControls/hooks/useKeyboardPitch";
import { usePlayerControls } from "../GameControls/hooks/usePlayerControls";
import { useShareReplay } from "../GameControls/hooks/useShareReplay";

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeGameSnapshot = (overrides = {}) => ({
  strikes: 0, balls: 0, baseLayout: [0, 0, 0] as [number, number, number],
  outs: 0, inning: 1, score: [0, 0] as [number, number],
  atBat: 0, pendingDecision: null, gameOver: false,
  onePitchModifier: null, teams: ["Away", "Home"] as [string, string],
  suppressNextDecision: false, pinchHitterStrategy: null,
  defensiveShift: false, defensiveShiftOffered: false,
  ...overrides,
});

// ---------------------------------------------------------------------------
// useGameRefs
// ---------------------------------------------------------------------------
describe("useGameRefs", () => {
  it("returns refs with correct initial values", () => {
    const snap = makeGameSnapshot();
    const { result } = renderHook(() =>
      useGameRefs(false, 1, 700, 0, 0, false, "balanced", 0, snap, null)
    );
    expect(result.current.autoPlayRef.current).toBe(false);
    expect(result.current.mutedRef.current).toBe(false);
    expect(result.current.speedRef.current).toBe(700);
    expect(result.current.strikesRef.current).toBe(0);
    expect(result.current.managerModeRef.current).toBe(false);
    expect(result.current.strategyRef.current).toBe("balanced");
    expect(result.current.managedTeamRef.current).toBe(0);
    expect(result.current.skipDecisionRef.current).toBe(false);
  });

  it("mutedRef is true when announcementVolume is 0", () => {
    const snap = makeGameSnapshot();
    const { result } = renderHook(() =>
      useGameRefs(false, 0, 700, 0, 0, false, "balanced", 0, snap, null)
    );
    expect(result.current.mutedRef.current).toBe(true);
  });

  it("sets skipDecisionRef when pendingDecision transitions null→non-null→null", () => {
    const snap = makeGameSnapshot();
    const pending = { kind: "bunt" as const };
    const { result, rerender } = renderHook(
      ({ pd }) => useGameRefs(false, 1, 700, 0, 0, false, "balanced", 0, snap, pd),
      { initialProps: { pd: null as typeof pending | null } }
    );
    expect(result.current.skipDecisionRef.current).toBe(false);
    rerender({ pd: pending });
    rerender({ pd: null });
    expect(result.current.skipDecisionRef.current).toBe(true);
  });

  it("skipDecisionRef persists across pitches (not reset after one pitch)", () => {
    const snap = makeGameSnapshot();
    const pending = { kind: "bunt" as const };
    // Start with non-zero count so we can test reset detection
    const { result, rerender } = renderHook(
      ({ pd, strikes, balls }) => useGameRefs(false, 1, 700, strikes, balls, false, "balanced", 0, snap, pd),
      { initialProps: { pd: null as typeof pending | null, strikes: 1, balls: 0 } }
    );
    // Trigger skip (decision resolved)
    rerender({ pd: pending, strikes: 1, balls: 0 });
    rerender({ pd: null, strikes: 1, balls: 0 });
    expect(result.current.skipDecisionRef.current).toBe(true);
    // Another pitch — count changes but NOT back to 0-0 → skip should persist
    rerender({ pd: null, strikes: 2, balls: 0 });
    expect(result.current.skipDecisionRef.current).toBe(true);
  });

  it("skipDecisionRef resets to false when new batter detected (count back to 0-0)", () => {
    const snap = makeGameSnapshot();
    const pending = { kind: "bunt" as const };
    const { result, rerender } = renderHook(
      ({ pd, strikes, balls }) => useGameRefs(false, 1, 700, strikes, balls, false, "balanced", 0, snap, pd),
      { initialProps: { pd: null as typeof pending | null, strikes: 1, balls: 0 } }
    );
    // Trigger skip
    rerender({ pd: pending, strikes: 1, balls: 0 });
    rerender({ pd: null, strikes: 1, balls: 0 });
    expect(result.current.skipDecisionRef.current).toBe(true);
    // New batter: count resets to 0-0
    rerender({ pd: null, strikes: 0, balls: 0 });
    expect(result.current.skipDecisionRef.current).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useGameAudio
// ---------------------------------------------------------------------------
describe("useGameAudio", () => {
  it("calls playVictoryFanfare when gameOver transitions false → true", () => {
    const fanfare = vi.spyOn(announceModule, "playVictoryFanfare").mockImplementation(() => {});
    const dispatchLog = vi.fn();
    const { rerender } = renderHook(
      ({ go }) => useGameAudio(1, 0, go, dispatchLog),
      { initialProps: { go: false } }
    );
    expect(fanfare).not.toHaveBeenCalled();
    rerender({ go: true });
    expect(fanfare).toHaveBeenCalledOnce();
  });

  it("does not call playVictoryFanfare when gameOver stays false", () => {
    const fanfare = vi.spyOn(announceModule, "playVictoryFanfare").mockImplementation(() => {});
    const dispatchLog = vi.fn();
    const { rerender } = renderHook(
      ({ go }) => useGameAudio(1, 0, go, dispatchLog),
      { initialProps: { go: false } }
    );
    rerender({ go: false });
    expect(fanfare).not.toHaveBeenCalled();
  });

  it("calls play7thInningStretch and logs message at inning 7, atBat 1", () => {
    const stretch = vi.spyOn(announceModule, "play7thInningStretch").mockImplementation(() => {});
    const dispatchLog = vi.fn();
    const { rerender } = renderHook(
      ({ inning, atBat }) => useGameAudio(inning, atBat, false, dispatchLog),
      { initialProps: { inning: 6, atBat: 0 } }
    );
    expect(stretch).not.toHaveBeenCalled();
    rerender({ inning: 7, atBat: 1 });
    expect(stretch).toHaveBeenCalledOnce();
    expect(dispatchLog).toHaveBeenCalledWith(expect.objectContaining({ type: "log" }));
  });

  it("returns a betweenInningsPauseRef that is set true on inning change", () => {
    const dispatchLog = vi.fn();
    vi.spyOn(announceModule, "play7thInningStretch").mockImplementation(() => {});
    const { result, rerender } = renderHook(
      ({ inning, atBat }) => useGameAudio(inning, atBat, false, dispatchLog),
      { initialProps: { inning: 1, atBat: 0 } }
    );
    rerender({ inning: 2, atBat: 0 });
    expect(result.current.current).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// usePitchDispatch
// ---------------------------------------------------------------------------
describe("usePitchDispatch", () => {
  const makeRefs = (overrides: Record<string, any> = {}) => {
    const snap = makeGameSnapshot(overrides.snap ?? {});
    return {
      gameStateRef: { current: snap } as React.MutableRefObject<typeof snap>,
      managerModeRef: { current: overrides.managerMode ?? false } as React.MutableRefObject<boolean>,
      strategyRef: { current: overrides.strategy ?? "balanced" } as React.MutableRefObject<any>,
      managedTeamRef: { current: overrides.managedTeam ?? 0 } as React.MutableRefObject<0 | 1>,
      skipDecisionRef: { current: overrides.skipDecision ?? false } as React.MutableRefObject<boolean>,
      strikesRef: { current: overrides.strikes ?? 0 } as React.MutableRefObject<number>,
    };
  };

  it("dispatches set_pending_decision when manager mode and decision available", () => {
    const dispatch = vi.fn();
    const dispatchLog = vi.fn();
    const refs = makeRefs({
      managerMode: true,
      snap: { baseLayout: [1, 0, 0] as [number, number, number], outs: 1, atBat: 0 },
    });
    vi.spyOn(rngModule, "random").mockReturnValue(0.5);

    const { result } = renderHook(() =>
      usePitchDispatch(dispatch, dispatchLog, refs.gameStateRef, refs.managerModeRef,
        refs.strategyRef, refs.managedTeamRef, refs.skipDecisionRef, refs.strikesRef)
    );
    act(() => { result.current.current(); });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "set_pending_decision" }));
  });

  it("dispatches strike when swing (random < swingRate)", () => {
    const dispatch = vi.fn();
    const dispatchLog = vi.fn();
    const refs = makeRefs();
    // swingRate with 0 strikes, balanced = round((500 - 75*0) * 1 * 1) = 500
    // random 0.001 → getRandomInt(1000) = 1 < 500 → swing
    vi.spyOn(rngModule, "random").mockReturnValueOnce(0.001).mockReturnValueOnce(0.5);

    const { result } = renderHook(() =>
      usePitchDispatch(dispatch, dispatchLog, refs.gameStateRef, refs.managerModeRef,
        refs.strategyRef, refs.managedTeamRef, refs.skipDecisionRef, refs.strikesRef)
    );
    act(() => { result.current.current(); });
    // Could be foul or strike — either is from a swing
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: expect.stringMatching(/^(strike|foul)$/) })
    );
  });

  it("dispatches hit when random >= 920", () => {
    const dispatch = vi.fn();
    const dispatchLog = vi.fn();
    const refs = makeRefs();
    // random 0.999 → getRandomInt(1000) = 999 >= 920 → hit
    vi.spyOn(rngModule, "random").mockReturnValueOnce(0.999).mockReturnValueOnce(0.1);

    const { result } = renderHook(() =>
      usePitchDispatch(dispatch, dispatchLog, refs.gameStateRef, refs.managerModeRef,
        refs.strategyRef, refs.managedTeamRef, refs.skipDecisionRef, refs.strikesRef)
    );
    act(() => { result.current.current(); });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "hit" }));
  });

  it("does nothing when gameOver is true", () => {
    const dispatch = vi.fn();
    const dispatchLog = vi.fn();
    const refs = makeRefs({ snap: { gameOver: true } });

    const { result } = renderHook(() =>
      usePitchDispatch(dispatch, dispatchLog, refs.gameStateRef, refs.managerModeRef,
        refs.strategyRef, refs.managedTeamRef, refs.skipDecisionRef, refs.strikesRef)
    );
    act(() => { result.current.current(); });
    expect(dispatch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useAutoPlayScheduler
// ---------------------------------------------------------------------------
describe("useAutoPlayScheduler", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("does not call handleClick when autoPlay is false", () => {
    const handleClick = vi.fn();
    const snap = makeGameSnapshot();
    renderHook(() =>
      useAutoPlayScheduler(
        false, null, false,
        { current: false } as any,
        { current: false } as any,
        { current: 700 } as any,
        { current: handleClick } as any,
        { current: snap } as any,
        { current: false } as any,
      )
    );
    vi.advanceTimersByTime(2000);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("pauses when pendingDecision is set and managerMode is true", () => {
    const handleClick = vi.fn();
    const snap = makeGameSnapshot();
    renderHook(() =>
      useAutoPlayScheduler(
        true, { kind: "bunt" as const }, true,
        { current: true } as any,
        { current: false } as any,
        { current: 700 } as any,
        { current: handleClick } as any,
        { current: snap } as any,
        { current: false } as any,
      )
    );
    vi.advanceTimersByTime(2000);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("calls handleClick after speed delay when autoPlay is true", () => {
    const handleClick = vi.fn();
    const snap = makeGameSnapshot();
    vi.spyOn(announceModule, "isSpeechPending").mockReturnValue(false);
    renderHook(() =>
      useAutoPlayScheduler(
        true, null, false,
        { current: true } as any,
        { current: true } as any, // muted
        { current: 100 } as any,
        { current: handleClick } as any,
        { current: snap } as any,
        { current: false } as any,
      )
    );
    vi.advanceTimersByTime(150);
    expect(handleClick).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useKeyboardPitch
// ---------------------------------------------------------------------------
describe("useKeyboardPitch", () => {
  it("calls handleClick on keyup when autoPlay is false", () => {
    const handleClick = vi.fn();
    renderHook(() =>
      useKeyboardPitch({ current: false } as any, { current: handleClick } as any)
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    });
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("does nothing on keyup when autoPlay is true", () => {
    const handleClick = vi.fn();
    renderHook(() =>
      useKeyboardPitch({ current: true } as any, { current: handleClick } as any)
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    });
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("removes keyup listener on unmount", () => {
    const handleClick = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardPitch({ current: false } as any, { current: handleClick } as any)
    );
    unmount();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    });
    expect(handleClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// usePlayerControls
// ---------------------------------------------------------------------------
describe("usePlayerControls", () => {
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

  it("handleAutoPlayChange turning off autoPlay also turns off managerMode", () => {
    const setManagerMode = vi.fn();
    const setAutoPlay = vi.fn();
    const args = makeArgs({ managerMode: true, setManagerMode, setAutoPlay, autoPlay: true });
    const { result } = renderHook(() => usePlayerControls(args));
    act(() => {
      result.current.handleAutoPlayChange({ target: { checked: false } } as any);
    });
    expect(setAutoPlay).toHaveBeenCalledWith(false);
    expect(setManagerMode).toHaveBeenCalledWith(false);
  });

  it("handleAutoPlayChange enabling autoPlay does not touch managerMode", () => {
    const setManagerMode = vi.fn();
    const args = makeArgs({ managerMode: false, setManagerMode });
    const { result } = renderHook(() => usePlayerControls(args));
    act(() => {
      result.current.handleAutoPlayChange({ target: { checked: true } } as any);
    });
    expect(setManagerMode).not.toHaveBeenCalled();
  });

  it("handleManagerModeChange enabling manager mode requests notification permission", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    (Notification as any).permission = "default";
    (Notification as any).requestPermission = requestPermission;
    const args = makeArgs();
    const { result } = renderHook(() => usePlayerControls(args));
    await act(async () => {
      result.current.handleManagerModeChange({ target: { checked: true } } as any);
    });
    expect(requestPermission).toHaveBeenCalled();
  });

  it("handleAnnouncementVolumeChange clamps and calls setter", () => {
    const setAnnouncementVolumeState = vi.fn();
    const args = makeArgs({ setAnnouncementVolumeState });
    const { result } = renderHook(() => usePlayerControls(args));
    act(() => {
      result.current.handleAnnouncementVolumeChange({ target: { value: "0.5" } } as any);
    });
    expect(setAnnouncementVolumeState).toHaveBeenCalledWith(0.5);
  });

  it("handleToggleAnnouncementMute mutes when volume > 0", () => {
    const setAnnouncementVolumeState = vi.fn();
    const args = makeArgs({ announcementVolume: 0.8, setAnnouncementVolumeState });
    const { result } = renderHook(() => usePlayerControls(args));
    act(() => { result.current.handleToggleAnnouncementMute(); });
    expect(setAnnouncementVolumeState).toHaveBeenCalledWith(0);
  });

  it("handleToggleAlertMute mutes when alertVolume > 0", () => {
    const setAlertVolumeState = vi.fn();
    const args = makeArgs({ alertVolume: 0.5, setAlertVolumeState });
    const { result } = renderHook(() => usePlayerControls(args));
    act(() => { result.current.handleToggleAlertMute(); });
    expect(setAlertVolumeState).toHaveBeenCalledWith(0);
  });
});

// ---------------------------------------------------------------------------
// useShareReplay
// ---------------------------------------------------------------------------
describe("useShareReplay", () => {
  it("copies URL to clipboard when navigator.clipboard is available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, writable: true, configurable: true });
    vi.spyOn(rngModule, "buildReplayUrl").mockReturnValue("https://example.com?seed=abc");
    const dispatchLog = vi.fn();

    const { result } = renderHook(() => useShareReplay({ managerMode: false, decisionLog: [], dispatchLog }));
    await act(async () => { result.current.handleShareReplay(); });
    expect(writeText).toHaveBeenCalledWith("https://example.com?seed=abc");
  });

  it("logs copied message after successful clipboard write", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, writable: true, configurable: true });
    vi.spyOn(rngModule, "buildReplayUrl").mockReturnValue("https://example.com?seed=abc");
    const dispatchLog = vi.fn();

    const { result } = renderHook(() => useShareReplay({ managerMode: false, decisionLog: [], dispatchLog }));
    await act(async () => { result.current.handleShareReplay(); });
    expect(dispatchLog).toHaveBeenCalledWith(expect.objectContaining({ type: "log" }));
  });

  it("passes decisionLog to buildReplayUrl when managerMode is true", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, writable: true, configurable: true });
    const spy = vi.spyOn(rngModule, "buildReplayUrl").mockReturnValue("https://example.com?seed=abc&decisions=1:skip");
    const dispatchLog = vi.fn();

    const { result } = renderHook(() =>
      useShareReplay({ managerMode: true, decisionLog: ["1:skip"], dispatchLog })
    );
    await act(async () => { result.current.handleShareReplay(); });
    expect(spy).toHaveBeenCalledWith(["1:skip"]);
  });

  it("does NOT pass decisionLog to buildReplayUrl when managerMode is false", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, writable: true, configurable: true });
    const spy = vi.spyOn(rngModule, "buildReplayUrl").mockReturnValue("https://example.com?seed=abc");
    const dispatchLog = vi.fn();

    const { result } = renderHook(() =>
      useShareReplay({ managerMode: false, decisionLog: ["1:skip"], dispatchLog })
    );
    await act(async () => { result.current.handleShareReplay(); });
    expect(spy).toHaveBeenCalledWith(undefined);
  });
});

// ---------------------------------------------------------------------------
// useReplayDecisions
// ---------------------------------------------------------------------------
import { useReplayDecisions } from "../GameControls/hooks/useReplayDecisions";
import * as rngModuleExtra from "../utilities/rng";

describe("useReplayDecisions", () => {
  it("dispatches skip_decision when entry matches pitchKey", () => {
    vi.spyOn(rngModuleExtra, "getDecisionsFromUrl").mockReturnValue(["5:skip"]);
    const dispatch = vi.fn();
    const pending = { kind: "bunt" as const };

    renderHook(() => useReplayDecisions(dispatch, pending, 5, "balanced"));
    expect(dispatch).toHaveBeenCalledWith({ type: "skip_decision" });
  });

  it("does not dispatch when pitchKey does not match", () => {
    vi.spyOn(rngModuleExtra, "getDecisionsFromUrl").mockReturnValue(["5:skip"]);
    const dispatch = vi.fn();
    const pending = { kind: "bunt" as const };

    renderHook(() => useReplayDecisions(dispatch, pending, 3, "balanced"));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when pendingDecision is null", () => {
    vi.spyOn(rngModuleExtra, "getDecisionsFromUrl").mockReturnValue(["5:skip"]);
    const dispatch = vi.fn();

    renderHook(() => useReplayDecisions(dispatch, null, 5, "balanced"));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatches bunt_attempt for bunt entries", () => {
    vi.spyOn(rngModuleExtra, "getDecisionsFromUrl").mockReturnValue(["7:bunt"]);
    const dispatch = vi.fn();
    const pending = { kind: "bunt" as const };

    renderHook(() => useReplayDecisions(dispatch, pending, 7, "contact"));
    expect(dispatch).toHaveBeenCalledWith({ type: "bunt_attempt", payload: { strategy: "contact" } });
  });

  it("dispatches set_one_pitch_modifier for take entries", () => {
    vi.spyOn(rngModuleExtra, "getDecisionsFromUrl").mockReturnValue(["2:take"]);
    const dispatch = vi.fn();
    const pending = { kind: "count30" as const };

    renderHook(() => useReplayDecisions(dispatch, pending, 2, "patient"));
    expect(dispatch).toHaveBeenCalledWith({ type: "set_one_pitch_modifier", payload: "take" });
  });

  it("dispatches steal_attempt with correct base and successPct", () => {
    vi.spyOn(rngModuleExtra, "getDecisionsFromUrl").mockReturnValue(["9:steal:1:80"]);
    const dispatch = vi.fn();
    const pending = { kind: "steal" as const, base: 1 as const, successPct: 80 };

    renderHook(() => useReplayDecisions(dispatch, pending, 9, "aggressive"));
    expect(dispatch).toHaveBeenCalledWith({
      type: "steal_attempt",
      payload: { base: 1, successPct: 80 },
    });
  });

  it("skips stale entries when pitchKey has advanced past entry (out-of-sync recovery)", () => {
    // Entry is at pitchKey 3, but we're now at pitchKey 8 — stale entry should be skipped
    // and the second entry at pitchKey 8 should fire.
    vi.spyOn(rngModuleExtra, "getDecisionsFromUrl").mockReturnValue(["3:skip", "8:skip"]);
    const dispatch = vi.fn();
    const pending = { kind: "bunt" as const };

    const { rerender } = renderHook(
      ({ pk }) => useReplayDecisions(dispatch, pending, pk, "balanced"),
      { initialProps: { pk: 8 } },
    );
    rerender({ pk: 8 });
    expect(dispatch).toHaveBeenCalledWith({ type: "skip_decision" });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});

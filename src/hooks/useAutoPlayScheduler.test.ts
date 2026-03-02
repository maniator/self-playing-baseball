import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as announceModule from "@utils/announce";

import { useAutoPlayScheduler } from "./useAutoPlayScheduler";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const makeSnap = (overrides: { gameOver?: boolean } = {}) => ({
  strikes: 0,
  balls: 0,
  baseLayout: [0, 0, 0] as [number, number, number],
  outs: 0,
  inning: 1,
  score: [0, 0] as [number, number],
  atBat: 0,
  pendingDecision: null,
  gameOver: false,
  onePitchModifier: null,
  teams: ["Away", "Home"] as [string, string],
  suppressNextDecision: false,
  pinchHitterStrategy: null,
  defensiveShift: false,
  defensiveShiftOffered: false,
  ...overrides,
});

/**
 * Helper that invokes useAutoPlayScheduler with the standard 9-argument
 * signature.
 */
const renderScheduler = ({
  gameStarted = false,
  pendingDecision = null as Parameters<typeof useAutoPlayScheduler>[1],
  managerMode = false,
  gameOver = false,
  mutedRef = { current: false } as any,
  speedRef = { current: 700 } as any,
  handleClickRef = { current: vi.fn() } as any,
  gameStateRef = { current: makeSnap() } as any,
  betweenInningsPauseRef = { current: false } as any,
} = {}) =>
  renderHook(
    (props) =>
      useAutoPlayScheduler(
        props.gameStarted,
        props.pendingDecision,
        props.managerMode,
        props.gameOver,
        props.mutedRef,
        props.speedRef,
        props.handleClickRef,
        props.gameStateRef,
        props.betweenInningsPauseRef,
      ),
    {
      initialProps: {
        gameStarted,
        pendingDecision,
        managerMode,
        gameOver,
        mutedRef,
        speedRef,
        handleClickRef,
        gameStateRef,
        betweenInningsPauseRef,
      },
    },
  );

describe("useAutoPlayScheduler", () => {
  it("does not call handleClick when game has not started", () => {
    const handleClick = vi.fn();
    renderScheduler({ gameStarted: false, handleClickRef: { current: handleClick } as any });
    vi.advanceTimersByTime(2000);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("pauses when pendingDecision is set and managerMode is true", () => {
    const handleClick = vi.fn();
    renderScheduler({
      gameStarted: true,
      pendingDecision: { kind: "bunt" as const },
      managerMode: true,
      handleClickRef: { current: handleClick } as any,
    });
    vi.advanceTimersByTime(2000);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("does not call handleClick when gameOver is true", () => {
    const handleClick = vi.fn();
    vi.spyOn(announceModule, "isSpeechPending").mockReturnValue(false);
    renderScheduler({
      gameStarted: true,
      gameOver: true,
      mutedRef: { current: true } as any,
      speedRef: { current: 100 } as any,
      handleClickRef: { current: handleClick } as any,
    });
    vi.advanceTimersByTime(500);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("calls handleClick after speed delay when game has started", () => {
    const handleClick = vi.fn();
    vi.spyOn(announceModule, "isSpeechPending").mockReturnValue(false);
    renderScheduler({
      gameStarted: true,
      mutedRef: { current: true } as any,
      speedRef: { current: 100 } as any,
      handleClickRef: { current: handleClick } as any,
    });
    vi.advanceTimersByTime(150);
    expect(handleClick).toHaveBeenCalled();
  });

  it("polls when speech is pending (not muted) then calls handleClick once speech clears", () => {
    const handleClick = vi.fn();
    vi.spyOn(announceModule, "isSpeechPending")
      .mockReturnValueOnce(true) // first tick: still speaking
      .mockReturnValue(false); // second tick: done

    renderScheduler({
      gameStarted: true,
      mutedRef: { current: false } as any, // NOT muted → speech check applies
      speedRef: { current: 100 } as any,
      handleClickRef: { current: handleClick } as any,
    });
    vi.advanceTimersByTime(100);
    expect(handleClick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("adds 1500ms pause when muted and betweenInningsPause is set", () => {
    const handleClick = vi.fn();
    vi.spyOn(announceModule, "isSpeechPending").mockReturnValue(false);
    const betweenInningsPauseRef = { current: true };

    renderScheduler({
      gameStarted: true,
      mutedRef: { current: true } as any, // muted
      speedRef: { current: 100 } as any,
      handleClickRef: { current: handleClick } as any,
      betweenInningsPauseRef: betweenInningsPauseRef as any,
    });
    vi.advanceTimersByTime(100);
    expect(handleClick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Bug regression: scheduler must restart after loading a new game when the
  // previous game was already over.
  // -------------------------------------------------------------------------

  it("restarts and calls handleClick when gameOver flips false→true→false (load over finished game)", () => {
    const handleClick = vi.fn();
    vi.spyOn(announceModule, "isSpeechPending").mockReturnValue(false);

    const { rerender } = renderScheduler({
      gameStarted: true,
      gameOver: false,
      mutedRef: { current: true } as any,
      speedRef: { current: 100 } as any,
      handleClickRef: { current: handleClick } as any,
    });

    // Advance until the first pitch fires (game in progress).
    vi.advanceTimersByTime(150);
    const callsAfterFirstGame = handleClick.mock.calls.length;
    expect(callsAfterFirstGame).toBeGreaterThan(0);

    // Game ends — scheduler should stop.
    rerender({
      gameStarted: true,
      gameOver: true,
      pendingDecision: null,
      managerMode: false,
      mutedRef: { current: true } as any,
      speedRef: { current: 100 } as any,
      handleClickRef: { current: handleClick } as any,
      gameStateRef: { current: makeSnap({ gameOver: true }) } as any,
      betweenInningsPauseRef: { current: false } as any,
    });
    handleClick.mockClear();
    vi.advanceTimersByTime(500);
    // No further calls while game is over.
    expect(handleClick).not.toHaveBeenCalled();

    // Load a new in-progress save → gameOver flips back to false.
    rerender({
      gameStarted: true,
      gameOver: false,
      pendingDecision: null,
      managerMode: false,
      mutedRef: { current: true } as any,
      speedRef: { current: 100 } as any,
      handleClickRef: { current: handleClick } as any,
      gameStateRef: { current: makeSnap({ gameOver: false }) } as any,
      betweenInningsPauseRef: { current: false } as any,
    });

    // Scheduler must restart and fire pitches.
    vi.advanceTimersByTime(200);
    expect(handleClick).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Bug regression: stale gameStateRef.gameOver must NOT permanently kill the
  // timer chain (same-component restore scenario — modal load or in-place restore).
  // -------------------------------------------------------------------------

  it("does not permanently stop when gameStateRef.current.gameOver is stale-true during a restore", () => {
    const handleClick = vi.fn();
    vi.spyOn(announceModule, "isSpeechPending").mockReturnValue(false);

    // The ref stays at gameOver=true (simulating a stale value from the previous
    // finished game) even though the effect deps say gameOver=false (restore fired).
    const staleGameStateRef = { current: makeSnap({ gameOver: true }) };

    renderScheduler({
      gameStarted: true,
      gameOver: false, // effect-level guard says game is in progress
      mutedRef: { current: true } as any,
      speedRef: { current: 100 } as any,
      handleClickRef: { current: handleClick } as any,
      gameStateRef: staleGameStateRef as any,
    });

    // The timer chain must survive even though gameStateRef reports gameOver.
    vi.advanceTimersByTime(300);
    expect(handleClick).toHaveBeenCalled();
  });

  it("catches exceptions from handleClick, logs them, and continues scheduling", () => {
    const handleClickError = new Error("Simulated pitch processing error");
    const handleClick = vi.fn(() => {
      throw handleClickError;
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(announceModule, "isSpeechPending").mockReturnValue(false);

    renderScheduler({
      gameStarted: true,
      mutedRef: { current: true } as any,
      speedRef: { current: 1000 } as any,
      handleClickRef: { current: handleClick } as any,
      gameStateRef: {
        current: makeSnap({
          inning: 7,
          outs: 1,
          atBat: 0,
          pitchKey: 42,
        }),
      } as any,
    });

    // Advance to trigger first handleClick (which throws).
    vi.advanceTimersByTime(1100);
    const firstCallCount = handleClick.mock.calls.length;
    expect(firstCallCount).toBeGreaterThan(0);

    // The error should be logged (appLog adds formatting).
    expect(errorSpy).toHaveBeenCalled();
    const errorCall = errorSpy.mock.calls[0];
    expect(String(errorCall[0]) + String(errorCall[1])).toContain(
      "Autoplay scheduler error at inning 7",
    );

    // Clear mocks and advance further; the scheduler should have been
    // rescheduled and called handleClick again despite the exception.
    handleClick.mockClear();
    errorSpy.mockClear();
    vi.advanceTimersByTime(2000);
    expect(handleClick).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

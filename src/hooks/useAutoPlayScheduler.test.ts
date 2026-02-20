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

const makeSnap = () => ({
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
});

describe("useAutoPlayScheduler", () => {
  it("does not call handleClick when autoPlay is false", () => {
    const handleClick = vi.fn();
    renderHook(() =>
      useAutoPlayScheduler(
        false,
        null,
        false,
        { current: false } as any,
        { current: false } as any,
        { current: 700 } as any,
        { current: handleClick } as any,
        { current: makeSnap() } as any,
        { current: false } as any,
      ),
    );
    vi.advanceTimersByTime(2000);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("pauses when pendingDecision is set and managerMode is true", () => {
    const handleClick = vi.fn();
    renderHook(() =>
      useAutoPlayScheduler(
        true,
        { kind: "bunt" as const },
        true,
        { current: true } as any,
        { current: false } as any,
        { current: 700 } as any,
        { current: handleClick } as any,
        { current: makeSnap() } as any,
        { current: false } as any,
      ),
    );
    vi.advanceTimersByTime(2000);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("calls handleClick after speed delay when autoPlay is true", () => {
    const handleClick = vi.fn();
    vi.spyOn(announceModule, "isSpeechPending").mockReturnValue(false);
    renderHook(() =>
      useAutoPlayScheduler(
        true,
        null,
        false,
        { current: true } as any,
        { current: true } as any,
        { current: 100 } as any,
        { current: handleClick } as any,
        { current: makeSnap() } as any,
        { current: false } as any,
      ),
    );
    vi.advanceTimersByTime(150);
    expect(handleClick).toHaveBeenCalled();
  });
});

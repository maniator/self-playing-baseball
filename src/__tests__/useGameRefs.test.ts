import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGameRefs } from "../GameControls/hooks/useGameRefs";

afterEach(() => vi.restoreAllMocks());

const makeGameSnapshot = (overrides = {}) => ({
  strikes: 0, balls: 0, baseLayout: [0, 0, 0] as [number, number, number],
  outs: 0, inning: 1, score: [0, 0] as [number, number],
  atBat: 0, pendingDecision: null, gameOver: false,
  onePitchModifier: null, teams: ["Away", "Home"] as [string, string],
  suppressNextDecision: false, pinchHitterStrategy: null,
  defensiveShift: false, defensiveShiftOffered: false,
  ...overrides,
});

describe("useGameRefs", () => {
  it("returns refs with correct initial values", () => {
    const snap = makeGameSnapshot();
    const { result } = renderHook(() =>
      useGameRefs({ autoPlay: false, announcementVolume: 1, speed: 700, strikes: 0, balls: 0, managerMode: false, strategy: "balanced", managedTeam: 0, gameSnapshot: snap, pendingDecision: null })
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
      useGameRefs({ autoPlay: false, announcementVolume: 0, speed: 700, strikes: 0, balls: 0, managerMode: false, strategy: "balanced", managedTeam: 0, gameSnapshot: snap, pendingDecision: null })
    );
    expect(result.current.mutedRef.current).toBe(true);
  });

  it("sets skipDecisionRef when pendingDecision transitions null→non-null→null", () => {
    const snap = makeGameSnapshot();
    const pending = { kind: "bunt" as const };
    const { result, rerender } = renderHook(
      ({ pd }) => useGameRefs({ autoPlay: false, announcementVolume: 1, speed: 700, strikes: 0, balls: 0, managerMode: false, strategy: "balanced", managedTeam: 0, gameSnapshot: snap, pendingDecision: pd }),
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
    const { result, rerender } = renderHook(
      ({ pd, strikes, balls }) => useGameRefs({ autoPlay: false, announcementVolume: 1, speed: 700, strikes, balls, managerMode: false, strategy: "balanced", managedTeam: 0, gameSnapshot: snap, pendingDecision: pd }),
      { initialProps: { pd: null as typeof pending | null, strikes: 1, balls: 0 } }
    );
    rerender({ pd: pending, strikes: 1, balls: 0 });
    rerender({ pd: null, strikes: 1, balls: 0 });
    expect(result.current.skipDecisionRef.current).toBe(true);
    rerender({ pd: null, strikes: 2, balls: 0 });
    expect(result.current.skipDecisionRef.current).toBe(true);
  });

  it("skipDecisionRef resets to false when new batter detected (count back to 0-0)", () => {
    const snap = makeGameSnapshot();
    const pending = { kind: "bunt" as const };
    const { result, rerender } = renderHook(
      ({ pd, strikes, balls }) => useGameRefs({ autoPlay: false, announcementVolume: 1, speed: 700, strikes, balls, managerMode: false, strategy: "balanced", managedTeam: 0, gameSnapshot: snap, pendingDecision: pd }),
      { initialProps: { pd: null as typeof pending | null, strikes: 1, balls: 0 } }
    );
    rerender({ pd: pending, strikes: 1, balls: 0 });
    rerender({ pd: null, strikes: 1, balls: 0 });
    expect(result.current.skipDecisionRef.current).toBe(true);
    rerender({ pd: null, strikes: 0, balls: 0 });
    expect(result.current.skipDecisionRef.current).toBe(false);
  });
});

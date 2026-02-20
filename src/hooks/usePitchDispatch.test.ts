import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as rngModule from "@utils/rng";
import { usePitchDispatch } from "./usePitchDispatch";

afterEach(() => vi.restoreAllMocks());

const makeGameSnapshot = (overrides: Record<string, any> = {}) => ({
  strikes: 0, balls: 0, baseLayout: [0, 0, 0] as [number, number, number],
  outs: 0, inning: 1, score: [0, 0] as [number, number],
  atBat: 0, pendingDecision: null, gameOver: false,
  onePitchModifier: null, teams: ["Away", "Home"] as [string, string],
  suppressNextDecision: false, pinchHitterStrategy: null,
  defensiveShift: false, defensiveShiftOffered: false,
  ...overrides,
});

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

describe("usePitchDispatch", () => {
  it("dispatches set_pending_decision when manager mode and decision available", () => {
    const dispatch = vi.fn();
    const refs = makeRefs({
      managerMode: true,
      snap: { baseLayout: [1, 0, 0] as [number, number, number], outs: 1, atBat: 0 },
    });
    vi.spyOn(rngModule, "random").mockReturnValue(0.5);

    const { result } = renderHook(() =>
      usePitchDispatch(dispatch, vi.fn(), refs.gameStateRef, refs.managerModeRef,
        refs.strategyRef, refs.managedTeamRef, refs.skipDecisionRef, refs.strikesRef)
    );
    act(() => { result.current.current(); });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "set_pending_decision" }));
  });

  it("dispatches strike when swing (random < swingRate)", () => {
    const dispatch = vi.fn();
    const refs = makeRefs();
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5);

    const { result } = renderHook(() =>
      usePitchDispatch(dispatch, vi.fn(), refs.gameStateRef, refs.managerModeRef,
        refs.strategyRef, refs.managedTeamRef, refs.skipDecisionRef, refs.strikesRef)
    );
    act(() => { result.current.current(); });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: expect.stringMatching(/^(strike|foul)$/) })
    );
  });

  it("dispatches hit when random >= 920", () => {
    const dispatch = vi.fn();
    const refs = makeRefs();
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.1);

    const { result } = renderHook(() =>
      usePitchDispatch(dispatch, vi.fn(), refs.gameStateRef, refs.managerModeRef,
        refs.strategyRef, refs.managedTeamRef, refs.skipDecisionRef, refs.strikesRef)
    );
    act(() => { result.current.current(); });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "hit" }));
  });

  it("does nothing when gameOver is true", () => {
    const dispatch = vi.fn();
    const refs = makeRefs({ snap: { gameOver: true } });

    const { result } = renderHook(() =>
      usePitchDispatch(dispatch, vi.fn(), refs.gameStateRef, refs.managerModeRef,
        refs.strategyRef, refs.managedTeamRef, refs.skipDecisionRef, refs.strikesRef)
    );
    act(() => { result.current.current(); });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does NOT re-offer bunt after skip — skipDecisionRef stays set until new batter", () => {
    const dispatch = vi.fn();
    const refs = makeRefs({
      managerMode: true, managedTeam: 0,
      snap: { atBat: 0, baseLayout: [1, 0, 0] as [number, number, number], outs: 0, balls: 0, strikes: 0 },
    });
    const { result } = renderHook(() =>
      usePitchDispatch(dispatch, vi.fn(), refs.gameStateRef, refs.managerModeRef,
        refs.strategyRef, refs.managedTeamRef, refs.skipDecisionRef, refs.strikesRef)
    );
    act(() => { result.current.current(); });
    expect(dispatch).toHaveBeenCalledWith({ type: "set_pending_decision", payload: { kind: "bunt" } });
    dispatch.mockClear();

    refs.skipDecisionRef.current = true;

    act(() => { result.current.current(); });
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "set_pending_decision", payload: expect.objectContaining({ kind: "bunt" }) })
    );
  });
});

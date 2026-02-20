import * as React from "react";

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as rngModule from "@utils/rng";

import { usePitchDispatch } from "./usePitchDispatch";

afterEach(() => vi.restoreAllMocks());

const makeGameSnapshot = (overrides: Record<string, any> = {}) => ({
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

const makeRefs = (overrides: Record<string, any> = {}) => {
  const snap = makeGameSnapshot(overrides.snap ?? {});
  return {
    gameStateRef: { current: snap } as React.MutableRefObject<typeof snap>,
    managerModeRef: { current: overrides.managerMode ?? false } as React.MutableRefObject<boolean>,
    strategyRef: { current: overrides.strategy ?? "balanced" } as React.MutableRefObject<any>,
    managedTeamRef: { current: overrides.managedTeam ?? 0 } as React.MutableRefObject<0 | 1>,
    skipDecisionRef: {
      current: overrides.skipDecision ?? false,
    } as React.MutableRefObject<boolean>,
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
      usePitchDispatch(
        dispatch,
        refs.gameStateRef,
        refs.managerModeRef,
        refs.strategyRef,
        refs.managedTeamRef,
        refs.skipDecisionRef,
        refs.strikesRef,
      ),
    );
    act(() => {
      result.current.current();
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "set_pending_decision" }),
    );
  });

  it("dispatches strike when swing (random < swingRate)", () => {
    const dispatch = vi.fn();
    const refs = makeRefs();
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5);

    const { result } = renderHook(() =>
      usePitchDispatch(
        dispatch,
        refs.gameStateRef,
        refs.managerModeRef,
        refs.strategyRef,
        refs.managedTeamRef,
        refs.skipDecisionRef,
        refs.strikesRef,
      ),
    );
    act(() => {
      result.current.current();
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: expect.stringMatching(/^(strike|foul)$/) }),
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
      usePitchDispatch(
        dispatch,
        refs.gameStateRef,
        refs.managerModeRef,
        refs.strategyRef,
        refs.managedTeamRef,
        refs.skipDecisionRef,
        refs.strikesRef,
      ),
    );
    act(() => {
      result.current.current();
    });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "hit" }));
  });

  it("does nothing when gameOver is true", () => {
    const dispatch = vi.fn();
    const refs = makeRefs({ snap: { gameOver: true } });

    const { result } = renderHook(() =>
      usePitchDispatch(
        dispatch,
        refs.gameStateRef,
        refs.managerModeRef,
        refs.strategyRef,
        refs.managedTeamRef,
        refs.skipDecisionRef,
        refs.strikesRef,
      ),
    );
    act(() => {
      result.current.current();
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatches hit with contact strategy — Triple (hitRoll 8–9)", () => {
    const dispatch = vi.fn();
    const refs = makeRefs({ strategy: "contact" });
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0) // pitch type
      .mockReturnValueOnce(0.999) // main roll >= 920 → hit
      .mockReturnValueOnce(0.09); // hitRoll = 9, 8 <= 9 < 10 → Triple

    const { result } = renderHook(() =>
      usePitchDispatch(
        dispatch,
        refs.gameStateRef,
        refs.managerModeRef,
        refs.strategyRef,
        refs.managedTeamRef,
        refs.skipDecisionRef,
        refs.strikesRef,
      ),
    );
    act(() => {
      result.current.current();
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 2 }) }),
    );
  });

  it("dispatches hit with contact strategy — Double (hitRoll 10–27)", () => {
    const dispatch = vi.fn();
    const refs = makeRefs({ strategy: "contact" });
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.19); // hitRoll = 19, 10 <= 19 < 28 → Double

    const { result } = renderHook(() =>
      usePitchDispatch(
        dispatch,
        refs.gameStateRef,
        refs.managerModeRef,
        refs.strategyRef,
        refs.managedTeamRef,
        refs.skipDecisionRef,
        refs.strikesRef,
      ),
    );
    act(() => {
      result.current.current();
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 1 }) }),
    );
  });

  it("dispatches hit with default strategy — Triple (hitRoll 13–14)", () => {
    const dispatch = vi.fn();
    const refs = makeRefs({ strategy: "balanced" });
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.14); // hitRoll = 14, 13 <= 14 < 15 → Triple

    const { result } = renderHook(() =>
      usePitchDispatch(
        dispatch,
        refs.gameStateRef,
        refs.managerModeRef,
        refs.strategyRef,
        refs.managedTeamRef,
        refs.skipDecisionRef,
        refs.strikesRef,
      ),
    );
    act(() => {
      result.current.current();
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 2 }) }),
    );
  });

  it("dispatches hit with default strategy — Double (hitRoll 15–34)", () => {
    const dispatch = vi.fn();
    const refs = makeRefs({ strategy: "balanced" });
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.25); // hitRoll = 25, 15 <= 25 < 35 → Double

    const { result } = renderHook(() =>
      usePitchDispatch(
        dispatch,
        refs.gameStateRef,
        refs.managerModeRef,
        refs.strategyRef,
        refs.managedTeamRef,
        refs.skipDecisionRef,
        refs.strikesRef,
      ),
    );
    act(() => {
      result.current.current();
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 1 }) }),
    );
  });
});

describe("usePitchDispatch — power strategy hits", () => {
  const makeHitRefs = (hitRoll: number) => {
    const refs = makeRefs({ strategy: "power" });
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0) // pitch type
      .mockReturnValueOnce(0.999) // main roll >= 920 → hit
      .mockReturnValueOnce(hitRoll / 100);
    return refs;
  };

  const dispatchAndGet = (refs: ReturnType<typeof makeRefs>) => {
    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      usePitchDispatch(
        dispatch,
        refs.gameStateRef,
        refs.managerModeRef,
        refs.strategyRef,
        refs.managedTeamRef,
        refs.skipDecisionRef,
        refs.strikesRef,
      ),
    );
    act(() => {
      result.current.current();
    });
    return dispatch;
  };

  it("power Homerun (hitRoll < 20)", () => {
    const dispatch = dispatchAndGet(makeHitRefs(10));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 3 }) }),
    );
  });

  it("power Triple (hitRoll 20–22)", () => {
    const dispatch = dispatchAndGet(makeHitRefs(21));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 2 }) }),
    );
  });

  it("power Double (hitRoll 23–42)", () => {
    const dispatch = dispatchAndGet(makeHitRefs(33));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 1 }) }),
    );
  });

  it("power Single (hitRoll >= 43)", () => {
    const dispatch = dispatchAndGet(makeHitRefs(55));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 0 }) }),
    );
  });
});

describe("usePitchDispatch — suppressNextDecision", () => {
  it("dispatches clear_suppress_decision when suppressNextDecision is true", () => {
    const dispatch = vi.fn();
    vi.spyOn(rngModule, "random").mockReturnValue(0.5);
    const refs = makeRefs({
      managerMode: true,
      managedTeam: 0,
      snap: {
        atBat: 0,
        balls: 0,
        strikes: 0,
        baseLayout: [0, 0, 0] as [number, number, number],
        outs: 0,
        suppressNextDecision: true,
        defensiveShiftOffered: true, // already offered, so shift prompt is skipped
      },
    });
    const { result } = renderHook(() =>
      usePitchDispatch(
        dispatch,
        refs.gameStateRef,
        refs.managerModeRef,
        refs.strategyRef,
        refs.managedTeamRef,
        refs.skipDecisionRef,
        refs.strikesRef,
      ),
    );
    act(() => {
      result.current.current();
    });
    expect(dispatch).toHaveBeenCalledWith({ type: "clear_suppress_decision" });
  });
});

describe("usePitchDispatch — skip decision", () => {
  it("does NOT re-offer bunt after skip — skipDecisionRef stays set until new batter", () => {
    const dispatch = vi.fn();
    const refs = makeRefs({
      managerMode: true,
      managedTeam: 0,
      snap: {
        atBat: 0,
        baseLayout: [1, 0, 0] as [number, number, number],
        outs: 0,
        balls: 0,
        strikes: 0,
      },
    });
    const { result } = renderHook(() =>
      usePitchDispatch(
        dispatch,
        refs.gameStateRef,
        refs.managerModeRef,
        refs.strategyRef,
        refs.managedTeamRef,
        refs.skipDecisionRef,
        refs.strikesRef,
      ),
    );
    act(() => {
      result.current.current();
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_pending_decision",
      payload: { kind: "bunt" },
    });
    dispatch.mockClear();

    refs.skipDecisionRef.current = true;

    act(() => {
      result.current.current();
    });
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: "set_pending_decision",
        payload: expect.objectContaining({ kind: "bunt" }),
      }),
    );
  });
});

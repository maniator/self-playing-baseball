import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { State } from "@context/index";
import * as rngModule from "@utils/rng";

import { usePitchDispatch } from "./usePitchDispatch";

afterEach(() => vi.restoreAllMocks());

const makeTestState = (overrides: Partial<State> = {}): State => ({
  strikes: 0,
  balls: 0,
  baseLayout: [0, 0, 0],
  outs: 0,
  inning: 1,
  score: [0, 0],
  atBat: 0,
  pendingDecision: null,
  gameOver: false,
  onePitchModifier: null,
  teams: ["Away", "Home"],
  suppressNextDecision: false,
  pinchHitterStrategy: null,
  defensiveShift: false,
  defensiveShiftOffered: false,
  pitchKey: 0,
  teamLabels: ["Away", "Home"],
  decisionLog: [],
  lineupOrder: [[], []],
  playerOverrides: {},
  batterNum: [0, 0],
  resolvedMods: {},
  rosterBench: [[], []],
  activePitcher: [null, null],
  playLog: [],
  inningRuns: [[], []],
  ...overrides,
});

describe("usePitchDispatch", () => {
  it("dispatches set_pending_decision when manager mode and decision available", () => {
    const dispatch = vi.fn();
    const state = makeTestState({ baseLayout: [1, 0, 0], outs: 1, atBat: 0 });
    vi.spyOn(rngModule, "random").mockReturnValue(0.5);

    const { result } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: true,
        strategy: "balanced",
        managedTeam: 0,
        skipDecision: false,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result.current();
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "set_pending_decision" }),
    );
  });

  it("dispatches strike when swing (random < swingRate)", () => {
    const dispatch = vi.fn();
    const state = makeTestState({ defensiveShiftOffered: true });
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0.5);

    const { result } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: false,
        strategy: "balanced",
        managedTeam: 0,
        skipDecision: false,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result.current();
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: expect.stringMatching(/^(strike|foul)$/) }),
    );
  });

  it("dispatches hit when random >= 920", () => {
    const dispatch = vi.fn();
    const state = makeTestState({ defensiveShiftOffered: true });
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.1);

    const { result } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: false,
        strategy: "balanced",
        managedTeam: 0,
        skipDecision: false,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result.current();
    });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "hit" }));
  });

  it("does nothing when gameOver is true", () => {
    const dispatch = vi.fn();
    const state = makeTestState({ gameOver: true });

    const { result } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: false,
        strategy: "balanced",
        managedTeam: 0,
        skipDecision: false,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result.current();
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatches hit with contact strategy — Triple (hitRoll 8–9)", () => {
    const dispatch = vi.fn();
    const state = makeTestState({ defensiveShiftOffered: true });
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0) // pitch type
      .mockReturnValueOnce(0.999) // main roll >= 920 → hit
      .mockReturnValueOnce(0.09); // hitRoll = 9, 8 <= 9 < 10 → Triple

    const { result } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: false,
        strategy: "contact",
        managedTeam: 0,
        skipDecision: false,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result.current();
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 2 }) }),
    );
  });

  it("dispatches hit with contact strategy — Double (hitRoll 10–27)", () => {
    const dispatch = vi.fn();
    const state = makeTestState({ defensiveShiftOffered: true });
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.19); // hitRoll = 19, 10 <= 19 < 28 → Double

    const { result } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: false,
        strategy: "contact",
        managedTeam: 0,
        skipDecision: false,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result.current();
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 1 }) }),
    );
  });

  it("dispatches hit with default strategy — Triple (hitRoll 13–14)", () => {
    const dispatch = vi.fn();
    const state = makeTestState({ defensiveShiftOffered: true });
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.14); // hitRoll = 14, 13 <= 14 < 15 → Triple

    const { result } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: false,
        strategy: "balanced",
        managedTeam: 0,
        skipDecision: false,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result.current();
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 2 }) }),
    );
  });

  it("dispatches hit with default strategy — Double (hitRoll 15–34)", () => {
    const dispatch = vi.fn();
    const state = makeTestState({ defensiveShiftOffered: true });
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.25); // hitRoll = 25, 15 <= 25 < 35 → Double

    const { result } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: false,
        strategy: "balanced",
        managedTeam: 0,
        skipDecision: false,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result.current();
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 1 }) }),
    );
  });
});

describe("usePitchDispatch — power strategy hits", () => {
  const makeHitState = (hitRoll: number) => {
    const state = makeTestState({ defensiveShiftOffered: true });
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0) // pitch type
      .mockReturnValueOnce(0.999) // main roll >= 920 → hit
      .mockReturnValueOnce(hitRoll / 100);
    return state;
  };

  const dispatchAndGet = (state: State) => {
    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: false,
        strategy: "power",
        managedTeam: 0,
        skipDecision: false,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result.current();
    });
    return dispatch;
  };

  it("power Homerun (hitRoll < 20)", () => {
    const dispatch = dispatchAndGet(makeHitState(10));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 3 }) }),
    );
  });

  it("power Triple (hitRoll 20–22)", () => {
    const dispatch = dispatchAndGet(makeHitState(21));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 2 }) }),
    );
  });

  it("power Double (hitRoll 23–42)", () => {
    const dispatch = dispatchAndGet(makeHitState(33));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 1 }) }),
    );
  });

  it("power Single (hitRoll >= 43)", () => {
    const dispatch = dispatchAndGet(makeHitState(55));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hit", payload: expect.objectContaining({ hitType: 0 }) }),
    );
  });
});

describe("usePitchDispatch — suppressNextDecision", () => {
  it("dispatches clear_suppress_decision when suppressNextDecision is true", () => {
    const dispatch = vi.fn();
    vi.spyOn(rngModule, "random").mockReturnValue(0.5);
    const state = makeTestState({
      atBat: 0,
      balls: 0,
      strikes: 0,
      baseLayout: [0, 0, 0],
      outs: 0,
      suppressNextDecision: true,
      defensiveShiftOffered: true, // already offered, so shift prompt is skipped
    });
    const { result } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: true,
        strategy: "balanced",
        managedTeam: 0,
        skipDecision: false,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result.current();
    });
    expect(dispatch).toHaveBeenCalledWith({ type: "clear_suppress_decision" });
  });

  it("AI-only mode (managerMode=false): clears suppressNextDecision and still dispatches a pitch", () => {
    // After an intentional_walk the reducer sets suppressNextDecision=true.
    // With managerMode=false the human-manager guard never clears it — the AI path must.
    const dispatch = vi.fn();
    vi.spyOn(rngModule, "random").mockReturnValue(0.5);
    const state = makeTestState({
      suppressNextDecision: true,
      defensiveShiftOffered: true, // skip shift check; focus on suppress clear
    });
    const { result } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: false,
        strategy: "balanced",
        managedTeam: 0,
        skipDecision: false,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result.current();
    });
    expect(dispatch).toHaveBeenCalledWith({ type: "clear_suppress_decision" });
    // A normal pitch action must also be dispatched in the same tick.
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: expect.stringMatching(/^(strike|foul|hit|wait)$/) }),
    );
  });
});

describe("usePitchDispatch — AI intentional walk (pitch-replacing)", () => {
  it("dispatches intentional_walk and does NOT dispatch a normal pitch in the same tick", () => {
    // IBB condition: 1st base empty, runner on 2nd, 2 outs, inning 7+, score within 2.
    const dispatch = vi.fn();
    vi.spyOn(rngModule, "random").mockReturnValue(0.5);
    const state = makeTestState({
      baseLayout: [0, 1, 0],
      outs: 2,
      inning: 7,
      score: [3, 1], // diff = 2, within threshold
      balls: 0,
      strikes: 0,
      suppressNextDecision: false,
      defensiveShiftOffered: true, // skip shift check; focus on IBB
    });
    const { result } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: false,
        strategy: "balanced",
        managedTeam: 0,
        skipDecision: false,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result.current();
    });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "intentional_walk" }));
    // Must NOT also dispatch a normal pitch action in the same tick.
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: expect.stringMatching(/^(strike|foul|hit|wait)$/) }),
    );
  });
});

describe("usePitchDispatch — skip decision", () => {
  it("does NOT re-offer bunt after skip — skipDecision stays set until new batter", () => {
    const dispatch = vi.fn();
    const state = makeTestState({
      atBat: 0,
      baseLayout: [1, 0, 0],
      outs: 0,
      balls: 0,
      strikes: 0,
    });

    // First call with skipDecision=false should offer bunt
    const { result: result1 } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: true,
        strategy: "balanced",
        managedTeam: 0,
        skipDecision: false,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result1.current();
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_pending_decision",
      payload: { kind: "bunt" },
    });
    dispatch.mockClear();

    // Second call with skipDecision=true should NOT offer bunt
    const { result: result2 } = renderHook(() =>
      usePitchDispatch({
        dispatch,
        currentState: state,
        managerMode: true,
        strategy: "balanced",
        managedTeam: 0,
        skipDecision: true,
        dispatchLog: undefined,
        allTeamPitcherRoles: [{}, {}],
      }),
    );
    act(() => {
      result2.current();
    });
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: "set_pending_decision",
        payload: expect.objectContaining({ kind: "bunt" }),
      }),
    );
  });
});

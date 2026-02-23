/**
 * Targeted tests for src/context/handlers/sim.ts
 *
 * These tests verify handleSimAction directly — confirming that:
 * - non-sim actions return undefined (root reducer sentinel)
 * - each sim action produces the same result as the pre-refactor reducer
 * - post-processing helpers (withStrikeoutLog, withDecisionLog, checkWalkoff) fire correctly
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { Hit } from "@constants/hitTypes";
import { makeLogs, makeState, mockRandom } from "@test/testHelpers";

import { handleSimAction } from "./sim";

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// Sentinel: non-sim actions return undefined
// ---------------------------------------------------------------------------

describe("handleSimAction — non-sim actions return undefined", () => {
  it("returns undefined for 'reset'", () => {
    const { log } = makeLogs();
    expect(handleSimAction(makeState(), { type: "reset" }, { log })).toBeUndefined();
  });
  it("returns undefined for 'setTeams'", () => {
    const { log } = makeLogs();
    expect(
      handleSimAction(makeState(), { type: "setTeams", payload: ["A", "B"] }, { log }),
    ).toBeUndefined();
  });
  it("returns undefined for 'skip_decision'", () => {
    const { log } = makeLogs();
    expect(handleSimAction(makeState(), { type: "skip_decision" }, { log })).toBeUndefined();
  });
  it("returns undefined for 'restore_game'", () => {
    const { log } = makeLogs();
    expect(
      handleSimAction(makeState(), { type: "restore_game", payload: makeState() }, { log }),
    ).toBeUndefined();
  });
  it("returns undefined for unknown action types", () => {
    const { log } = makeLogs();
    expect(handleSimAction(makeState(), { type: "__unknown__" }, { log })).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// hit
// ---------------------------------------------------------------------------

describe("handleSimAction — hit", () => {
  it("homerun scores runner on 1st", () => {
    mockRandom(0);
    const { log } = makeLogs();
    const state = makeState({ baseLayout: [1, 0, 0], score: [0, 0] });
    const next = handleSimAction(
      state,
      { type: "hit", payload: { hitType: Hit.Homerun } },
      { log },
    );
    expect(next?.score[0]).toBe(2);
    expect(next?.baseLayout).toEqual([0, 0, 0]);
  });

  it("walkoff hit in bottom 9th ends game", () => {
    mockRandom(0);
    const { log } = makeLogs();
    const state = makeState({ atBat: 1, inning: 9, score: [2, 2], baseLayout: [0, 0, 1] });
    const next = handleSimAction(state, { type: "hit", payload: { hitType: Hit.Single } }, { log });
    expect(next?.score[1]).toBe(3);
    expect(next?.gameOver).toBe(true);
  });

  it("defaults to balanced strategy when not provided", () => {
    mockRandom(0);
    const { log } = makeLogs();
    const state = makeState({ baseLayout: [0, 0, 0] });
    // Should not throw; result should be a valid state
    const next = handleSimAction(state, { type: "hit", payload: { hitType: Hit.Single } }, { log });
    expect(next).toBeDefined();
    expect(next?.baseLayout[0]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// strike — including strikeout log post-processing
// ---------------------------------------------------------------------------

describe("handleSimAction — strike", () => {
  it("increments strike count", () => {
    const { log } = makeLogs();
    const state = makeState({ strikes: 0 });
    const next = handleSimAction(state, { type: "strike", payload: { swung: true } }, { log });
    expect(next?.strikes).toBe(1);
  });

  it("third strike records an out", () => {
    const { log } = makeLogs();
    const state = makeState({ strikes: 2, outs: 0 });
    const next = handleSimAction(state, { type: "strike", payload: { swung: true } }, { log });
    expect(next?.outs).toBe(1);
    expect(next?.strikes).toBe(0);
  });

  it("third strike appends to strikeoutLog (withStrikeoutLog)", () => {
    const { log } = makeLogs();
    const state = makeState({ strikes: 2, outs: 0, atBat: 0, batterIndex: [3, 0] });
    const next = handleSimAction(state, { type: "strike", payload: { swung: false } }, { log });
    expect(next?.strikeoutLog).toHaveLength(1);
    expect(next?.strikeoutLog[0]).toEqual({ team: 0, batterNum: 4 });
  });

  it("non-strikeout does NOT append to strikeoutLog", () => {
    const { log } = makeLogs();
    const state = makeState({ strikes: 0 });
    const next = handleSimAction(state, { type: "strike", payload: { swung: true } }, { log });
    expect(next?.strikeoutLog).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// foul
// ---------------------------------------------------------------------------

describe("handleSimAction — foul", () => {
  it("foul with 0 strikes → strike count becomes 1", () => {
    const { log, logs } = makeLogs();
    const state = makeState({ strikes: 0 });
    const next = handleSimAction(state, { type: "foul" }, { log });
    expect(next?.strikes).toBe(1);
    expect(logs.some((l) => l.toLowerCase().includes("foul"))).toBe(true);
  });

  it("foul with 1 strike → strike count becomes 2", () => {
    const { log } = makeLogs();
    const next = handleSimAction(makeState({ strikes: 1 }), { type: "foul" }, { log });
    expect(next?.strikes).toBe(2);
  });

  it("foul with 2 strikes — count stays at 2, pitchKey increments", () => {
    const { log, logs } = makeLogs();
    const state = makeState({ strikes: 2, pitchKey: 5 });
    const next = handleSimAction(state, { type: "foul" }, { log });
    expect(next?.strikes).toBe(2);
    expect(next?.pitchKey).toBe(6);
    expect(logs.some((l) => l.toLowerCase().includes("foul"))).toBe(true);
  });

  it("foul with 2 strikes does NOT add to strikeoutLog", () => {
    const { log } = makeLogs();
    const next = handleSimAction(makeState({ strikes: 2 }), { type: "foul" }, { log });
    expect(next?.strikeoutLog).toHaveLength(0);
  });

  it("foul clears hitType", () => {
    const { log } = makeLogs();
    const state = makeState({ strikes: 0, hitType: Hit.Double });
    const next = handleSimAction(state, { type: "foul" }, { log });
    expect(next?.hitType).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// wait — including strikeout log post-processing
// ---------------------------------------------------------------------------

describe("handleSimAction — wait", () => {
  it("wait resulting in strikeout appends to strikeoutLog (withStrikeoutLog)", () => {
    // Force strike outcome (random < strikeThreshold): mockRandom(0) → random=0
    mockRandom(0);
    const { log } = makeLogs();
    const state = makeState({ strikes: 2, outs: 0, atBat: 0, batterIndex: [1, 0] });
    const next = handleSimAction(
      state,
      { type: "wait", payload: { strategy: "balanced" } },
      { log },
    );
    expect(next?.outs).toBe(1);
    expect(next?.strikeoutLog).toHaveLength(1);
    expect(next?.strikeoutLog[0]).toEqual({ team: 0, batterNum: 2 });
  });

  it("wait resulting in ball increments ball count", () => {
    // Force ball outcome: mockRandom high enough to exceed strikeThreshold
    mockRandom(0.9);
    const { log } = makeLogs();
    const state = makeState({ balls: 1, strikes: 0 });
    const next = handleSimAction(
      state,
      { type: "wait", payload: { strategy: "balanced" } },
      { log },
    );
    expect(next?.balls).toBe(2);
    expect(next?.strikeoutLog).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// steal_attempt — including decision log post-processing
// ---------------------------------------------------------------------------

describe("handleSimAction — steal_attempt", () => {
  it("successful steal moves runner from 1st to 2nd", () => {
    const { log, logs } = makeLogs();
    const state = makeState({ baseLayout: [1, 0, 0] });
    const next = handleSimAction(
      state,
      { type: "steal_attempt", payload: { base: 0, successPct: 100 } },
      { log },
    );
    expect(next?.baseLayout[0]).toBe(0);
    expect(next?.baseLayout[1]).toBe(1);
    expect(logs.some((l) => l.toLowerCase().includes("safe"))).toBe(true);
  });

  it("caught stealing records an out", () => {
    const { log, logs } = makeLogs();
    const state = makeState({ baseLayout: [0, 1, 0], outs: 0 });
    const next = handleSimAction(
      state,
      { type: "steal_attempt", payload: { base: 1, successPct: 0 } },
      { log },
    );
    expect(next?.baseLayout[1]).toBe(0);
    expect(next?.outs).toBe(1);
    expect(logs.some((l) => l.toLowerCase().includes("caught"))).toBe(true);
  });

  it("appends to decisionLog when pendingDecision is set (withDecisionLog)", () => {
    const { log } = makeLogs();
    const state = makeState({
      baseLayout: [1, 0, 0],
      pitchKey: 3,
      pendingDecision: { kind: "steal", base: 0, successPct: 100 },
    });
    const next = handleSimAction(
      state,
      { type: "steal_attempt", payload: { base: 0, successPct: 100 } },
      { log },
    );
    expect(next?.decisionLog).toContain("3:steal:0:100");
  });

  it("does NOT append to decisionLog when no pendingDecision", () => {
    const { log } = makeLogs();
    const state = makeState({ baseLayout: [1, 0, 0], pitchKey: 3, pendingDecision: null });
    const next = handleSimAction(
      state,
      { type: "steal_attempt", payload: { base: 0, successPct: 100 } },
      { log },
    );
    expect(next?.decisionLog).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// bunt_attempt — walkoff check + decision log post-processing
// ---------------------------------------------------------------------------

describe("handleSimAction — bunt_attempt", () => {
  it("sac bunt advances runner from 1st to 2nd", () => {
    mockRandom(0.5); // roll=50 → sac bunt path
    const { log } = makeLogs();
    const state = makeState({ baseLayout: [1, 0, 0], outs: 0 });
    const next = handleSimAction(
      state,
      { type: "bunt_attempt", payload: { strategy: "balanced" } },
      { log },
    );
    expect(next?.baseLayout[0]).toBe(0);
    expect(next?.baseLayout[1]).toBe(1);
    expect(next?.outs).toBe(1);
  });

  it("walkoff bunt in bottom 9th ends game (checkWalkoff applied)", () => {
    mockRandom(0.5); // sac bunt
    const { log } = makeLogs();
    const state = makeState({
      atBat: 1,
      inning: 9,
      score: [2, 2],
      baseLayout: [1, 0, 1],
      outs: 0,
    });
    const next = handleSimAction(
      state,
      { type: "bunt_attempt", payload: { strategy: "balanced" } },
      { log },
    );
    expect(next?.score[1]).toBe(3);
    expect(next?.gameOver).toBe(true);
  });

  it("appends to decisionLog when pendingDecision is set (withDecisionLog)", () => {
    mockRandom(0.5);
    const { log } = makeLogs();
    const state = makeState({
      baseLayout: [1, 0, 0],
      pitchKey: 7,
      pendingDecision: { kind: "bunt" },
    });
    const next = handleSimAction(
      state,
      { type: "bunt_attempt", payload: { strategy: "balanced" } },
      { log },
    );
    expect(next?.decisionLog).toContain("7:bunt");
  });
});

// ---------------------------------------------------------------------------
// intentional_walk — log + checkWalkoff + decision log
// ---------------------------------------------------------------------------

describe("handleSimAction — intentional_walk", () => {
  it("places runner on 1st from empty bases", () => {
    const { log, logs } = makeLogs();
    const state = makeState({ baseLayout: [0, 0, 0] });
    const next = handleSimAction(state, { type: "intentional_walk" }, { log });
    expect(next?.baseLayout[0]).toBe(1);
    expect(logs.some((l) => l.toLowerCase().includes("intentional walk"))).toBe(true);
  });

  it("forces runners (bases loaded → run scores)", () => {
    const { log } = makeLogs();
    const state = makeState({ baseLayout: [1, 1, 1], score: [0, 0] });
    const next = handleSimAction(state, { type: "intentional_walk" }, { log });
    expect(next?.score[0]).toBe(1);
    expect(next?.baseLayout).toEqual([1, 1, 1]);
  });

  it("sets suppressNextDecision to prevent immediate decision loop", () => {
    const { log } = makeLogs();
    const state = makeState({ baseLayout: [0, 0, 0] });
    const next = handleSimAction(state, { type: "intentional_walk" }, { log });
    expect(next?.suppressNextDecision).toBe(true);
  });

  it("walkoff IBB in bottom 9th ends game (checkWalkoff applied)", () => {
    const { log } = makeLogs();
    const state = makeState({
      atBat: 1,
      inning: 9,
      score: [2, 3],
      baseLayout: [1, 1, 1],
    });
    const next = handleSimAction(state, { type: "intentional_walk" }, { log });
    expect(next?.score[1]).toBe(4);
    expect(next?.gameOver).toBe(true);
  });

  it("appends to decisionLog when pendingDecision is set (withDecisionLog)", () => {
    const { log } = makeLogs();
    const state = makeState({
      pitchKey: 5,
      pendingDecision: { kind: "ibb" },
    });
    const next = handleSimAction(state, { type: "intentional_walk" }, { log });
    expect(next?.decisionLog).toContain("5:ibb");
  });
});

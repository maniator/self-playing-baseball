import { describe, expect, it } from "vitest";

import { makeState } from "@test/testHelpers";

import type { PlayLogEntry, TeamCustomPlayerOverrides } from "./index";
import { backfillRestoredState, createFreshGameState } from "./initialState";

describe("createFreshGameState", () => {
  it("returns a state with inning 1 and zero scores", () => {
    const state = createFreshGameState(["Yankees", "Mets"]);
    expect(state.inning).toBe(1);
    expect(state.score).toEqual([0, 0]);
  });

  it("preserves the teams argument", () => {
    const state = createFreshGameState(["Red Sox", "Cubs"]);
    expect(state.teams).toEqual(["Red Sox", "Cubs"]);
  });

  it("resets all count fields to zero", () => {
    const state = createFreshGameState(["A", "B"]);
    expect(state.outs).toBe(0);
    expect(state.strikes).toBe(0);
    expect(state.balls).toBe(0);
    expect(state.atBat).toBe(0);
    expect(state.pitchKey).toBe(0);
  });

  it("clears all boolean and nullable fields", () => {
    const state = createFreshGameState(["A", "B"]);
    expect(state.gameOver).toBe(false);
    expect(state.pendingDecision).toBeNull();
    expect(state.onePitchModifier).toBeNull();
    expect(state.suppressNextDecision).toBe(false);
    expect(state.pinchHitterStrategy).toBeNull();
    expect(state.defensiveShift).toBe(false);
    expect(state.defensiveShiftOffered).toBe(false);
  });

  it("initializes all array fields as empty", () => {
    const state = createFreshGameState(["A", "B"]);
    expect(state.baseLayout).toEqual([0, 0, 0]);
    expect(state.batterIndex).toEqual([0, 0]);
    expect(state.inningRuns).toEqual([[], []]);
    expect(state.playLog).toEqual([]);
    expect(state.strikeoutLog).toEqual([]);
    expect(state.outLog).toEqual([]);
    expect(state.decisionLog).toEqual([]);
    expect(state.lineupOrder).toEqual([[], []]);
    expect(state.playerOverrides).toEqual([{}, {}]);
  });

  it("returns different instances on each call (no shared references)", () => {
    const a = createFreshGameState(["A", "B"]);
    const b = createFreshGameState(["A", "B"]);
    expect(a.score).not.toBe(b.score);
    expect(a.baseLayout).not.toBe(b.baseLayout);
    expect(a.playLog).not.toBe(b.playLog);
  });
});

describe("backfillRestoredState", () => {
  it("backfills rbi from runs when rbi is missing", () => {
    const entry: PlayLogEntry = { inning: 1, half: 0, batterNum: 1, team: 0, event: 1, runs: 2 };
    const restored = makeState({ playLog: [entry] });
    const result = backfillRestoredState(restored);
    expect(result.playLog[0].rbi).toBe(2);
  });

  it("preserves rbi when already present", () => {
    const entry: PlayLogEntry = {
      inning: 1,
      half: 0,
      batterNum: 1,
      team: 0,
      event: 1,
      runs: 2,
      rbi: 1,
    };
    const restored = makeState({ playLog: [entry] });
    const result = backfillRestoredState(restored);
    expect(result.playLog[0].rbi).toBe(1);
  });

  it("defaults playerOverrides to [{},{}] when missing", () => {
    const restored = makeState();
    // @ts-expect-error intentionally deleting to simulate older save
    delete restored.playerOverrides;
    const result = backfillRestoredState(restored);
    expect(result.playerOverrides).toEqual([{}, {}]);
  });

  it("preserves playerOverrides when already present", () => {
    const overrides: [TeamCustomPlayerOverrides, TeamCustomPlayerOverrides] = [
      { p1: { nickname: "Ace" } },
      {},
    ];
    const restored = makeState({ playerOverrides: overrides });
    const result = backfillRestoredState(restored);
    expect(result.playerOverrides).toBe(overrides);
  });

  it("defaults lineupOrder to [[],[]] when missing", () => {
    const restored = makeState();
    // @ts-expect-error intentionally deleting to simulate older save
    delete restored.lineupOrder;
    const result = backfillRestoredState(restored);
    expect(result.lineupOrder).toEqual([[], []]);
  });

  it("defaults strikeoutLog to [] when missing", () => {
    const restored = makeState();
    // @ts-expect-error intentionally deleting to simulate older save
    delete restored.strikeoutLog;
    const result = backfillRestoredState(restored);
    expect(result.strikeoutLog).toEqual([]);
  });

  it("defaults outLog to [] when missing", () => {
    const restored = makeState();
    // @ts-expect-error intentionally deleting to simulate older save
    delete restored.outLog;
    const result = backfillRestoredState(restored);
    expect(result.outLog).toEqual([]);
  });

  it("preserves all other fields from restored state", () => {
    const restored = makeState({ inning: 5, score: [3, 2], outs: 2 });
    const result = backfillRestoredState(restored);
    expect(result.inning).toBe(5);
    expect(result.score).toEqual([3, 2]);
    expect(result.outs).toBe(2);
  });
});

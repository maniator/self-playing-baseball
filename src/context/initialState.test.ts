import { describe, expect, it } from "vitest";

import { Hit } from "@constants/hitTypes";
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

  it("initializes roster fields to empty defaults", () => {
    const state = createFreshGameState(["A", "B"]);
    expect(state.rosterBench).toEqual([[], []]);
    expect(state.rosterPitchers).toEqual([[], []]);
    expect(state.activePitcherIdx).toEqual([0, 0]);
    expect(state.lineupPositions).toEqual([[], []]);
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

  it("defaults strikeoutLog to [] when explicitly null (old save wrote null)", () => {
    const restored = makeState();
    // @ts-expect-error simulating old save that stored null instead of []
    restored.strikeoutLog = null;
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

  it("defaults outLog to [] when explicitly null (old save wrote null)", () => {
    const restored = makeState();
    // @ts-expect-error simulating old save that stored null instead of []
    restored.outLog = null;
    const result = backfillRestoredState(restored);
    expect(result.outLog).toEqual([]);
  });

  it("defaults decisionLog to [] when missing", () => {
    const restored = makeState();
    // @ts-expect-error intentionally deleting to simulate older save
    delete restored.decisionLog;
    const result = backfillRestoredState(restored);
    expect(Array.isArray(result.decisionLog)).toBe(true);
    expect(result.decisionLog).toEqual([]);
  });

  it("defaults inningRuns to [[],[]] when missing", () => {
    const restored = makeState();
    // @ts-expect-error intentionally deleting to simulate older save
    delete restored.inningRuns;
    const result = backfillRestoredState(restored);
    expect(result.inningRuns).toEqual([[], []]);
  });

  it("defaults batterIndex to [0,0] when missing", () => {
    const restored = makeState();
    // @ts-expect-error intentionally deleting to simulate older save
    delete restored.batterIndex;
    const result = backfillRestoredState(restored);
    expect(result.batterIndex).toEqual([0, 0]);
  });

  it("defaults playLog to [] when missing", () => {
    const restored = makeState();
    // @ts-expect-error intentionally deleting to simulate older save
    delete restored.playLog;
    const result = backfillRestoredState(restored);
    expect(result.playLog).toEqual([]);
  });

  it("uses fallback teams [Away,Home] when teams field is missing", () => {
    const restored = makeState({ teams: ["Reds", "Cubs"] });
    // @ts-expect-error intentionally deleting to simulate older save
    delete restored.teams;
    const result = backfillRestoredState(restored);
    expect(Array.isArray(result.teams)).toBe(true);
    expect(result.teams).toHaveLength(2);
  });

  it("preserves all other fields from restored state", () => {
    const restored = makeState({ inning: 5, score: [3, 2], outs: 2 });
    const result = backfillRestoredState(restored);
    expect(result.inning).toBe(5);
    expect(result.score).toEqual([3, 2]);
    expect(result.outs).toBe(2);
  });

  it("defaults rosterBench to [[],[]] when missing (backfill for older saves)", () => {
    const restored = makeState();
    // @ts-expect-error intentionally deleting to simulate older save
    delete restored.rosterBench;
    const result = backfillRestoredState(restored);
    expect(result.rosterBench).toEqual([[], []]);
  });

  it("defaults rosterPitchers to [[],[]] when missing (backfill for older saves)", () => {
    const restored = makeState();
    // @ts-expect-error intentionally deleting to simulate older save
    delete restored.rosterPitchers;
    const result = backfillRestoredState(restored);
    expect(result.rosterPitchers).toEqual([[], []]);
  });

  it("defaults activePitcherIdx to [0,0] when missing (backfill for older saves)", () => {
    const restored = makeState();
    // @ts-expect-error intentionally deleting to simulate older save
    delete restored.activePitcherIdx;
    const result = backfillRestoredState(restored);
    expect(result.activePitcherIdx).toEqual([0, 0]);
  });

  it("defaults lineupPositions to [[],[]] when missing (backfill for older saves)", () => {
    const restored = makeState();
    // @ts-expect-error intentionally deleting to simulate older save
    delete restored.lineupPositions;
    const result = backfillRestoredState(restored);
    expect(result.lineupPositions).toEqual([[], []]);
  });

  // -------------------------------------------------------------------------
  // Bug regression: restoring a mid-game save must keep full playLog intact
  // so the hit log and line-score H column stay in sync.
  // -------------------------------------------------------------------------
  it("preserves all playLog entries in a mid-game save (hit log regression)", () => {
    const entries: PlayLogEntry[] = [
      { inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Single, runs: 0, rbi: 0 },
      { inning: 2, half: 0, batterNum: 3, team: 0, event: Hit.Double, runs: 1, rbi: 1 },
      { inning: 3, half: 1, batterNum: 2, team: 1, event: Hit.Homerun, runs: 2, rbi: 2 },
    ];
    const restored = makeState({ inning: 6, playLog: entries });
    const result = backfillRestoredState(restored);
    expect(result.playLog).toHaveLength(3);
    expect(result.playLog[0].event).toBe(Hit.Single);
    expect(result.playLog[1].event).toBe(Hit.Double);
    expect(result.playLog[2].event).toBe(Hit.Homerun);
    // Line-score hits count (non-walk entries) must match playLog
    const hitsTeam0 = result.playLog.filter((e) => e.team === 0 && e.event !== Hit.Walk).length;
    expect(hitsTeam0).toBe(2);
    const hitsTeam1 = result.playLog.filter((e) => e.team === 1 && e.event !== Hit.Walk).length;
    expect(hitsTeam1).toBe(1);
  });
});

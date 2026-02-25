/**
 * Tests for pitcher fatigue tracking (pitcherBattersFaced) and
 * no-reentry enforcement (substitutedOut).
 */
import { describe, expect, it } from "vitest";

import { Hit } from "@constants/hitTypes";
import { makeLogs, makeState } from "@test/testHelpers";

import { handleDecisionsAction } from "./handlers/decisions";
import { hitBall } from "./hitBall";
import { incrementPitcherFatigue } from "./playerOut";

describe("incrementPitcherFatigue", () => {
  it("increments the pitching team (opponent of atBat) counter", () => {
    const state = makeState({ atBat: 0, pitcherBattersFaced: [3, 7] });
    const next = incrementPitcherFatigue(state);
    // atBat=0 means team 0 is batting, team 1 is pitching — increment team 1
    expect(next.pitcherBattersFaced[0]).toBe(3);
    expect(next.pitcherBattersFaced[1]).toBe(8);
  });

  it("increments away team counter when home team is batting", () => {
    const state = makeState({ atBat: 1, pitcherBattersFaced: [2, 5] });
    const next = incrementPitcherFatigue(state);
    // atBat=1 means team 1 is batting, team 0 is pitching — increment team 0
    expect(next.pitcherBattersFaced[0]).toBe(3);
    expect(next.pitcherBattersFaced[1]).toBe(5);
  });
});

describe("pitcher fatigue increments on at-bat completion", () => {
  const { log } = makeLogs();

  it("increments pitcherBattersFaced on hit", () => {
    const state = makeState({
      atBat: 0,
      pitcherBattersFaced: [0, 2],
      lineupOrder: [["batter1", "batter2", "batter3", "b4", "b5", "b6", "b7", "b8", "b9"], []],
      batterIndex: [0, 0],
    });
    const next = hitBall(Hit.Single, state, log);
    // Pitcher (team 1) should have faced one more batter
    expect(next.pitcherBattersFaced[1]).toBe(3);
  });

  it("increments pitcherBattersFaced on walk", () => {
    const state = makeState({
      atBat: 0,
      pitcherBattersFaced: [0, 1],
      lineupOrder: [["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9"], []],
      batterIndex: [0, 0],
    });
    const next = hitBall(Hit.Walk, state, log);
    expect(next.pitcherBattersFaced[1]).toBe(2);
  });
});

describe("no-reentry enforcement in make_substitution", () => {
  it("tracks substituted-out players in substitutedOut", () => {
    const { log } = makeLogs();
    const state = makeState({
      lineupOrder: [["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9"], []],
      rosterBench: [["bench1", "bench2"], []],
      substitutedOut: [[], []],
      playerOverrides: [{ b1: { nickname: "Alpha" }, bench1: { nickname: "Bravo" } }, {}],
    });

    const result = handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "batter", lineupIdx: 0, benchPlayerId: "bench1" },
      },
      { log },
    );

    // The old player (b1) should be in substitutedOut
    expect(result!.substitutedOut[0]).toContain("b1");
    // bench1 should now be in the lineup
    expect(result!.lineupOrder[0][0]).toBe("bench1");
    // b1 should be on the bench
    expect(result!.rosterBench[0]).toContain("b1");
  });

  it("refuses to sub in a player who is in substitutedOut", () => {
    const { log } = makeLogs();
    const state = makeState({
      lineupOrder: [["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9"], []],
      rosterBench: [["b10", "b11"], []],
      substitutedOut: [["b10"], []], // b10 was already subbed out
      playerOverrides: [{}, {}],
    });

    const result = handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "batter", lineupIdx: 0, benchPlayerId: "b10" },
      },
      { log },
    );

    // Should return state unchanged (sub refused)
    expect(result).toBe(state);
  });

  it("refuses pitcher no-reentry — subbed-out pitcher cannot come back", () => {
    const { log } = makeLogs();
    const state = makeState({
      rosterPitchers: [["sp1", "rp1", "rp2"], []],
      activePitcherIdx: [1, 0], // rp1 is active for team 0
      substitutedOut: [["sp1"], []], // sp1 was subbed out
      playerOverrides: [
        { sp1: { nickname: "SP One" }, rp1: { nickname: "RP One" }, rp2: { nickname: "RP Two" } },
        {},
      ],
      pitcherBattersFaced: [5, 0],
    });

    const result = handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "pitcher", pitcherIdx: 0 }, // try to bring sp1 back
      },
      { log },
    );

    // Should return state unchanged (re-entry refused)
    expect(result).toBe(state);
  });

  it("tracks old pitcher as substituted out on valid pitching change", () => {
    const { log } = makeLogs();
    const state = makeState({
      rosterPitchers: [["sp1", "rp1"], []],
      activePitcherIdx: [0, 0], // sp1 is active
      substitutedOut: [[], []],
      playerOverrides: [{ sp1: { nickname: "SP One" }, rp1: { nickname: "RP One" } }, {}],
      pitcherBattersFaced: [8, 0],
    });

    const result = handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "pitcher", pitcherIdx: 1 }, // bring in rp1
      },
      { log },
    );

    // sp1 should be in substitutedOut
    expect(result!.substitutedOut[0]).toContain("sp1");
    // rp1 should now be the active pitcher
    expect(result!.activePitcherIdx[0]).toBe(1);
    // pitcherBattersFaced should reset to 0 for team 0
    expect(result!.pitcherBattersFaced[0]).toBe(0);
  });
});

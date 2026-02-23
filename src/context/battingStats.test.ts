/**
 * Regression tests for batting stats consistency.
 *
 * Specifically covers seed `30nl0i` where the 2nd lineup batter (First Baseman)
 * appears to have fewer at-bats than the 3rd batter (Second Baseman).  This is
 * valid behavior: the First Baseman walked once, so their plate appearances (PA)
 * are the same as the Second Baseman's while their official at-bat (AB) count is
 * one lower.  The real invariant is on PA (plate appearances), not raw ABs.
 *
 * Invariants verified:
 *   1. Earlier lineup slots always have PA >= later lineup slots (batting-order
 *      consistency — an earlier batter cannot have *fewer* plate appearances than
 *      a later batter in the same game).
 *   2. K (strikeouts) <= AB for every batter (strikeouts always count as ABs).
 *   3. AB = PA - BB for every batter (walks are the only non-AB plate appearances
 *      modelled in this simulator).
 */

import { afterEach, describe, expect, it } from "vitest";

import { Hit } from "@constants/hitTypes";
import { pitchSwingRateMod, selectPitchType } from "@constants/pitchTypes";
import type { GameAction, LogAction, State } from "@context/index";
import { makeState } from "@test/testHelpers";
import getRandomInt from "@utils/getRandomInt";
import { restoreRng } from "@utils/rng";
import { generateRoster } from "@utils/roster";

import reducerFactory from "./reducer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** base-36 seed string → 32-bit unsigned integer */
const parseSeed = (s: string): number => parseInt(s, 36) >>> 0;

const SEED_30NL0I = parseSeed("30nl0i");

const makeReducer = () => {
  const logs: string[] = [];
  const dispatch = (a: LogAction) => {
    if (a.type === "log") logs.push(a.payload);
  };
  return { reducer: reducerFactory(dispatch), logs };
};

/**
 * Decide the next pitch action the way `usePitchDispatch` does — two leading
 * RNG calls for pitch-type selection and the main outcome roll, with a third
 * for the foul/hit-type branch when applicable.
 */
const nextPitchAction = (state: State): GameAction => {
  const pitchType = selectPitchType(state.balls, state.strikes, getRandomInt(100));
  const random = getRandomInt(1000);
  const baseSwingRate = Math.round(500 - 75 * state.strikes);
  const swingRate = Math.round(baseSwingRate * pitchSwingRateMod(pitchType));

  if (random < swingRate) {
    if (getRandomInt(100) < 30) return { type: "foul", payload: { pitchType } };
    return { type: "strike", payload: { swung: true, pitchType } };
  }
  if (random < 920) {
    return { type: "wait", payload: { strategy: "balanced", pitchType } };
  }
  const hitRoll = getRandomInt(100);
  const hitType =
    hitRoll < 13 ? Hit.Homerun : hitRoll < 15 ? Hit.Triple : hitRoll < 35 ? Hit.Double : Hit.Single;
  return { type: "hit", payload: { hitType, strategy: "balanced" } };
};

/** Run a full game from the given seed with default (balanced) strategy. */
const runGame = (seed: number): State => {
  restoreRng(seed);
  const { reducer } = makeReducer();

  const awayTeam = "New York Mets";
  const homeTeam = "New York Yankees";

  let state = makeState({
    teams: [awayTeam, homeTeam],
    lineupOrder: [
      generateRoster(awayTeam).batters.map((b) => b.id),
      generateRoster(homeTeam).batters.map((b) => b.id),
    ],
  });

  let pitches = 0;
  while (!state.gameOver && pitches < 3000) {
    state = reducer(state, nextPitchAction(state));
    pitches++;
  }
  return state;
};

type BatterStats = { ab: number; h: number; bb: number; k: number; pa: number };

/** Compute per-slot stats from game state for one team. */
const computeStats = (team: 0 | 1, state: State): Record<number, BatterStats> => {
  const stats: Record<number, BatterStats> = {};
  for (let i = 1; i <= 9; i++) stats[i] = { ab: 0, h: 0, bb: 0, k: 0, pa: 0 };

  for (const e of state.playLog) {
    if (e.team !== team) continue;
    if (e.event === Hit.Walk) {
      stats[e.batterNum].bb++;
    } else {
      stats[e.batterNum].h++;
    }
    stats[e.batterNum].pa++;
  }
  for (const e of state.strikeoutLog) {
    if (e.team !== team) continue;
    stats[e.batterNum].k++;
  }
  for (const e of state.outLog) {
    if (e.team !== team) continue;
    stats[e.batterNum].ab++;
    stats[e.batterNum].pa++;
  }
  // AB includes hits (hits are in playLog, not outLog)
  for (let i = 1; i <= 9; i++) stats[i].ab += stats[i].h;
  return stats;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("batting stats — seed 30nl0i regression", () => {
  afterEach(() => {
    restoreRng(0);
  });

  it("game finishes within 3000 pitches", () => {
    const state = runGame(SEED_30NL0I);
    expect(state.gameOver).toBe(true);
  });

  it("PA ordering invariant: every earlier lineup slot has >= PA as the next slot", () => {
    const state = runGame(SEED_30NL0I);
    const stats = computeStats(0, state);
    for (let slot = 1; slot <= 8; slot++) {
      expect(stats[slot].pa).toBeGreaterThanOrEqual(stats[slot + 1].pa);
    }
  });

  it("K <= AB invariant: strikeouts always count as official at-bats", () => {
    const state = runGame(SEED_30NL0I);
    const stats = computeStats(0, state);
    for (let slot = 1; slot <= 9; slot++) {
      expect(stats[slot].k).toBeLessThanOrEqual(stats[slot].ab);
    }
  });

  it("AB = PA - BB for every batter (walks are the only non-AB plate appearances)", () => {
    const state = runGame(SEED_30NL0I);
    const stats = computeStats(0, state);
    for (let slot = 1; slot <= 9; slot++) {
      expect(stats[slot].ab).toBe(stats[slot].pa - stats[slot].bb);
    }
  });

  it("slot 2 (First Baseman) has fewer AB than slot 3 (Second Baseman) due to a walk", () => {
    const state = runGame(SEED_30NL0I);
    const stats = computeStats(0, state);
    const slot2 = stats[2];
    const slot3 = stats[3];

    // First Baseman walked at least once — that is what reduces their AB count.
    expect(slot2.bb).toBeGreaterThan(0);

    // Plate appearances are equal — the batting order is not broken.
    expect(slot2.pa).toBe(slot3.pa);

    // AB difference equals the walk count (walks reduce AB without reducing PA).
    expect(slot3.ab - slot2.ab).toBe(slot2.bb);
  });

  it("exact stats for seed 30nl0i are stable (regression snapshot)", () => {
    const state = runGame(SEED_30NL0I);
    const stats = computeStats(0, state);

    // Catcher (slot 1)
    expect(stats[1]).toMatchObject({ ab: 4, h: 0, bb: 0, k: 3 });
    // First Baseman (slot 2) — fewer ABs than slot 3 because of 1 walk
    expect(stats[2]).toMatchObject({ ab: 3, h: 1, bb: 1, k: 1 });
    // Second Baseman (slot 3)
    expect(stats[3]).toMatchObject({ ab: 4, h: 1, bb: 0, k: 2 });
    // Third Baseman (slot 4)
    expect(stats[4]).toMatchObject({ ab: 4, h: 0, bb: 0, k: 4 });
    // Shortstop (slot 5)
    expect(stats[5]).toMatchObject({ ab: 4, h: 0, bb: 0, k: 4 });
  });
});

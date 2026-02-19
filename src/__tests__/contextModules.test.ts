/**
 * Tests for new/refactored src/Context/ modules:
 * strategy.ts, playerOut.ts, advanceRunners.ts, hitBall.ts, gameOver.ts
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { Hit } from "../constants/hitTypes";
import type { State } from "../Context/index";
import { stratMod } from "../Context/strategy";
import { playerOut } from "../Context/playerOut";
import { advanceRunners } from "../Context/advanceRunners";
import { hitBall } from "../Context/hitBall";
import { checkGameOver, checkWalkoff, nextHalfInning } from "../Context/gameOver";
import * as rngModule from "../utilities/rng";

afterEach(() => vi.restoreAllMocks());

const makeState = (overrides: Partial<State> = {}): State => ({
  inning: 1, score: [0, 0], teams: ["Away", "Home"],
  baseLayout: [0, 0, 0], outs: 0, strikes: 0, balls: 0, atBat: 0,
  gameOver: false, pendingDecision: null, onePitchModifier: null,
  pitchKey: 0, decisionLog: [], ...overrides,
});

const makeLogs = () => {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);
  return { logs, log };
};

const mockRandom = (value: number) =>
  vi.spyOn(rngModule, "random").mockReturnValue(value);

// ---------------------------------------------------------------------------
// strategy.ts — stratMod
// ---------------------------------------------------------------------------
describe("stratMod — all strategies × all stats", () => {
  const stats = ["walk", "strikeout", "homerun", "contact", "steal", "advance"] as const;
  const strategies = ["balanced", "aggressive", "patient", "contact", "power"] as const;

  it("balanced returns 1.0 for every stat", () => {
    stats.forEach(s => expect(stratMod("balanced", s)).toBe(1.0));
  });

  it("aggressive boosts homerun, steal, advance; reduces walk", () => {
    expect(stratMod("aggressive", "homerun")).toBeGreaterThan(1);
    expect(stratMod("aggressive", "steal")).toBeGreaterThan(1);
    expect(stratMod("aggressive", "advance")).toBeGreaterThan(1);
    expect(stratMod("aggressive", "walk")).toBeLessThan(1);
  });

  it("patient boosts walk; reduces steal and strikeout", () => {
    expect(stratMod("patient", "walk")).toBeGreaterThan(1);
    expect(stratMod("patient", "steal")).toBeLessThan(1);
    expect(stratMod("patient", "strikeout")).toBeLessThan(1);
  });

  it("contact reduces strikeout and homerun; boosts contact", () => {
    expect(stratMod("contact", "strikeout")).toBeLessThan(1);
    expect(stratMod("contact", "homerun")).toBeLessThan(1);
    expect(stratMod("contact", "contact")).toBeGreaterThan(1);
  });

  it("power boosts homerun greatly; reduces contact", () => {
    expect(stratMod("power", "homerun")).toBeGreaterThan(1.5);
    expect(stratMod("power", "contact")).toBeLessThan(1);
  });

  it("all strategies return finite numbers for all stats", () => {
    strategies.forEach(strat =>
      stats.forEach(stat => expect(Number.isFinite(stratMod(strat, stat))).toBe(true))
    );
  });

  it("exact values: aggressive steal = 1.3", () => expect(stratMod("aggressive", "steal")).toBe(1.3));
  it("exact values: patient walk = 1.4", () => expect(stratMod("patient", "walk")).toBe(1.4));
  it("exact values: power homerun = 1.6", () => expect(stratMod("power", "homerun")).toBe(1.6));
  it("exact values: contact strikeout = 0.7", () => expect(stratMod("contact", "strikeout")).toBe(0.7));
});

// ---------------------------------------------------------------------------
// playerOut.ts — playerOut
// ---------------------------------------------------------------------------
describe("playerOut", () => {
  it("one out logs 'One out.' and increments outs", () => {
    const { logs, log } = makeLogs();
    const state = makeState({ outs: 0 });
    const next = playerOut(state, log);
    expect(next.outs).toBe(1);
    expect(logs).toContain("One out.");
  });

  it("two outs logs 'Two outs.' and increments outs", () => {
    const { logs, log } = makeLogs();
    const state = makeState({ outs: 1 });
    const next = playerOut(state, log);
    expect(next.outs).toBe(2);
    expect(logs).toContain("Two outs.");
  });

  it("three outs transitions to next half-inning", () => {
    const { log } = makeLogs();
    const state = makeState({ outs: 2, atBat: 0, inning: 1 });
    const next = playerOut(state, log);
    // After 3 outs home team bats (atBat flips to 1)
    expect(next.outs).toBe(0);
    expect(next.atBat).toBe(1);
  });

  it("three outs in bottom of 9th with home leading → gameOver", () => {
    const { log } = makeLogs();
    const state = makeState({ outs: 2, atBat: 1, inning: 9, score: [1, 2] });
    const next = playerOut(state, log);
    expect(next.gameOver).toBe(true);
  });

  it("resets strikes and balls on out", () => {
    const { log } = makeLogs();
    const state = makeState({ outs: 0, strikes: 2, balls: 3 });
    const next = playerOut(state, log);
    expect(next.strikes).toBe(0);
    expect(next.balls).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// advanceRunners.ts — advanceRunners
// ---------------------------------------------------------------------------
describe("advanceRunners", () => {
  it("homerun: all runners score + batter (grand slam = 4 runs)", () => {
    const { newBase, runsScored } = advanceRunners(Hit.Homerun, [1, 1, 1]);
    expect(runsScored).toBe(4);
    expect(newBase).toEqual([0, 0, 0]);
  });

  it("triple: all runners score, batter to 3rd", () => {
    const { newBase, runsScored } = advanceRunners(Hit.Triple, [1, 1, 0]);
    expect(runsScored).toBe(2);
    expect(newBase[2]).toBe(1);
    expect(newBase[0]).toBe(0);
  });

  it("double: runner on 1st goes to 3rd, batter to 2nd", () => {
    const { newBase, runsScored } = advanceRunners(Hit.Double, [1, 0, 0]);
    expect(newBase[1]).toBe(1);
    expect(newBase[2]).toBe(1);
    expect(newBase[0]).toBe(0);
    expect(runsScored).toBe(0);
  });

  it("single: runner on 3rd scores, batter to 1st", () => {
    const { newBase, runsScored } = advanceRunners(Hit.Single, [0, 0, 1]);
    expect(runsScored).toBe(1);
    expect(newBase[0]).toBe(1);
    expect(newBase[2]).toBe(0);
  });

  it("walk: forces runners only when first base is occupied", () => {
    // Bases loaded walk → runner on 3rd scores
    const { newBase, runsScored } = advanceRunners(Hit.Walk, [1, 1, 1]);
    expect(runsScored).toBe(1);
    expect(newBase).toEqual([1, 1, 1]);
  });

  it("walk with empty bases: batter to 1st, no runs", () => {
    const { newBase, runsScored } = advanceRunners(Hit.Walk, [0, 0, 0]);
    expect(runsScored).toBe(0);
    expect(newBase[0]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// hitBall.ts — hitBall
// ---------------------------------------------------------------------------
describe("hitBall", () => {
  it("single logs hit callout and places batter on 1st", () => {
    mockRandom(0); // low → no pop-out (popOutThreshold = 750, randomNumber = 0)
    const { logs, log } = makeLogs();
    const state = makeState({ score: [0, 0], atBat: 0 });
    const next = hitBall(Hit.Single, state, log);
    expect(next.baseLayout[0]).toBe(1);
    expect(logs.some(l => l.includes("base hit"))).toBe(true);
  });

  it("pop-out: randomNumber >= popOutThreshold (contact) causes out", () => {
    // popOutThreshold = Math.round(750 * stratMod("balanced","contact")) = 750
    // randomNumber = 999 >= 750 → pop-out; mock second call for getRandomInt(100) power check
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.999) // first call: randomNumber=999 → pop-out
      .mockReturnValueOnce(0.5);  // second call: power HR check
    const { logs, log } = makeLogs();
    const state = makeState({ outs: 0 });
    const next = hitBall(Hit.Single, state, log);
    expect(next.outs).toBe(1);
    expect(logs.some(l => l.includes("out"))).toBe(true);
  });

  it("homerun is never popped out", () => {
    mockRandom(0.999); // high random — but HR bypasses pop-out check
    const { log } = makeLogs();
    const state = makeState({ score: [0, 0], atBat: 0 });
    const next = hitBall(Hit.Homerun, state, log);
    expect(next.score[0]).toBe(1); // at least batter scores
    expect(next.gameOver).toBe(false);
  });

  it("runsScored updates score correctly", () => {
    mockRandom(0); // no pop-out
    const { log } = makeLogs();
    const state = makeState({ baseLayout: [0, 0, 1] as [number, number, number], score: [2, 0], atBat: 0 });
    const next = hitBall(Hit.Single, state, log);
    expect(next.score[0]).toBe(3); // runner on 3rd scored
  });
});

// ---------------------------------------------------------------------------
// gameOver.ts — checkGameOver, checkWalkoff, nextHalfInning
// ---------------------------------------------------------------------------
describe("checkGameOver", () => {
  it("triggers when inning >= 9 and teams are not tied", () => {
    const { logs, log } = makeLogs();
    const state = makeState({ inning: 9, score: [3, 1] });
    const next = checkGameOver(state, log);
    expect(next.gameOver).toBe(true);
    expect(logs.some(l => l.includes("ball game"))).toBe(true);
  });

  it("does not trigger when inning >= 9 but tied", () => {
    const { log } = makeLogs();
    const state = makeState({ inning: 9, score: [3, 3] });
    const next = checkGameOver(state, log);
    expect(next.gameOver).toBe(false);
  });

  it("does not trigger when inning < 9", () => {
    const { log } = makeLogs();
    const state = makeState({ inning: 8, score: [5, 2] });
    const next = checkGameOver(state, log);
    expect(next.gameOver).toBe(false);
  });

  it("away team wins when they have more runs", () => {
    const { logs, log } = makeLogs();
    const state = makeState({ inning: 9, score: [5, 3], teams: ["Visitors", "Home"] });
    checkGameOver(state, log);
    expect(logs.some(l => l.includes("Visitors"))).toBe(true);
  });
});

describe("checkWalkoff", () => {
  it("triggers walk-off when home team leads in bottom of 9th+", () => {
    const { logs, log } = makeLogs();
    const state = makeState({ inning: 9, atBat: 1, score: [2, 3] });
    const next = checkWalkoff(state, log);
    expect(next.gameOver).toBe(true);
    expect(logs.some(l => l.includes("Walk-off"))).toBe(true);
  });

  it("does not trigger walk-off if home team is not leading", () => {
    const { log } = makeLogs();
    const state = makeState({ inning: 9, atBat: 1, score: [3, 2] });
    const next = checkWalkoff(state, log);
    expect(next.gameOver).toBe(false);
  });

  it("does not trigger walk-off when inning < 9", () => {
    const { log } = makeLogs();
    const state = makeState({ inning: 8, atBat: 1, score: [1, 5] });
    const next = checkWalkoff(state, log);
    expect(next.gameOver).toBe(false);
  });

  it("triggers walk-off in extra innings (inning 10)", () => {
    const { logs, log } = makeLogs();
    const state = makeState({ inning: 10, atBat: 1, score: [4, 5] });
    const next = checkWalkoff(state, log);
    expect(next.gameOver).toBe(true);
    expect(logs.some(l => l.includes("Walk-off"))).toBe(true);
  });
});

describe("nextHalfInning", () => {
  it("switches atBat from 0 to 1 after away team's half", () => {
    const { log } = makeLogs();
    const state = makeState({ atBat: 0, inning: 3 });
    const next = nextHalfInning(state, log);
    expect(next.atBat).toBe(1);
    expect(next.inning).toBe(3);
  });

  it("switches atBat from 1 to 0 and increments inning after home team's half", () => {
    const { log } = makeLogs();
    const state = makeState({ atBat: 1, inning: 3 });
    const next = nextHalfInning(state, log);
    expect(next.atBat).toBe(0);
    expect(next.inning).toBe(4);
  });

  it("resets bases, outs, strikes, balls", () => {
    const { log } = makeLogs();
    const state = makeState({ outs: 2, strikes: 2, balls: 3, baseLayout: [1, 1, 1] });
    const next = nextHalfInning(state, log);
    expect(next.outs).toBe(0);
    expect(next.strikes).toBe(0);
    expect(next.balls).toBe(0);
    expect(next.baseLayout).toEqual([0, 0, 0]);
  });
});

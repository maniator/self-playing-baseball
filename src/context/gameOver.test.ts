import { describe, it, expect, afterEach, vi } from "vitest";
import { checkGameOver, checkWalkoff, nextHalfInning } from "./gameOver";
import { makeLogs, makeState } from "@test/testHelpers";

afterEach(() => vi.restoreAllMocks());

describe("checkGameOver", () => {
  it("triggers when inning >= 9 and teams are not tied", () => {
    const { logs, log } = makeLogs();
    const next = checkGameOver(makeState({ inning: 9, score: [3, 1] }), log);
    expect(next.gameOver).toBe(true);
    expect(logs.some(l => l.includes("ball game"))).toBe(true);
  });

  it("does not trigger when inning >= 9 but tied", () => {
    const { log } = makeLogs();
    expect(checkGameOver(makeState({ inning: 9, score: [3, 3] }), log).gameOver).toBe(false);
  });

  it("does not trigger when inning < 9", () => {
    const { log } = makeLogs();
    expect(checkGameOver(makeState({ inning: 8, score: [5, 2] }), log).gameOver).toBe(false);
  });

  it("away team wins when they have more runs", () => {
    const { logs, log } = makeLogs();
    checkGameOver(makeState({ inning: 9, score: [5, 3], teams: ["Visitors", "Home"] }), log);
    expect(logs.some(l => l.includes("Visitors"))).toBe(true);
  });
});

describe("checkWalkoff", () => {
  it("triggers walk-off when home team leads in bottom of 9th+", () => {
    const { logs, log } = makeLogs();
    const next = checkWalkoff(makeState({ inning: 9, atBat: 1, score: [2, 3] }), log);
    expect(next.gameOver).toBe(true);
    expect(logs.some(l => l.includes("Walk-off"))).toBe(true);
  });

  it("does not trigger walk-off if home team is not leading", () => {
    const { log } = makeLogs();
    expect(checkWalkoff(makeState({ inning: 9, atBat: 1, score: [3, 2] }), log).gameOver).toBe(false);
  });

  it("does not trigger walk-off when inning < 9", () => {
    const { log } = makeLogs();
    expect(checkWalkoff(makeState({ inning: 8, atBat: 1, score: [1, 5] }), log).gameOver).toBe(false);
  });

  it("triggers walk-off in extra innings (inning 10)", () => {
    const { logs, log } = makeLogs();
    const next = checkWalkoff(makeState({ inning: 10, atBat: 1, score: [4, 5] }), log);
    expect(next.gameOver).toBe(true);
    expect(logs.some(l => l.includes("Walk-off"))).toBe(true);
  });
});

describe("nextHalfInning", () => {
  it("switches atBat from 0 to 1 after away team's half", () => {
    const { log } = makeLogs();
    const next = nextHalfInning(makeState({ atBat: 0, inning: 3 }), log);
    expect(next.atBat).toBe(1);
    expect(next.inning).toBe(3);
  });

  it("switches atBat from 1 to 0 and increments inning after home team's half", () => {
    const { log } = makeLogs();
    const next = nextHalfInning(makeState({ atBat: 1, inning: 3 }), log);
    expect(next.atBat).toBe(0);
    expect(next.inning).toBe(4);
  });

  it("resets bases, outs, strikes, balls", () => {
    const { log } = makeLogs();
    const next = nextHalfInning(makeState({ outs: 2, strikes: 2, balls: 3, baseLayout: [1, 1, 1] }), log);
    expect(next.outs).toBe(0);
    expect(next.strikes).toBe(0);
    expect(next.balls).toBe(0);
    expect(next.baseLayout).toEqual([0, 0, 0]);
  });
});

describe("nextHalfInning — home team wins after top of 9th", () => {
  it("ends game without bottom of 9th when home is already winning", () => {
    const { logs, log } = makeLogs();
    const next = nextHalfInning(makeState({ atBat: 0, inning: 9, score: [1, 3] }), log);
    expect(next.gameOver).toBe(true);
    expect(logs.some(l => /win|9th/i.test(l))).toBe(true);
  });

  it("continues to bottom of 9th when scores are tied after top of 9th", () => {
    const { log } = makeLogs();
    const next = nextHalfInning(makeState({ atBat: 0, inning: 9, score: [2, 2] }), log);
    expect(next.gameOver).toBe(false);
    expect(next.atBat).toBe(1);
    expect(next.inning).toBe(9);
  });

  it("continues to bottom of 9th when away team is winning after top of 9th", () => {
    const { log } = makeLogs();
    const next = nextHalfInning(makeState({ atBat: 0, inning: 9, score: [4, 2] }), log);
    expect(next.gameOver).toBe(false);
    expect(next.atBat).toBe(1);
  });
});

describe("nextHalfInning — extra-inning tiebreak rule", () => {
  it("places runner on 2nd at start of top of 10th inning", () => {
    const { logs, log } = makeLogs();
    const next = nextHalfInning(makeState({ atBat: 1, inning: 9, outs: 3 }), log);
    expect(next.inning).toBe(10);
    expect(next.baseLayout).toEqual([0, 1, 0]);
    expect(logs.some(l => /tiebreak/i.test(l))).toBe(true);
  });

  it("places runner on 2nd at start of bottom of 10th inning", () => {
    const { logs, log } = makeLogs();
    const next = nextHalfInning(makeState({ atBat: 0, inning: 10 }), log);
    expect(next.inning).toBe(10);
    expect(next.atBat).toBe(1);
    expect(next.baseLayout).toEqual([0, 1, 0]);
    expect(logs.some(l => /tiebreak/i.test(l))).toBe(true);
  });

  it("does NOT place tiebreak runner in inning 9 or earlier", () => {
    const { log } = makeLogs();
    const next = nextHalfInning(makeState({ atBat: 1, inning: 8 }), log);
    expect(next.inning).toBe(9);
    expect(next.baseLayout).toEqual([0, 0, 0]);
  });
});

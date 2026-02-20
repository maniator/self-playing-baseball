import { describe, it, expect, afterEach, vi } from "vitest";
import { playerOut, nextBatter } from "../Context/playerOut";
import { makeLogs, makeState } from "./testHelpers";

afterEach(() => vi.restoreAllMocks());

describe("playerOut", () => {
  it("one out logs 'One out.' and increments outs", () => {
    const { logs, log } = makeLogs();
    const next = playerOut(makeState({ outs: 0 }), log);
    expect(next.outs).toBe(1);
    expect(logs).toContain("One out.");
  });

  it("two outs logs 'Two outs.' and increments outs", () => {
    const { logs, log } = makeLogs();
    const next = playerOut(makeState({ outs: 1 }), log);
    expect(next.outs).toBe(2);
    expect(logs).toContain("Two outs.");
  });

  it("three outs transitions to next half-inning", () => {
    const { log } = makeLogs();
    const next = playerOut(makeState({ outs: 2, atBat: 0, inning: 1 }), log);
    expect(next.outs).toBe(0);
    expect(next.atBat).toBe(1);
  });

  it("three outs in bottom of 9th with home leading → gameOver", () => {
    const { log } = makeLogs();
    const next = playerOut(makeState({ outs: 2, atBat: 1, inning: 9, score: [1, 2] }), log);
    expect(next.gameOver).toBe(true);
  });

  it("resets strikes and balls on out", () => {
    const { log } = makeLogs();
    const next = playerOut(makeState({ outs: 0, strikes: 2, balls: 3 }), log);
    expect(next.strikes).toBe(0);
    expect(next.balls).toBe(0);
  });

  it("does NOT rotate batting order when batterCompleted=false (caught stealing)", () => {
    const { log } = makeLogs();
    const next = playerOut(makeState({ batterIndex: [2, 0] }), log, false);
    expect(next.batterIndex[0]).toBe(2);
  });

  it("DOES rotate batting order when batterCompleted=true (strikeout / popup)", () => {
    const { log } = makeLogs();
    const next = playerOut(makeState({ batterIndex: [2, 0] }), log, true);
    expect(next.batterIndex[0]).toBe(3);
  });

  it("batting order does NOT reset between half-innings", () => {
    const { log } = makeLogs();
    const next = playerOut(
      makeState({ outs: 2, atBat: 0, inning: 1, batterIndex: [5, 0] }),
      log, true,
    );
    expect(next.atBat).toBe(1);
    expect(next.batterIndex[0]).toBe(6);
    expect(next.batterIndex[1]).toBe(0);
  });
});

describe("nextBatter", () => {
  it("advances batterIndex for the team currently at bat (team 0)", () => {
    const next = nextBatter(makeState({ atBat: 0, batterIndex: [3, 5] }));
    expect(next.batterIndex[0]).toBe(4);
    expect(next.batterIndex[1]).toBe(5);
  });

  it("advances batterIndex for the team currently at bat (team 1)", () => {
    const next = nextBatter(makeState({ atBat: 1, batterIndex: [3, 5] }));
    expect(next.batterIndex[0]).toBe(3);
    expect(next.batterIndex[1]).toBe(6);
  });

  it("wraps from position 8 back to 0 (end of lineup)", () => {
    const next = nextBatter(makeState({ atBat: 0, batterIndex: [8, 0] }));
    expect(next.batterIndex[0]).toBe(0);
  });
});

import { describe, it, expect, afterEach, vi } from "vitest";
import { Hit } from "@constants/hitTypes";
import { hitBall } from "./hitBall";
import { makeLogs, makeState, mockRandom } from "@test/testHelpers";
import * as rngModule from "@utils/rng";

afterEach(() => vi.restoreAllMocks());

const noop = () => {};

describe("hitBall", () => {
  it("single logs hit callout and places batter on 1st", () => {
    mockRandom(0);
    const { logs, log } = makeLogs();
    const next = hitBall(Hit.Single, makeState({ score: [0, 0], atBat: 0 }), log);
    expect(next.baseLayout[0]).toBe(1);
    expect(logs.some(l => l.includes("base hit"))).toBe(true);
  });

  it("pop-out: randomNumber >= popOutThreshold causes out", () => {
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.5);
    const { logs, log } = makeLogs();
    const next = hitBall(Hit.Single, makeState({ outs: 0 }), log);
    expect(next.outs).toBe(1);
    expect(logs.some(l => l.includes("out"))).toBe(true);
  });

  it("homerun is never popped out", () => {
    mockRandom(0.999);
    const { log } = makeLogs();
    const next = hitBall(Hit.Homerun, makeState({ score: [0, 0], atBat: 0 }), log);
    expect(next.score[0]).toBe(1);
    expect(next.gameOver).toBe(false);
  });

  it("runsScored updates score correctly", () => {
    mockRandom(0);
    const { log } = makeLogs();
    const next = hitBall(Hit.Single, makeState({ baseLayout: [0, 0, 1], score: [2, 0], atBat: 0 }), log);
    expect(next.score[0]).toBe(3);
  });
});

describe("hitBall — play log recording", () => {
  it("records a hit entry with correct batter number and event", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(Hit.Double, makeState({ batterIndex: [3, 0], atBat: 0, inning: 2 }), noop);
    expect(next.playLog).toHaveLength(1);
    const entry = next.playLog[0];
    expect(entry.batterNum).toBe(4);
    expect(entry.event).toBe(Hit.Double);
    expect(entry.inning).toBe(2);
    expect(entry.half).toBe(0);
    expect(entry.team).toBe(0);
  });

  it("does NOT record an entry for a pop-out", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0.99);
    const next = hitBall(Hit.Single, makeState({ atBat: 0 }), noop);
    expect(next.playLog).toHaveLength(0);
  });

  it("walk is recorded in play log", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(Hit.Walk, makeState({ batterIndex: [0, 0], atBat: 1, inning: 3 }), noop);
    expect(next.playLog).toHaveLength(1);
    expect(next.playLog[0].event).toBe(Hit.Walk);
    expect(next.playLog[0].half).toBe(1);
  });

  it("rotates batting order after a hit", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(Hit.Single, makeState({ batterIndex: [6, 0] }), noop);
    expect(next.batterIndex[0]).toBe(7);
  });
});

describe("hitBall — inningRuns tracking", () => {
  it("records runs scored by team in the correct inning slot", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(Hit.Single, makeState({ baseLayout: [0, 0, 1], atBat: 0, inning: 3 }), noop);
    expect(next.inningRuns[0][2]).toBe(1);
  });

  it("does not mutate other inning slots", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(Hit.Single, makeState({ baseLayout: [0, 0, 1], atBat: 0, inning: 5 }), noop);
    expect(next.inningRuns[0][0]).toBeUndefined();
    expect(next.inningRuns[1][4]).toBeUndefined();
  });

  it("accumulates runs across multiple hits in the same inning", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const mid = hitBall(Hit.Single, makeState({ baseLayout: [0, 0, 1], atBat: 0, inning: 2 }), noop);
    const final = hitBall(Hit.Single, { ...mid, baseLayout: [0, 0, 1] as [number, number, number] }, noop);
    expect(final.inningRuns[0][1]).toBe(2);
  });
});

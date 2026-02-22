import { afterEach, describe, expect, it, vi } from "vitest";

import { Hit } from "@constants/hitTypes";
import { makeLogs, makeState, mockRandom } from "@test/testHelpers";
import * as rngModule from "@utils/rng";

import { hitBall } from "./hitBall";

afterEach(() => vi.restoreAllMocks());

const noop = () => {};

describe("hitBall", () => {
  it("single logs hit callout and places batter on 1st", () => {
    mockRandom(0);
    const { logs, log } = makeLogs();
    const next = hitBall(Hit.Single, makeState({ score: [0, 0], atBat: 0 }), log);
    expect(next.baseLayout[0]).toBe(1);
    expect(logs.some((l) => l.includes("base hit"))).toBe(true);
  });

  it("pop-out: randomNumber >= popOutThreshold causes out", () => {
    vi.spyOn(rngModule, "random").mockReturnValueOnce(0.999).mockReturnValueOnce(0.5);
    const { logs, log } = makeLogs();
    const next = hitBall(Hit.Single, makeState({ outs: 0 }), log);
    expect(next.outs).toBe(1);
    expect(logs.some((l) => l.includes("out"))).toBe(true);
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
    const next = hitBall(
      Hit.Single,
      makeState({ baseLayout: [0, 0, 1], score: [2, 0], atBat: 0 }),
      log,
    );
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

describe("hitBall — RBI tracking", () => {
  it("single with no runners scores 0 RBI", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(Hit.Single, makeState({ baseLayout: [0, 0, 0], atBat: 0 }), noop);
    expect(next.playLog[0].rbi).toBe(0);
  });

  it("single with runner on 3rd scores 1 RBI", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(Hit.Single, makeState({ baseLayout: [0, 0, 1], atBat: 0 }), noop);
    expect(next.playLog[0].rbi).toBe(1);
  });

  it("double with runners on 2nd and 3rd scores 2 RBI", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(Hit.Double, makeState({ baseLayout: [0, 1, 1], atBat: 0 }), noop);
    expect(next.playLog[0].rbi).toBe(2);
  });

  it("triple with bases loaded scores 3 RBI", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(Hit.Triple, makeState({ baseLayout: [1, 1, 1], atBat: 0 }), noop);
    expect(next.playLog[0].rbi).toBe(3);
  });

  it("solo home run scores 1 RBI (batter only)", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(Hit.Homerun, makeState({ baseLayout: [0, 0, 0], atBat: 0 }), noop);
    expect(next.playLog[0].rbi).toBe(1);
  });

  it("grand slam scores 4 RBI", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(Hit.Homerun, makeState({ baseLayout: [1, 1, 1], atBat: 0 }), noop);
    expect(next.playLog[0].rbi).toBe(4);
  });

  it("bases-loaded walk scores 1 RBI", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(Hit.Walk, makeState({ baseLayout: [1, 1, 1], atBat: 0 }), noop);
    expect(next.playLog[0].rbi).toBe(1);
  });

  it("walk with bases not loaded scores 0 RBI", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(Hit.Walk, makeState({ baseLayout: [1, 0, 0], atBat: 0 }), noop);
    expect(next.playLog[0].rbi).toBe(0);
  });
});

describe("hitBall — handleGrounder (ground ball out paths)", () => {
  it("double play: runner on 1st, < 2 outs, DP roll < 65 → 2 outs recorded", () => {
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.999) // main roll >= 750 → pop-out zone
      .mockReturnValueOnce(0.2) // ground ball check: 20 < 40 → handleGrounder
      .mockReturnValueOnce(0.5); // DP check: 50 < 65 → double play
    const { logs, log } = makeLogs();
    const next = hitBall(Hit.Single, makeState({ baseLayout: [1, 0, 0], outs: 0 }), log);
    expect(next.outs).toBe(2);
    expect(logs.some((l) => l.includes("double play"))).toBe(true);
  });

  it("fielder's choice: runner on 1st, DP roll >= 65 → 1 out, batter safe at 1st", () => {
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.999) // main roll → pop-out zone
      .mockReturnValueOnce(0.2) // ground ball check → handleGrounder
      .mockReturnValueOnce(0.7); // DP check: 70 >= 65 → fielder's choice
    const { logs, log } = makeLogs();
    const next = hitBall(Hit.Single, makeState({ baseLayout: [1, 0, 0], outs: 0 }), log);
    expect(next.outs).toBe(1);
    expect(next.baseLayout[0]).toBe(1);
    expect(logs.some((l) => l.includes("fielder's choice"))).toBe(true);
  });

  it("simple ground out: no runner on 1st → out at first", () => {
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.999) // main roll → pop-out zone
      .mockReturnValueOnce(0.2); // ground ball check → handleGrounder (no runner, simple out)
    const { logs, log } = makeLogs();
    const next = hitBall(Hit.Single, makeState({ baseLayout: [0, 0, 0], outs: 1 }), log);
    expect(next.outs).toBe(2);
    expect(logs.some((l) => l.includes("out at first"))).toBe(true);
  });

  it("power strategy: pop-out zone with roll < 15 → homerun override", () => {
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.999) // main roll → pop-out zone (power threshold = 600)
      .mockReturnValueOnce(0.1); // power homerun check: 10 < 15 → homerun
    const { logs, log } = makeLogs();
    const next = hitBall(Hit.Single, makeState({ score: [0, 0], atBat: 0 }), log, "power");
    expect(next.score[0]).toBe(1);
    expect(logs.some((l) => l.includes("Home Run"))).toBe(true);
  });
});

describe("hitBall — inningRuns tracking", () => {
  it("records runs scored by team in the correct inning slot", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(
      Hit.Single,
      makeState({ baseLayout: [0, 0, 1], atBat: 0, inning: 3 }),
      noop,
    );
    expect(next.inningRuns[0][2]).toBe(1);
  });

  it("does not mutate other inning slots", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const next = hitBall(
      Hit.Single,
      makeState({ baseLayout: [0, 0, 1], atBat: 0, inning: 5 }),
      noop,
    );
    expect(next.inningRuns[0][0]).toBeUndefined();
    expect(next.inningRuns[1][4]).toBeUndefined();
  });

  it("accumulates runs across multiple hits in the same inning", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const mid = hitBall(
      Hit.Single,
      makeState({ baseLayout: [0, 0, 1], atBat: 0, inning: 2 }),
      noop,
    );
    const final = hitBall(
      Hit.Single,
      { ...mid, baseLayout: [0, 0, 1] as [number, number, number] },
      noop,
    );
    expect(final.inningRuns[0][1]).toBe(2);
  });
});

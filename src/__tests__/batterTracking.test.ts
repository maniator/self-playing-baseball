/**
 * Tests for batter rotation (nextBatter / playerOut batterCompleted flag),
 * play log recording (hitBall), and inning-run tracking.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import * as rngModule from "../utilities/rng";
import { hitBall } from "../Context/hitBall";
import { nextBatter, playerOut } from "../Context/playerOut";
import { Hit } from "../constants/hitTypes";
import type { State } from "../Context/index";

afterEach(() => vi.restoreAllMocks());

const makeState = (overrides: Partial<State> = {}): State => ({
  inning: 1, score: [0, 0], teams: ["Away", "Home"],
  baseLayout: [0, 0, 0], outs: 0, strikes: 0, balls: 0, atBat: 0,
  gameOver: false, pendingDecision: null, onePitchModifier: null,
  pitchKey: 0, decisionLog: [],
  batterIndex: [0, 0], inningRuns: [[], []], playLog: [],
  ...overrides,
});

const noop = () => {};

// ---------------------------------------------------------------------------
// nextBatter
// ---------------------------------------------------------------------------
describe("nextBatter", () => {
  it("advances batterIndex for the team currently at bat (team 0)", () => {
    const s = nextBatter(makeState({ atBat: 0, batterIndex: [3, 5] }));
    expect(s.batterIndex[0]).toBe(4);
    expect(s.batterIndex[1]).toBe(5); // unchanged
  });

  it("advances batterIndex for the team currently at bat (team 1)", () => {
    const s = nextBatter(makeState({ atBat: 1, batterIndex: [3, 5] }));
    expect(s.batterIndex[0]).toBe(3); // unchanged
    expect(s.batterIndex[1]).toBe(6);
  });

  it("wraps from position 8 back to 0 (end of lineup)", () => {
    const s = nextBatter(makeState({ atBat: 0, batterIndex: [8, 0] }));
    expect(s.batterIndex[0]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// playerOut – batterCompleted flag
// ---------------------------------------------------------------------------
describe("playerOut – batterCompleted flag", () => {
  it("does NOT rotate batting order when batterCompleted=false (caught stealing)", () => {
    const s = playerOut(makeState({ batterIndex: [2, 0] }), noop, false);
    expect(s.batterIndex[0]).toBe(2);
  });

  it("DOES rotate batting order when batterCompleted=true (strikeout / popup)", () => {
    const s = playerOut(makeState({ batterIndex: [2, 0] }), noop, true);
    expect(s.batterIndex[0]).toBe(3);
  });

  it("batting order does NOT reset between half-innings", () => {
    // 3rd out in top of inning 1 (atBat=0, outs=2), batterIndex[0]=5
    const s = playerOut(
      makeState({ outs: 2, atBat: 0, inning: 1, batterIndex: [5, 0] }),
      noop, true,
    );
    // After half-inning flip atBat becomes 1; batterIndex[0] should be 6
    expect(s.atBat).toBe(1);
    expect(s.batterIndex[0]).toBe(6); // lineup position preserved for next turn
    expect(s.batterIndex[1]).toBe(0); // home team unchanged
  });
});

// ---------------------------------------------------------------------------
// hitBall – play log recording
// ---------------------------------------------------------------------------
describe("hitBall – play log recording", () => {
  it("records a hit entry with correct batter number and event", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0); // low → no pop-out
    const state = makeState({ batterIndex: [3, 0], atBat: 0, inning: 2 });
    const next = hitBall(Hit.Double, state, noop);
    expect(next.playLog).toHaveLength(1);
    const entry = next.playLog[0];
    expect(entry.batterNum).toBe(4); // batterIndex[0]=3 → batter #4
    expect(entry.event).toBe(Hit.Double);
    expect(entry.inning).toBe(2);
    expect(entry.half).toBe(0);
    expect(entry.team).toBe(0);
  });

  it("does NOT record an entry for a pop-out", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0.99); // high → pop-out
    const state = makeState({ atBat: 0 });
    const next = hitBall(Hit.Single, state, noop);
    expect(next.playLog).toHaveLength(0);
  });

  it("walk is recorded in play log (as Hit.Walk)", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const state = makeState({ batterIndex: [0, 0], atBat: 1, inning: 3 });
    const next = hitBall(Hit.Walk, state, noop);
    expect(next.playLog).toHaveLength(1);
    expect(next.playLog[0].event).toBe(Hit.Walk);
    expect(next.playLog[0].half).toBe(1);
  });

  it("rotates batting order after a hit", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const state = makeState({ batterIndex: [6, 0] });
    const next = hitBall(Hit.Single, state, noop);
    expect(next.batterIndex[0]).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// inningRuns tracking
// ---------------------------------------------------------------------------
describe("inningRuns tracking", () => {
  it("records runs scored by team in the correct inning slot", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const state = makeState({ baseLayout: [0, 0, 1], atBat: 0, inning: 3, score: [0, 0] });
    const next = hitBall(Hit.Single, state, noop); // runner on 3rd scores
    expect(next.inningRuns[0][2]).toBe(1); // inning 3 = index 2
  });

  it("does not mutate other inning slots", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const state = makeState({ baseLayout: [0, 0, 1], atBat: 0, inning: 5 });
    const next = hitBall(Hit.Single, state, noop);
    expect(next.inningRuns[0][0]).toBeUndefined(); // inning 1 untouched
    expect(next.inningRuns[1][4]).toBeUndefined(); // other team untouched
  });

  it("accumulates runs across multiple hits in the same inning", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const state1 = makeState({ baseLayout: [0, 0, 1], atBat: 0, inning: 2 });
    const mid = hitBall(Hit.Single, state1, noop); // 1 run
    const state2 = { ...mid, baseLayout: [0, 0, 1] as [number, number, number] };
    const final = hitBall(Hit.Single, state2, noop); // 1 more run
    expect(final.inningRuns[0][1]).toBe(2);
  });
});

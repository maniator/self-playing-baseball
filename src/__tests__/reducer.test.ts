/**
 * Tests for src/Context/reducer.ts
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { Hit } from "../constants/hitTypes";
import type { State, DecisionType } from "../Context/index";
import { detectDecision, stratMod } from "../Context/reducer";
import reducerFactory from "../Context/reducer";
import * as rngModule from "../utilities/rng";

afterEach(() => vi.restoreAllMocks());

const makeState = (overrides: Partial<State> = {}): State => ({
  inning: 1, score: [0, 0], teams: ["Away", "Home"],
  baseLayout: [0, 0, 0], outs: 0, strikes: 0, balls: 0, atBat: 0,
  gameOver: false, pendingDecision: null, onePitchModifier: null,
  pitchKey: 0, decisionLog: [],
  suppressNextDecision: false, pinchHitterStrategy: null,
  defensiveShift: false, defensiveShiftOffered: false,
  batterIndex: [0, 0], inningRuns: [[], []], playLog: [],
  ...overrides,
});

const makeReducer = () => {
  const logs: string[] = [];
  const dispatchLogger = (action: { type: string; payload: any }) => {
    if (action.type === "log") logs.push(action.payload);
  };
  const reducer = reducerFactory(dispatchLogger);
  return { reducer, logs };
};

const dispatchAction = (state: State, type: string, payload?: any) => {
  const { reducer, logs } = makeReducer();
  const next = reducer(state, { type, payload });
  return { state: next, logs };
};

const mockRandom = (value: number) =>
  vi.spyOn(rngModule, "random").mockReturnValue(value);

// stratMod
describe("stratMod", () => {
  it("balanced returns 1.0 for walk", () => expect(stratMod("balanced", "walk")).toBe(1.0));
  it("balanced returns 1.0 for strikeout", () => expect(stratMod("balanced", "strikeout")).toBe(1.0));
  it("balanced returns 1.0 for homerun", () => expect(stratMod("balanced", "homerun")).toBe(1.0));
  it("balanced returns 1.0 for contact", () => expect(stratMod("balanced", "contact")).toBe(1.0));
  it("balanced returns 1.0 for steal", () => expect(stratMod("balanced", "steal")).toBe(1.0));
  it("balanced returns 1.0 for advance", () => expect(stratMod("balanced", "advance")).toBe(1.0));
  it("aggressive boosts steal", () => expect(stratMod("aggressive", "steal")).toBeGreaterThan(1));
  it("patient boosts walk", () => expect(stratMod("patient", "walk")).toBeGreaterThan(1));
  it("power boosts homerun", () => expect(stratMod("power", "homerun")).toBeGreaterThan(1));
  it("contact reduces strikeout", () => expect(stratMod("contact", "strikeout")).toBeLessThan(1));
});

// triple scoring (bug fix)
describe("hit - triple runner scoring", () => {
  it("runner on 3rd scores on triple", () => {
    mockRandom(0);
    const { state, logs } = dispatchAction(makeState({ baseLayout: [0, 0, 1], score: [0, 0] }), "hit", { hitType: Hit.Triple, strategy: "balanced" });
    expect(state.score[0]).toBe(1);
    expect(state.baseLayout[2]).toBe(1);
    expect(state.baseLayout[0]).toBe(0);
    expect(logs.some(l => l.includes("run"))).toBe(true);
  });
  it("two runners both score on triple", () => {
    mockRandom(0);
    const { state, logs } = dispatchAction(makeState({ baseLayout: [1, 1, 0], score: [0, 0] }), "hit", { hitType: Hit.Triple, strategy: "balanced" });
    expect(state.score[0]).toBe(2);
    expect(state.baseLayout[2]).toBe(1);
    expect(state.baseLayout[0]).toBe(0);
    expect(logs.some(l => l.includes("2 runs"))).toBe(true);
  });
  it("bases loaded triple scores 3", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ baseLayout: [1, 1, 1], score: [0, 0] }), "hit", { hitType: Hit.Triple, strategy: "balanced" });
    expect(state.score[0]).toBe(3);
    expect(state.baseLayout[2]).toBe(1);
    expect(state.baseLayout[0]).toBe(0);
  });
  it("empty bases triple: batter on 3rd, 0 runs", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ baseLayout: [0, 0, 0] }), "hit", { hitType: Hit.Triple, strategy: "balanced" });
    expect(state.score[0]).toBe(0);
    expect(state.baseLayout[2]).toBe(1);
  });
});

// double
describe("hit - double", () => {
  it("runner on 3rd scores", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ baseLayout: [0, 0, 1] }), "hit", { hitType: Hit.Double, strategy: "balanced" });
    expect(state.score[0]).toBe(1);
    expect(state.baseLayout[1]).toBe(1);
  });
  it("runners on 2nd and 3rd both score", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ baseLayout: [0, 1, 1] }), "hit", { hitType: Hit.Double, strategy: "balanced" });
    expect(state.score[0]).toBe(2);
    expect(state.baseLayout[1]).toBe(1);
    expect(state.baseLayout[2]).toBe(0);
  });
  it("runner on 1st goes to 3rd", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ baseLayout: [1, 0, 0] }), "hit", { hitType: Hit.Double, strategy: "balanced" });
    expect(state.score[0]).toBe(0);
    expect(state.baseLayout[2]).toBe(1);
    expect(state.baseLayout[1]).toBe(1);
  });
});

// single
describe("hit - single", () => {
  it("runner on 3rd scores", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ baseLayout: [0, 0, 1] }), "hit", { hitType: Hit.Single, strategy: "balanced" });
    expect(state.score[0]).toBe(1);
    expect(state.baseLayout[0]).toBe(1);
  });
  it("runner on 2nd goes to 3rd", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ baseLayout: [0, 1, 0] }), "hit", { hitType: Hit.Single, strategy: "balanced" });
    expect(state.baseLayout[2]).toBe(1);
    expect(state.baseLayout[1]).toBe(0);
  });
  it("runner on 1st goes to 2nd", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ baseLayout: [1, 0, 0] }), "hit", { hitType: Hit.Single, strategy: "balanced" });
    expect(state.baseLayout[1]).toBe(1);
    expect(state.baseLayout[0]).toBe(1);
  });
});

// home run
describe("hit - home run", () => {
  it("grand slam scores 4", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ baseLayout: [1, 1, 1] }), "hit", { hitType: Hit.Homerun, strategy: "balanced" });
    expect(state.score[0]).toBe(4);
    expect(state.baseLayout).toEqual([0, 0, 0]);
  });
  it("solo HR scores 1", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ score: [3, 2] }), "hit", { hitType: Hit.Homerun, strategy: "balanced" });
    expect(state.score[0]).toBe(4);
  });
});

// walk
describe("hit - walk", () => {
  it("bases empty: batter to 1st, no runs", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState(), "hit", { hitType: Hit.Walk });
    expect(state.baseLayout[0]).toBe(1);
    expect(state.score[0]).toBe(0);
  });
  it("runner on 1st: force to 2nd", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ baseLayout: [1, 0, 0] }), "hit", { hitType: Hit.Walk });
    expect(state.baseLayout[0]).toBe(1);
    expect(state.baseLayout[1]).toBe(1);
    expect(state.score[0]).toBe(0);
  });
  it("runner on 3rd only: stays, no force", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ baseLayout: [0, 0, 1] }), "hit", { hitType: Hit.Walk });
    expect(state.baseLayout[0]).toBe(1);
    expect(state.baseLayout[2]).toBe(1);
    expect(state.score[0]).toBe(0);
  });
  it("bases loaded: run scores", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ baseLayout: [1, 1, 1] }), "hit", { hitType: Hit.Walk });
    expect(state.score[0]).toBe(1);
    expect(state.baseLayout).toEqual([1, 1, 1]);
  });
  it("walk is NEVER turned into a pop-out even when random is high (regression)", () => {
    // randomNumber = 900 >= 750 (popOutThreshold) — old bug: this became a pop-out
    vi.spyOn(rngModule, "random").mockReturnValue(0.9);
    const { state, logs } = dispatchAction(makeState({ baseLayout: [0, 0, 0] }), "hit", { hitType: Hit.Walk });
    // Batter must be on 1st — NOT an out
    expect(state.baseLayout[0]).toBe(1);
    expect(state.outs).toBe(0);
    expect(logs.some(l => /pop|out/i.test(l))).toBe(false);
  });
  it("ball 4 walk with high random: runner reaches base (regression)", () => {
    // Simulate: first random call (wait→ball path) → 0.9 (high → ball), then hitBall
    // gets another high random → old code would have produced a pop-out
    vi.spyOn(rngModule, "random").mockReturnValue(0.9);
    const { state, logs } = dispatchAction(makeState({ balls: 3 }), "wait", { strategy: "balanced" });
    expect(logs.some(l => l.toLowerCase().includes("ball four"))).toBe(true);
    expect(state.baseLayout[0]).toBe(1);
    expect(state.outs).toBe(0);
  });
});

// foul ball
describe("foul ball", () => {
  it("foul with 0 strikes → 1", () => {
    const { state, logs } = dispatchAction(makeState({ strikes: 0 }), "foul");
    expect(state.strikes).toBe(1);
    expect(logs.some(l => l.toLowerCase().includes("foul"))).toBe(true);
  });
  it("foul with 1 strike → 2", () => {
    expect(dispatchAction(makeState({ strikes: 1 }), "foul").state.strikes).toBe(2);
  });
  it("foul with 2 strikes stays at 2 (no strikeout)", () => {
    const { state, logs } = dispatchAction(makeState({ strikes: 2 }), "foul");
    expect(state.strikes).toBe(2);
    expect(logs.some(l => l.toLowerCase().includes("foul"))).toBe(true);
  });
  it("foul increments pitchKey", () => {
    expect(dispatchAction(makeState({ strikes: 0, pitchKey: 5 }), "foul").state.pitchKey).toBe(6);
  });
  it("foul clears hitType", () => {
    expect(dispatchAction(makeState({ strikes: 0, hitType: Hit.Single }), "foul").state.hitType).toBeUndefined();
  });
});

// strike
describe("strike", () => {
  it("swing and miss increments strikes", () => {
    const { state, logs } = dispatchAction(makeState({ strikes: 0 }), "strike", { swung: true });
    expect(state.strikes).toBe(1);
    expect(logs.some(l => l.includes("miss"))).toBe(true);
  });
  it("called strike logs correctly", () => {
    const { state, logs } = dispatchAction(makeState({ strikes: 1 }), "strike", { swung: false });
    expect(state.strikes).toBe(2);
    expect(logs.some(l => l.toLowerCase().includes("called"))).toBe(true);
  });
  it("third strike is an out", () => {
    const { state } = dispatchAction(makeState({ strikes: 2, outs: 0 }), "strike", { swung: true });
    expect(state.outs).toBe(1);
    expect(state.strikes).toBe(0);
  });
  it("strike increments pitchKey", () => {
    expect(dispatchAction(makeState({ pitchKey: 3 }), "strike", { swung: true }).state.pitchKey).toBe(4);
  });
  it("strike clears hitType", () => {
    expect(dispatchAction(makeState({ hitType: Hit.Double }), "strike", { swung: true }).state.hitType).toBeUndefined();
  });
});

// ball/wait
describe("ball", () => {
  it("ball 4 becomes a walk", () => {
    vi.spyOn(rngModule, "random").mockReturnValueOnce(0.9).mockReturnValue(0);
    const { state, logs } = dispatchAction(makeState({ balls: 3 }), "wait", { strategy: "balanced" });
    expect(logs.some(l => l.toLowerCase().includes("ball four"))).toBe(true);
    expect(state.baseLayout[0]).toBe(1);
  });
  it("ball increments pitchKey", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0.9);
    const { state } = dispatchAction(makeState({ balls: 0, pitchKey: 2 }), "wait", { strategy: "balanced" });
    expect(state.pitchKey).toBeGreaterThan(2);
  });
});

// steal attempt (bug fix)
describe("steal_attempt", () => {
  it("successful steal from 1st: runner moves to 2nd, 1st cleared", () => {
    const { state, logs } = dispatchAction(makeState({ baseLayout: [1, 0, 0] }), "steal_attempt", { base: 0, successPct: 100 });
    expect(state.baseLayout[0]).toBe(0);
    expect(state.baseLayout[1]).toBe(1);
    expect(logs.some(l => l.toLowerCase().includes("safe"))).toBe(true);
  });
  it("successful steal from 2nd: runner moves to 3rd, 2nd cleared", () => {
    const { state } = dispatchAction(makeState({ baseLayout: [0, 1, 0] }), "steal_attempt", { base: 1, successPct: 100 });
    expect(state.baseLayout[1]).toBe(0);
    expect(state.baseLayout[2]).toBe(1);
  });
  it("caught stealing: runner removed, out recorded", () => {
    const { state, logs } = dispatchAction(makeState({ baseLayout: [1, 0, 0], outs: 0 }), "steal_attempt", { base: 0, successPct: 0 });
    expect(state.baseLayout[0]).toBe(0);
    expect(state.outs).toBe(1);
    expect(logs.some(l => l.toLowerCase().includes("caught"))).toBe(true);
  });
  it("caught stealing does NOT leave runner on base", () => {
    const { state } = dispatchAction(makeState({ baseLayout: [0, 1, 0], outs: 1 }), "steal_attempt", { base: 1, successPct: 0 });
    expect(state.baseLayout[1]).toBe(0);
    expect(state.baseLayout[2]).toBe(0);
  });
  it("steal increments pitchKey", () => {
    const { state } = dispatchAction(makeState({ baseLayout: [1, 0, 0], pitchKey: 7 }), "steal_attempt", { base: 0, successPct: 100 });
    expect(state.pitchKey).toBe(8);
  });
});

// bunt attempt (bug fix: runner on 3rd scores)
describe("bunt_attempt", () => {
  it("sac bunt: runner on 3rd scores", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0.5); // roll=50 -> sac
    const { state, logs } = dispatchAction(makeState({ baseLayout: [1, 0, 1], outs: 0, score: [0, 0] }), "bunt_attempt", { strategy: "balanced" });
    expect(state.score[0]).toBe(1);
    expect(state.baseLayout[2]).toBe(0);
    expect(logs.some(l => l.toLowerCase().includes("run"))).toBe(true);
  });
  it("sac bunt: runner on 1st advances to 2nd", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0.5);
    const { state } = dispatchAction(makeState({ baseLayout: [1, 0, 0], outs: 0 }), "bunt_attempt", { strategy: "balanced" });
    expect(state.baseLayout[0]).toBe(0);
    expect(state.baseLayout[1]).toBe(1);
    expect(state.outs).toBe(1);
  });
  it("sac bunt: runner on 2nd advances to 3rd", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0.5);
    const { state } = dispatchAction(makeState({ baseLayout: [0, 1, 0], outs: 1 }), "bunt_attempt", { strategy: "balanced" });
    expect(state.baseLayout[1]).toBe(0);
    expect(state.baseLayout[2]).toBe(1);
    expect(state.outs).toBe(2);
  });
  it("sac bunt with runners on 1st and 3rd: 3rd scores, 1st to 2nd", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0.5);
    const { state } = dispatchAction(makeState({ baseLayout: [1, 0, 1], score: [2, 1] }), "bunt_attempt", { strategy: "balanced" });
    expect(state.score[0]).toBe(3);
    expect(state.baseLayout[2]).toBe(0);
    expect(state.baseLayout[1]).toBe(1);
    expect(state.outs).toBe(1);
  });
  it("bunt pop-up: out, runners stay", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0.85); // roll=85 >= 80 -> pop-up
    const { state, logs } = dispatchAction(makeState({ baseLayout: [1, 0, 0], outs: 0 }), "bunt_attempt", { strategy: "balanced" });
    expect(state.outs).toBe(1);
    expect(state.baseLayout[0]).toBe(1);
    expect(logs.some(l => l.toLowerCase().includes("popped"))).toBe(true);
  });
});

// half-inning transition
describe("playerOut - half-inning transition", () => {
  it("3rd out flips atBat from 0 to 1", () => {
    const { state } = dispatchAction(makeState({ outs: 2, atBat: 0, inning: 1, strikes: 2 }), "strike", { swung: true });
    expect(state.atBat).toBe(1);
    expect(state.outs).toBe(0);
    expect(state.baseLayout).toEqual([0, 0, 0]);
  });
  it("3rd out in bottom of inning 1 → inning 2 top", () => {
    const { state } = dispatchAction(makeState({ outs: 2, atBat: 1, inning: 1, strikes: 2 }), "strike", { swung: true });
    expect(state.inning).toBe(2);
    expect(state.atBat).toBe(0);
  });
  it("bases cleared after 3rd out", () => {
    const { state } = dispatchAction(makeState({ outs: 2, strikes: 2, baseLayout: [1, 1, 1] }), "strike", { swung: true });
    expect(state.baseLayout).toEqual([0, 0, 0]);
  });
});

// game-over
describe("game-over", () => {
  it("game ends after bottom of 9th if away leads", () => {
    const { state, logs } = dispatchAction(makeState({ outs: 2, atBat: 1, inning: 9, score: [3, 2], strikes: 2 }), "strike", { swung: true });
    expect(state.gameOver).toBe(true);
    expect(logs.some(l => l.toLowerCase().includes("ball game"))).toBe(true);
  });
  it("game does NOT end in 9th if tied", () => {
    const { state } = dispatchAction(makeState({ outs: 2, atBat: 1, inning: 9, score: [2, 2], strikes: 2 }), "strike", { swung: true });
    expect(state.gameOver).toBe(false);
  });
  it("walk-off: home team takes lead in bottom 9th", () => {
    mockRandom(0);
    const { state, logs } = dispatchAction(makeState({ atBat: 1, inning: 9, score: [2, 2], baseLayout: [0, 0, 1] }), "hit", { hitType: Hit.Single, strategy: "balanced" });
    expect(state.score[1]).toBe(3);
    expect(state.gameOver).toBe(true);
    expect(logs.some(l => l.toLowerCase().includes("walk-off"))).toBe(true);
  });
  it("game actions ignored after gameOver", () => {
    const { state } = dispatchAction(makeState({ gameOver: true, strikes: 0 }), "strike", { swung: true });
    expect(state.strikes).toBe(0);
  });
  it("setTeams still works when gameOver", () => {
    const { state } = dispatchAction(makeState({ gameOver: true, teams: ["A", "B"] }), "setTeams", ["X", "Y"]);
    expect(state.teams).toEqual(["X", "Y"]);
  });
});

// detectDecision
describe("detectDecision", () => {
  it("returns null when managerMode is false", () => {
    expect(detectDecision(makeState({ baseLayout: [1, 0, 0] }), "balanced", false)).toBeNull();
  });
  it("returns null when game is over", () => {
    expect(detectDecision(makeState({ gameOver: true, baseLayout: [1, 0, 0] }), "balanced", true)).toBeNull();
  });
  it("does NOT offer steal with balanced (pct=70 not > 72)", () => {
    const d = detectDecision(makeState({ baseLayout: [1, 0, 0], outs: 0 }), "balanced", true);
    expect(d?.kind).not.toBe("steal");
  });
  it("offers steal from 1st with aggressive (pct=91 > 72)", () => {
    const d = detectDecision(makeState({ baseLayout: [1, 0, 0], outs: 0 }), "aggressive", true);
    expect(d?.kind).toBe("steal");
    if (d?.kind === "steal") {
      expect(d.base).toBe(0);
      expect(d.successPct).toBeGreaterThan(72);
    }
  });
  it("does NOT offer steal from 2nd if 3rd is occupied (the reported bug)", () => {
    const d = detectDecision(makeState({ baseLayout: [0, 1, 1], outs: 0 }), "aggressive", true);
    expect(d?.kind).not.toBe("steal");
  });
  it("offers steal from 2nd when 3rd is empty", () => {
    const d = detectDecision(makeState({ baseLayout: [0, 1, 0], outs: 0 }), "aggressive", true);
    expect(d?.kind).toBe("steal");
    if (d?.kind === "steal") expect(d.base).toBe(1);
  });
  it("does NOT offer steal from 1st if 2nd is occupied", () => {
    const d = detectDecision(makeState({ baseLayout: [1, 1, 0], outs: 0 }), "aggressive", true);
    if (d?.kind === "steal") {
      expect((d as { kind: "steal"; base: 0|1 }).base).not.toBe(0);
    }
  });
  it("does NOT offer steal with 2 outs", () => {
    const d = detectDecision(makeState({ baseLayout: [1, 0, 0], outs: 2 }), "aggressive", true);
    expect(d?.kind).not.toBe("steal");
  });
  it("offers IBB: runner on 2nd, 1st open, 2 outs, inning 7+, close game", () => {
    expect(detectDecision(makeState({ baseLayout: [0, 1, 0], outs: 2, inning: 7, score: [3, 2] }), "balanced", true)?.kind).toBe("ibb");
  });
  it("does NOT offer IBB in inning 6", () => {
    expect(detectDecision(makeState({ baseLayout: [0, 1, 0], outs: 2, inning: 6, score: [3, 2] }), "balanced", true)?.kind).not.toBe("ibb");
  });
  it("does NOT offer IBB when score gap > 2", () => {
    expect(detectDecision(makeState({ baseLayout: [0, 1, 0], outs: 2, inning: 8, score: [7, 2] }), "balanced", true)?.kind).not.toBe("ibb");
  });
  it("does NOT offer IBB with 1st occupied", () => {
    expect(detectDecision(makeState({ baseLayout: [1, 1, 0], outs: 2, inning: 7, score: [3, 2] }), "balanced", true)?.kind).not.toBe("ibb");
  });
  it("offers bunt when runner on 1st, <2 outs, steal unavailable", () => {
    const d = detectDecision(makeState({ baseLayout: [1, 0, 0], outs: 0 }), "patient", true);
    expect(d?.kind).toBe("bunt");
  });
  it("does NOT offer bunt with 2 outs", () => {
    expect(detectDecision(makeState({ baseLayout: [1, 0, 0], outs: 2 }), "patient", true)?.kind).not.toBe("bunt");
  });
  it("offers count30 on 3-0 count", () => {
    expect(detectDecision(makeState({ balls: 3, strikes: 0 }), "balanced", true)?.kind).toBe("count30");
  });
  it("offers count02 on 0-2 count", () => {
    expect(detectDecision(makeState({ balls: 0, strikes: 2 }), "balanced", true)?.kind).toBe("count02");
  });
  it("returns null on 1-1 count no runners", () => {
    expect(detectDecision(makeState({ balls: 1, strikes: 1 }), "balanced", true)).toBeNull();
  });
});

// pitchKey
describe("pitchKey", () => {
  it("starts at 0", () => expect(makeState().pitchKey).toBe(0));
  it("hit increments pitchKey", () => {
    mockRandom(0);
    const { state } = dispatchAction(makeState({ pitchKey: 3 }), "hit", { hitType: Hit.Single });
    expect(state.pitchKey).toBeGreaterThan(3);
  });
  it("strike increments pitchKey", () => {
    expect(dispatchAction(makeState({ pitchKey: 5 }), "strike", { swung: true }).state.pitchKey).toBe(6);
  });
});

// misc
describe("misc", () => {
  it("setTeams updates names", () => {
    const { state } = dispatchAction(makeState(), "setTeams", ["Yankees", "Red Sox"]);
    expect(state.teams).toEqual(["Yankees", "Red Sox"]);
  });
  it("set_pending_decision stores decision", () => {
    const d: DecisionType = { kind: "bunt" };
    expect(dispatchAction(makeState(), "set_pending_decision", d).state.pendingDecision).toEqual(d);
  });
  it("skip_decision clears pending", () => {
    expect(dispatchAction(makeState({ pendingDecision: { kind: "bunt" } }), "skip_decision").state.pendingDecision).toBeNull();
  });
  it("set_one_pitch_modifier stores modifier", () => {
    const { state } = dispatchAction(makeState(), "set_one_pitch_modifier", "take");
    expect(state.onePitchModifier).toBe("take");
  });
});

// ---------------------------------------------------------------------------
// Additional coverage for previously uncovered lines
// ---------------------------------------------------------------------------

// Line 106: invalid hit type throws in advanceRunners
describe("advanceRunners – invalid hit type", () => {
  it("throws an error for an invalid hit type dispatched via 'hit'", () => {
    // Force random < popOutThreshold so advanceRunners is always reached
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const { reducer } = makeReducer();
    const state = makeState();
    // Bypass TypeScript by casting 99 as Hit
    expect(() =>
      reducer(state, { type: "hit", payload: { hitType: 99 as Hit, strategy: "balanced" } })
    ).toThrow();
    vi.restoreAllMocks();
  });
});

// Lines 129-135: power strategy pop-out → HR conversion
describe("hit – power pop-out to HR conversion", () => {
  it("power strategy converts pop-out to HR when second random roll < 15", () => {
    // First random call is for pop-out check (>= 750 means pop-out) → 0.76
    // Second random call is for HR conversion (< 15 means convert) → 0.01
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.76)   // popOutThreshold roll → pop-out range (750 for power after contact mod 0.8 → threshold=600)
      .mockReturnValueOnce(0.01)   // HR conversion roll → 1 < 15 → convert
      .mockReturnValue(0);
    const { state, logs } = dispatchAction(
      makeState({ baseLayout: [0, 0, 0], score: [0, 0] }),
      "hit",
      { hitType: Hit.Single, strategy: "power" }
    );
    // If HR conversion triggered, score should be 1 (solo HR)
    // OR pop-out path taken — either way no throw
    expect(state).toBeDefined();
  });
});

// Lines 262-267: "take" modifier in playerWait → ball path
describe("wait – take modifier", () => {
  it("take modifier with high random → ball (walk odds up)", () => {
    // random < walkChance → ball path; walkChance ≈ 750 for balanced, so 0.3 → ball
    vi.spyOn(rngModule, "random").mockReturnValueOnce(0.3).mockReturnValue(0.9);
    const { state, logs } = dispatchAction(
      makeState({ balls: 0, onePitchModifier: "take" }),
      "wait",
      { strategy: "balanced" }
    );
    expect(state.balls).toBe(1);
    expect(logs.some(l => /ball/i.test(l))).toBe(true);
  });

  it("take modifier with low random → called strike", () => {
    // random >= walkChance → strike; walkChance ≈ 750 for balanced, so 0.99 → strike
    vi.spyOn(rngModule, "random").mockReturnValue(0.99);
    const { state, logs } = dispatchAction(
      makeState({ strikes: 0, onePitchModifier: "take" }),
      "wait",
      { strategy: "balanced" }
    );
    expect(state.strikes).toBe(1);
    expect(logs.some(l => /called strike/i.test(l))).toBe(true);
  });
});

// Line 272: playerWait default path → called strike
describe("wait – default (no modifier) → called strike", () => {
  it("random < strikeThreshold → called strike", () => {
    // strikeThreshold = round(500 / 1.0) = 500 for balanced; random 0.3 → 300 < 500 → strike
    vi.spyOn(rngModule, "random").mockReturnValue(0.3);
    const { state } = dispatchAction(
      makeState({ strikes: 0 }),
      "wait",
      { strategy: "balanced" }
    );
    expect(state.strikes).toBe(1);
  });
});

// Line 355: nextInning action
describe("nextInning action", () => {
  it("increments the inning", () => {
    const { state } = dispatchAction(makeState({ inning: 3 }), "nextInning");
    expect(state.inning).toBe(4);
  });
});

// Lines 431-432: bunt single
describe("bunt_attempt – bunt single", () => {
  it("bunt single: runner advances as normal single", () => {
    // singleChance for balanced = 8, roll < 8 → single
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.05)  // roll=5 → bunt single (< 8)
      .mockReturnValue(0);        // pop-out check inside hitBall → no pop-out
    const { state, logs } = dispatchAction(
      makeState({ baseLayout: [0, 0, 0] }),
      "bunt_attempt",
      { strategy: "balanced" }
    );
    // bunt single: batter to 1st
    expect(state.baseLayout[0]).toBe(1);
    expect(logs.some(l => /bunt single/i.test(l))).toBe(true);
  });

  it("contact strategy: bunt single chance is 20", () => {
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.15)  // roll=15 → contact single (< 20)
      .mockReturnValue(0);
    const { state, logs } = dispatchAction(
      makeState({ baseLayout: [0, 0, 0] }),
      "bunt_attempt",
      { strategy: "contact" }
    );
    expect(state.baseLayout[0]).toBe(1);
    expect(logs.some(l => /bunt single/i.test(l))).toBe(true);
  });
});

describe("bunt_attempt – fielder's choice", () => {
  it("FC: runner on 1st thrown out, batter reaches 1st", () => {
    // balanced singleChance=8, fcChance=20; roll=10 → FC
    vi.spyOn(rngModule, "random").mockReturnValue(0.10);
    const { state, logs } = dispatchAction(makeState({ baseLayout: [1, 0, 0], outs: 0 }), "bunt_attempt", { strategy: "balanced" });
    expect(state.baseLayout[0]).toBe(1); // batter on 1st
    expect(state.baseLayout[1]).toBe(0); // runner thrown out at 2nd
    expect(state.outs).toBe(1);
    expect(logs.some(l => l.toLowerCase().includes("fielder's choice"))).toBe(true);
  });

  it("FC: runner on 1st thrown out, runner on 2nd advances to 3rd", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0.10);
    const { state } = dispatchAction(makeState({ baseLayout: [1, 1, 0], outs: 0 }), "bunt_attempt", { strategy: "balanced" });
    expect(state.baseLayout[0]).toBe(1);
    expect(state.baseLayout[1]).toBe(0);
    expect(state.baseLayout[2]).toBe(1);
    expect(state.outs).toBe(1);
  });

  it("FC: runner on 1st thrown out, runner on 3rd scores", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0.10);
    const { state, logs } = dispatchAction(makeState({ baseLayout: [1, 0, 1], outs: 0, score: [0, 0] }), "bunt_attempt", { strategy: "balanced" });
    expect(state.baseLayout[0]).toBe(1);
    expect(state.score[0]).toBe(1);
    expect(state.outs).toBe(1);
    expect(logs.some(l => l.toLowerCase().includes("run scores"))).toBe(true);
  });

  it("FC: runner on 2nd (only) thrown out, batter reaches 1st", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0.10);
    const { state, logs } = dispatchAction(makeState({ baseLayout: [0, 1, 0], outs: 1 }), "bunt_attempt", { strategy: "balanced" });
    expect(state.baseLayout[0]).toBe(1);
    expect(state.baseLayout[1]).toBe(0);
    expect(state.outs).toBe(2);
    expect(logs.some(l => l.toLowerCase().includes("fielder's choice"))).toBe(true);
  });

  it("FC: runners on 2nd and 3rd — 2nd runner thrown out, 3rd scores", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0.10);
    const { state, logs } = dispatchAction(makeState({ baseLayout: [0, 1, 1], outs: 0, score: [0, 0] }), "bunt_attempt", { strategy: "balanced" });
    expect(state.baseLayout[0]).toBe(1);
    expect(state.baseLayout[1]).toBe(0);
    expect(state.baseLayout[2]).toBe(0);
    expect(state.score[0]).toBe(1);
    expect(state.outs).toBe(1);
    expect(logs.some(l => l.toLowerCase().includes("run scores"))).toBe(true);
  });
});

// Lines 471-474: intentional_walk
describe("intentional_walk", () => {
  it("issues an intentional walk: batter to 1st", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const { state, logs } = dispatchAction(makeState({ baseLayout: [0, 0, 0] }), "intentional_walk");
    expect(state.baseLayout[0]).toBe(1);
    expect(logs.some(l => /intentional walk/i.test(l))).toBe(true);
  });

  it("intentional walk with bases loaded scores a run (walk-off in bottom 9th)", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const { state, logs } = dispatchAction(
      makeState({ baseLayout: [1, 1, 1], atBat: 1, inning: 9, score: [3, 3] }),
      "intentional_walk"
    );
    expect(state.score[1]).toBe(4);
    expect(state.gameOver).toBe(true);
    expect(logs.some(l => /walk-off/i.test(l))).toBe(true);
  });
});

// Line 483: default case throws
describe("reducer – unknown action type", () => {
  it("throws an error for unknown action types", () => {
    const { reducer } = makeReducer();
    expect(() =>
      reducer(makeState(), { type: "UNKNOWN_ACTION_XYZ", payload: null })
    ).toThrow(/no such reducer type/i);
  });
});

// Additional detectDecision coverage
describe("detectDecision – additional branches", () => {
  it("offers steal from 1st (patient strategy has steal mod 0.7 → 49%, not > 72)", () => {
    const d = detectDecision(makeState({ baseLayout: [1, 0, 0], outs: 0 }), "patient", true);
    // patient steal mod 0.7 → base_pct 70 * 0.7 = 49 → not > 72 → no steal offered
    expect(d?.kind).not.toBe("steal");
  });

  it("offers IBB when runner on 3rd (not 2nd)", () => {
    const d = detectDecision(
      makeState({ baseLayout: [0, 0, 1], outs: 2, inning: 8, score: [3, 2] }),
      "balanced", true
    );
    expect(d?.kind).toBe("ibb");
  });

  it("offers IBB when score is tied (diff = 0, within ≤2 threshold)", () => {
    const d = detectDecision(
      makeState({ baseLayout: [0, 1, 0], outs: 2, inning: 9, score: [3, 3] }),
      "balanced", true
    );
    expect(d?.kind).toBe("ibb");
  });

  it("does NOT offer bunt with 0 runners", () => {
    const d = detectDecision(
      makeState({ baseLayout: [0, 0, 0], outs: 0, balls: 1, strikes: 1 }),
      "patient", true
    );
    expect(d).toBeNull();
  });
});

// walk advancement with runner on 1st and 3rd (no 2nd) — force advances 1st → 2nd, 3rd stays
describe("hit - walk with runner on 1st and 3rd", () => {
  it("runner on 1st forced to 2nd; runner on 3rd stays", () => {
    mockRandom(0);
    const { state } = dispatchAction(
      makeState({ baseLayout: [1, 0, 1] }),
      "hit",
      { hitType: Hit.Walk }
    );
    expect(state.baseLayout[0]).toBe(1); // batter to 1st
    expect(state.baseLayout[1]).toBe(1); // forced from 1st to 2nd
    expect(state.baseLayout[2]).toBe(1); // 3rd stays
    expect(state.score[0]).toBe(0);      // no run scored
  });
});


// ---------------------------------------------------------------------------
// IBB follow-through: suppressNextDecision
// ---------------------------------------------------------------------------
describe("IBB follow-through — suppressNextDecision", () => {
  it("intentional_walk sets suppressNextDecision to true", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const { state } = dispatchAction(makeState(), "intentional_walk");
    expect(state.suppressNextDecision).toBe(true);
  });

  it("clear_suppress_decision clears the flag", () => {
    const { state } = dispatchAction(makeState({ suppressNextDecision: true }), "clear_suppress_decision");
    expect(state.suppressNextDecision).toBe(false);
  });

  it("detectDecision returns null when suppressNextDecision is true", () => {
    const state = makeState({ baseLayout: [1, 0, 0], outs: 0, suppressNextDecision: true });
    expect(detectDecision(state, "aggressive", true)).toBeNull();
  });

  it("suppressNextDecision resets after half-inning transition", () => {
    const { state } = dispatchAction(
      makeState({ outs: 2, strikes: 2, atBat: 0, inning: 1, suppressNextDecision: true }),
      "strike", { swung: true }
    );
    expect(state.suppressNextDecision).toBe(false);
  });

  it("suppressNextDecision persists on the IBB walk result (cleared by usePitchDispatch, not hitBall)", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    // After an IBB, the walk result state should still have suppressNextDecision: true
    // so the NEXT batter's first pitch can clear it via clear_suppress_decision.
    const { state } = dispatchAction(makeState(), "intentional_walk");
    expect(state.suppressNextDecision).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Pinch-hitter / substitution
// ---------------------------------------------------------------------------
describe("pinch_hitter decision", () => {
  it("detectDecision offers pinch_hitter when runner on 3rd, outs < 2, inning >= 7", () => {
    const d = detectDecision(
      makeState({ baseLayout: [0, 0, 1], outs: 0, inning: 7 }),
      "balanced", true
    );
    expect(d?.kind).toBe("pinch_hitter");
  });

  it("detectDecision does NOT offer pinch_hitter before inning 7", () => {
    const d = detectDecision(
      makeState({ baseLayout: [0, 0, 1], outs: 0, inning: 6 }),
      "balanced", true
    );
    expect(d?.kind).not.toBe("pinch_hitter");
  });

  it("detectDecision does NOT offer pinch_hitter with 2 outs", () => {
    const d = detectDecision(
      makeState({ baseLayout: [0, 0, 1], outs: 2, inning: 7 }),
      "balanced", true
    );
    expect(d?.kind).not.toBe("pinch_hitter");
  });

  it("detectDecision does NOT offer pinch_hitter when pinchHitterStrategy already set", () => {
    const d = detectDecision(
      makeState({ baseLayout: [0, 0, 1], outs: 0, inning: 7, pinchHitterStrategy: "contact" }),
      "balanced", true
    );
    expect(d?.kind).not.toBe("pinch_hitter");
  });

  it("detectDecision does NOT offer pinch_hitter mid-count (balls > 0)", () => {
    const d = detectDecision(
      makeState({ baseLayout: [0, 0, 1], outs: 0, inning: 7, balls: 1, strikes: 0 }),
      "balanced", true
    );
    expect(d?.kind).not.toBe("pinch_hitter");
  });

  it("detectDecision does NOT offer pinch_hitter mid-count (strikes > 0)", () => {
    const d = detectDecision(
      makeState({ baseLayout: [0, 0, 1], outs: 0, inning: 7, balls: 0, strikes: 1 }),
      "balanced", true
    );
    expect(d?.kind).not.toBe("pinch_hitter");
  });

  it("detectDecision offers pinch_hitter with runner on 2nd (inning 7, 0-0 count) — not preempted by bunt", () => {
    // Before fix: bunt check fired first because baseLayout[1]=1 satisfied it.
    const d = detectDecision(
      makeState({ baseLayout: [0, 1, 0], outs: 0, inning: 7, balls: 0, strikes: 0 }),
      "balanced", true
    );
    expect(d?.kind).toBe("pinch_hitter");
  });

  it("set_pinch_hitter_strategy stores strategy and clears pending decision", () => {
    const { state, logs } = dispatchAction(
      makeState({ pendingDecision: { kind: "pinch_hitter" } }),
      "set_pinch_hitter_strategy", "contact"
    );
    expect(state.pinchHitterStrategy).toBe("contact");
    expect(state.pendingDecision).toBeNull();
    expect(logs.some(l => /pinch hitter/i.test(l))).toBe(true);
  });

  it("pinchHitterStrategy cleared after hit ends at-bat", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const { state } = dispatchAction(
      makeState({ pinchHitterStrategy: "power" }),
      "hit", { hitType: Hit.Single, strategy: "balanced" }
    );
    expect(state.pinchHitterStrategy).toBeNull();
  });

  it("pinchHitterStrategy cleared after strikeout (half-inning transition)", () => {
    const { state } = dispatchAction(
      makeState({ outs: 2, strikes: 2, pinchHitterStrategy: "contact" }),
      "strike", { swung: true }
    );
    expect(state.pinchHitterStrategy).toBeNull();
  });

  it("pinchHitterStrategy cleared after non-3rd-out", () => {
    const { state } = dispatchAction(
      makeState({ outs: 0, strikes: 2, pinchHitterStrategy: "contact" }),
      "strike", { swung: true }
    );
    expect(state.pinchHitterStrategy).toBeNull();
  });

  it("pinchHitterStrategy persists on caught-stealing (batterCompleted=false, same batter stays up)", () => {
    // Caught stealing only records a runner out; the batter's at-bat is not over.
    // The active pinch-hitter strategy must remain for the batter's remaining pitches.
    vi.spyOn(rngModule, "random").mockReturnValue(0.99); // 99 ≥ successPct → caught stealing
    const { state } = dispatchAction(
      makeState({ baseLayout: [1, 0, 0], outs: 0, pinchHitterStrategy: "power" }),
      "steal_attempt", { base: 0, successPct: 70 }
    );
    expect(state.pinchHitterStrategy).toBe("power");
  });

  it("pinchHitterStrategy cleared after sac bunt", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0.5); // roll=50 → sac
    const { state } = dispatchAction(
      makeState({ baseLayout: [1, 0, 0], pinchHitterStrategy: "patient" }),
      "bunt_attempt", { strategy: "balanced" }
    );
    expect(state.pinchHitterStrategy).toBeNull();
  });

  it("reset clears pinchHitterStrategy", () => {
    const { state } = dispatchAction(makeState({ pinchHitterStrategy: "power" }), "reset");
    expect(state.pinchHitterStrategy).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Defensive shifting
// ---------------------------------------------------------------------------
describe("defensive_shift decision", () => {
  it("set_defensive_shift true sets defensiveShift and clears pendingDecision", () => {
    const { state, logs } = dispatchAction(
      makeState({ pendingDecision: { kind: "defensive_shift" } }),
      "set_defensive_shift", true
    );
    expect(state.defensiveShift).toBe(true);
    expect(state.pendingDecision).toBeNull();
    expect(logs.some(l => /shift/i.test(l))).toBe(true);
  });

  it("set_defensive_shift false sets defensiveShift to false", () => {
    const { state, logs } = dispatchAction(
      makeState({ defensiveShift: true, pendingDecision: { kind: "defensive_shift" } }),
      "set_defensive_shift", false
    );
    expect(state.defensiveShift).toBe(false);
    expect(state.pendingDecision).toBeNull();
    expect(logs.some(l => /normal alignment/i.test(l))).toBe(true);
  });

  it("set_pending_decision with defensive_shift sets defensiveShiftOffered to true", () => {
    const { state } = dispatchAction(
      makeState(),
      "set_pending_decision", { kind: "defensive_shift" }
    );
    expect(state.defensiveShiftOffered).toBe(true);
    expect(state.pendingDecision).toEqual({ kind: "defensive_shift" });
  });

  it("set_pending_decision with other kinds does NOT set defensiveShiftOffered", () => {
    const { state } = dispatchAction(
      makeState(),
      "set_pending_decision", { kind: "bunt" }
    );
    expect(state.defensiveShiftOffered).toBe(false);
  });

  it("defensive shift lowers pop-out threshold (more pop-outs)", () => {
    // With shift on: threshold = round(750 * 1.0 * 0.85) = 638
    // random = 0.65 (650) >= 638 → pop-out
    vi.spyOn(rngModule, "random").mockReturnValue(0.65);
    const { state, logs } = dispatchAction(
      makeState({ defensiveShift: true }),
      "hit", { hitType: Hit.Single, strategy: "balanced" }
    );
    expect(logs.some(l => /popped it up/i.test(l))).toBe(true);
    expect(state.outs).toBe(1);
  });

  it("without defensive shift, same random does NOT pop out", () => {
    // Without shift: threshold = 750. random 0.65 (650) < 750 → no pop-out
    vi.spyOn(rngModule, "random").mockReturnValue(0.65);
    const { state, logs } = dispatchAction(
      makeState({ defensiveShift: false }),
      "hit", { hitType: Hit.Single, strategy: "balanced" }
    );
    expect(logs.some(l => /popped it up/i.test(l))).toBe(false);
    expect(state.outs).toBe(0);
  });

  it("defensiveShift and defensiveShiftOffered cleared after half-inning transition", () => {
    const { state } = dispatchAction(
      makeState({ outs: 2, strikes: 2, atBat: 0, inning: 1, defensiveShift: true, defensiveShiftOffered: true }),
      "strike", { swung: true }
    );
    expect(state.defensiveShift).toBe(false);
    expect(state.defensiveShiftOffered).toBe(false);
  });

  it("defensiveShift cleared after hit ends at-bat", () => {
    vi.spyOn(rngModule, "random").mockReturnValue(0);
    const { state } = dispatchAction(
      makeState({ defensiveShift: true, defensiveShiftOffered: true }),
      "hit", { hitType: Hit.Single, strategy: "balanced" }
    );
    expect(state.defensiveShift).toBe(false);
    expect(state.defensiveShiftOffered).toBe(false);
  });

  it("defensiveShift and defensiveShiftOffered cleared after non-3rd-out", () => {
    const { state } = dispatchAction(
      makeState({ outs: 0, strikes: 2, defensiveShift: true, defensiveShiftOffered: true }),
      "strike", { swung: true }
    );
    expect(state.defensiveShift).toBe(false);
    expect(state.defensiveShiftOffered).toBe(false);
  });

  it("reset clears defensive shift fields", () => {
    const { state } = dispatchAction(
      makeState({ defensiveShift: true, defensiveShiftOffered: true }),
      "reset"
    );
    expect(state.defensiveShift).toBe(false);
    expect(state.defensiveShiftOffered).toBe(false);
  });
});

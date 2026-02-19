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
  pitchKey: 0, decisionLog: [], ...overrides,
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

/**
 * Targeted tests for src/context/handlers/decisions.ts
 *
 * Verifies that:
 * - non-decision actions return undefined (sentinel)
 * - each decision action produces the correct state transition
 * - withDecisionLog is applied when a pendingDecision is present
 * - log messages are emitted for actions that require them
 */

import { describe, expect, it } from "vitest";

import { makeLogs, makeState } from "@test/testHelpers";

import { handleDecisionsAction } from "./decisions";

// ---------------------------------------------------------------------------
// Sentinel: non-decision actions return undefined
// ---------------------------------------------------------------------------

describe("handleDecisionsAction — non-decision actions return undefined", () => {
  it("returns undefined for 'hit'", () => {
    const { log } = makeLogs();
    expect(handleDecisionsAction(makeState(), { type: "hit" }, { log })).toBeUndefined();
  });
  it("returns undefined for 'reset'", () => {
    const { log } = makeLogs();
    expect(handleDecisionsAction(makeState(), { type: "reset" }, { log })).toBeUndefined();
  });
  it("returns undefined for 'setTeams'", () => {
    const { log } = makeLogs();
    expect(
      handleDecisionsAction(makeState(), { type: "setTeams", payload: ["A", "B"] }, { log }),
    ).toBeUndefined();
  });
  it("returns undefined for unknown action types", () => {
    const { log } = makeLogs();
    expect(handleDecisionsAction(makeState(), { type: "__unknown__" }, { log })).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// set_one_pitch_modifier
// ---------------------------------------------------------------------------

describe("handleDecisionsAction — set_one_pitch_modifier", () => {
  it("stores modifier and clears pendingDecision", () => {
    const { log } = makeLogs();
    const state = makeState({ pendingDecision: { kind: "count30" }, onePitchModifier: null });
    const next = handleDecisionsAction(
      state,
      { type: "set_one_pitch_modifier", payload: "take" },
      { log },
    );
    expect(next?.onePitchModifier).toBe("take");
    expect(next?.pendingDecision).toBeNull();
  });

  it("appends to decisionLog when pendingDecision is set", () => {
    const { log } = makeLogs();
    const state = makeState({ pitchKey: 3, pendingDecision: { kind: "count30" } });
    const next = handleDecisionsAction(
      state,
      { type: "set_one_pitch_modifier", payload: "swing" },
      { log },
    );
    expect(next?.decisionLog).toContain("3:swing");
  });

  it("does NOT append to decisionLog when no pendingDecision", () => {
    const { log } = makeLogs();
    const state = makeState({ pitchKey: 3, pendingDecision: null });
    const next = handleDecisionsAction(
      state,
      { type: "set_one_pitch_modifier", payload: "take" },
      { log },
    );
    expect(next?.decisionLog).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// skip_decision
// ---------------------------------------------------------------------------

describe("handleDecisionsAction — skip_decision", () => {
  it("clears pendingDecision", () => {
    const { log } = makeLogs();
    const state = makeState({ pendingDecision: { kind: "bunt" } });
    const next = handleDecisionsAction(state, { type: "skip_decision" }, { log });
    expect(next?.pendingDecision).toBeNull();
  });

  it("appends ':skip' to decisionLog when pendingDecision is set", () => {
    const { log } = makeLogs();
    const state = makeState({ pitchKey: 5, pendingDecision: { kind: "bunt" } });
    const next = handleDecisionsAction(state, { type: "skip_decision" }, { log });
    expect(next?.decisionLog).toContain("5:skip");
  });

  it("does NOT append to decisionLog when no pendingDecision", () => {
    const { log } = makeLogs();
    const state = makeState({ pitchKey: 5, pendingDecision: null });
    const next = handleDecisionsAction(state, { type: "skip_decision" }, { log });
    expect(next?.decisionLog).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// set_pending_decision
// ---------------------------------------------------------------------------

describe("handleDecisionsAction — set_pending_decision", () => {
  it("stores the pending decision", () => {
    const { log } = makeLogs();
    const state = makeState();
    const next = handleDecisionsAction(
      state,
      { type: "set_pending_decision", payload: { kind: "bunt" } },
      { log },
    );
    expect(next?.pendingDecision).toEqual({ kind: "bunt" });
  });

  it("sets defensiveShiftOffered when kind is 'defensive_shift'", () => {
    const { log } = makeLogs();
    const state = makeState({ defensiveShiftOffered: false });
    const next = handleDecisionsAction(
      state,
      { type: "set_pending_decision", payload: { kind: "defensive_shift" } },
      { log },
    );
    expect(next?.defensiveShiftOffered).toBe(true);
    expect(next?.pendingDecision).toEqual({ kind: "defensive_shift" });
  });

  it("does NOT set defensiveShiftOffered for non-shift decisions", () => {
    const { log } = makeLogs();
    const state = makeState({ defensiveShiftOffered: false });
    const next = handleDecisionsAction(
      state,
      { type: "set_pending_decision", payload: { kind: "bunt" } },
      { log },
    );
    expect(next?.defensiveShiftOffered).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clear_suppress_decision
// ---------------------------------------------------------------------------

describe("handleDecisionsAction — clear_suppress_decision", () => {
  it("clears suppressNextDecision flag", () => {
    const { log } = makeLogs();
    const state = makeState({ suppressNextDecision: true });
    const next = handleDecisionsAction(state, { type: "clear_suppress_decision" }, { log });
    expect(next?.suppressNextDecision).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// set_pinch_hitter_strategy
// ---------------------------------------------------------------------------

describe("handleDecisionsAction — set_pinch_hitter_strategy", () => {
  it("stores the pinch hitter strategy and clears pendingDecision", () => {
    const { log } = makeLogs();
    const state = makeState({ pendingDecision: { kind: "pinch_hitter" } });
    const next = handleDecisionsAction(
      state,
      { type: "set_pinch_hitter_strategy", payload: "contact" },
      { log },
    );
    expect(next?.pinchHitterStrategy).toBe("contact");
    expect(next?.pendingDecision).toBeNull();
  });

  it("logs a pinch hitter message", () => {
    const { log, logs } = makeLogs();
    const state = makeState();
    handleDecisionsAction(state, { type: "set_pinch_hitter_strategy", payload: "power" }, { log });
    expect(logs.some((l) => /pinch hitter/i.test(l))).toBe(true);
  });

  it("appends to decisionLog with pitchKey:pinch:strategy format", () => {
    const { log } = makeLogs();
    const state = makeState({ pitchKey: 4, pendingDecision: { kind: "pinch_hitter" } });
    const next = handleDecisionsAction(
      state,
      { type: "set_pinch_hitter_strategy", payload: "patient" },
      { log },
    );
    expect(next?.decisionLog).toContain("4:pinch:patient");
  });
});

// ---------------------------------------------------------------------------
// set_defensive_shift
// ---------------------------------------------------------------------------

describe("handleDecisionsAction — set_defensive_shift", () => {
  it("sets defensiveShift to true and clears pendingDecision, logs shift message", () => {
    const { log, logs } = makeLogs();
    const state = makeState({
      defensiveShift: false,
      pendingDecision: { kind: "defensive_shift" },
    });
    const next = handleDecisionsAction(
      state,
      { type: "set_defensive_shift", payload: true },
      { log },
    );
    expect(next?.defensiveShift).toBe(true);
    expect(next?.pendingDecision).toBeNull();
    expect(logs.some((l) => /shift/i.test(l))).toBe(true);
  });

  it("sets defensiveShift to false and logs normal alignment message", () => {
    const { log, logs } = makeLogs();
    const state = makeState({ defensiveShift: true, pendingDecision: { kind: "defensive_shift" } });
    const next = handleDecisionsAction(
      state,
      { type: "set_defensive_shift", payload: false },
      { log },
    );
    expect(next?.defensiveShift).toBe(false);
    expect(logs.some((l) => /normal alignment/i.test(l))).toBe(true);
  });

  it("appends to decisionLog with pitchKey:shift:on/off format", () => {
    const { log } = makeLogs();
    const state = makeState({ pitchKey: 6, pendingDecision: { kind: "defensive_shift" } });
    const next = handleDecisionsAction(
      state,
      { type: "set_defensive_shift", payload: true },
      { log },
    );
    expect(next?.decisionLog).toContain("6:shift:on");
  });
});

// ---------------------------------------------------------------------------
// make_substitution — batter
// ---------------------------------------------------------------------------

describe("handleDecisionsAction — make_substitution (batter)", () => {
  it("swaps bench player into lineup and sends old player to bench", () => {
    const { log } = makeLogs();
    const state = makeState({
      lineupOrder: [["batter1", "batter2", "batter3"], []],
      rosterBench: [["bench1"], []],
      playerOverrides: [
        { bench1: { nickname: "Bench Player" }, batter1: { nickname: "Starter One" } },
        {},
      ],
    });
    const next = handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "batter", lineupIdx: 0, benchPlayerId: "bench1" },
      },
      { log },
    );
    expect(next?.lineupOrder[0][0]).toBe("bench1");
    expect(next?.rosterBench[0]).toContain("batter1");
    expect(next?.rosterBench[0]).not.toContain("bench1");
  });

  it("logs the substitution with player names", () => {
    const { log, logs } = makeLogs();
    const state = makeState({
      lineupOrder: [["p1", "p2"], []],
      rosterBench: [["p3"], []],
      playerOverrides: [{ p1: { nickname: "Alpha" }, p3: { nickname: "Gamma" } }, {}],
    });
    handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "batter", lineupIdx: 0, benchPlayerId: "p3" },
      },
      { log },
    );
    expect(logs.some((l) => l.includes("Gamma") && l.includes("Alpha"))).toBe(true);
  });

  it("does not modify other team lineup or bench", () => {
    const { log } = makeLogs();
    const state = makeState({
      lineupOrder: [
        ["a1", "a2"],
        ["h1", "h2"],
      ],
      rosterBench: [["ab1"], ["hb1"]],
    });
    const next = handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "batter", lineupIdx: 0, benchPlayerId: "ab1" },
      },
      { log },
    );
    expect(next?.lineupOrder[1]).toEqual(["h1", "h2"]);
    expect(next?.rosterBench[1]).toEqual(["hb1"]);
  });

  it("returns unchanged state when benchPlayerId is not in bench roster", () => {
    const { log } = makeLogs();
    const state = makeState({
      lineupOrder: [["p1"], []],
      rosterBench: [["bench1"], []],
    });
    const next = handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "batter", lineupIdx: 0, benchPlayerId: "NOT_IN_BENCH" },
      },
      { log },
    );
    expect(next?.lineupOrder[0]).toEqual(["p1"]);
    expect(next?.rosterBench[0]).toEqual(["bench1"]);
  });

  it("returns unchanged state when lineupIdx is out of range", () => {
    const { log } = makeLogs();
    const state = makeState({
      lineupOrder: [["p1"], []],
      rosterBench: [["b1"], []],
    });
    const next = handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "batter", lineupIdx: 99, benchPlayerId: "b1" },
      },
      { log },
    );
    expect(next?.lineupOrder[0]).toEqual(["p1"]);
  });
});

// ---------------------------------------------------------------------------
// make_substitution — pitcher
// ---------------------------------------------------------------------------

describe("handleDecisionsAction — make_substitution (pitcher)", () => {
  it("updates activePitcherIdx for the correct team", () => {
    const { log } = makeLogs();
    const state = makeState({
      rosterPitchers: [["sp1", "rp1", "rp2"], ["sp2"]],
      activePitcherIdx: [0, 0],
    });
    const next = handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "pitcher", pitcherIdx: 2 },
      },
      { log },
    );
    expect(next?.activePitcherIdx[0]).toBe(2);
    expect(next?.activePitcherIdx[1]).toBe(0);
  });

  it("logs the pitching change with pitcher name", () => {
    const { log, logs } = makeLogs();
    const state = makeState({
      rosterPitchers: [["sp1", "rp1"], []],
      activePitcherIdx: [0, 0],
      playerOverrides: [{ rp1: { nickname: "Relief Ace" } }, {}],
    });
    handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "pitcher", pitcherIdx: 1 },
      },
      { log },
    );
    expect(logs.some((l) => l.includes("Relief Ace"))).toBe(true);
  });

  it("returns unchanged state when pitcherIdx equals current active", () => {
    const { log } = makeLogs();
    const state = makeState({
      rosterPitchers: [["sp1", "rp1"], []],
      activePitcherIdx: [1, 0],
    });
    const next = handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "pitcher", pitcherIdx: 1 },
      },
      { log },
    );
    expect(next?.activePitcherIdx[0]).toBe(1);
  });

  it("returns unchanged state when pitcherIdx is out of range", () => {
    const { log } = makeLogs();
    const state = makeState({
      rosterPitchers: [["sp1"], []],
      activePitcherIdx: [0, 0],
    });
    const next = handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "pitcher", pitcherIdx: 99 },
      },
      { log },
    );
    expect(next?.activePitcherIdx[0]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Manager announcer identity — team name in log messages
// ---------------------------------------------------------------------------

describe("handleDecisionsAction — manager announcer identity", () => {
  it("set_pinch_hitter_strategy includes batting team name in log", () => {
    const { log, logs } = makeLogs();
    const state = makeState({
      teams: ["Mets", "Yankees"],
      atBat: 0,
      pendingDecision: { kind: "pinch_hitter" },
    });
    handleDecisionsAction(state, { type: "set_pinch_hitter_strategy", payload: "power" }, { log });
    expect(logs.some((l) => l.includes("Mets") && /pinch hitter/i.test(l))).toBe(true);
  });

  it("set_defensive_shift includes fielding team name in log", () => {
    const { log, logs } = makeLogs();
    const state = makeState({
      teams: ["Mets", "Yankees"],
      atBat: 0, // Mets batting → Yankees fielding
      defensiveShift: false,
      pendingDecision: { kind: "defensive_shift" },
    });
    handleDecisionsAction(state, { type: "set_defensive_shift", payload: true }, { log });
    expect(logs.some((l) => l.includes("Yankees") && /shift/i.test(l))).toBe(true);
  });

  it("set_defensive_shift false includes fielding team name in normal alignment message", () => {
    const { log, logs } = makeLogs();
    const state = makeState({
      teams: ["Mets", "Yankees"],
      atBat: 1, // Yankees batting → Mets fielding
      defensiveShift: true,
      pendingDecision: { kind: "defensive_shift" },
    });
    handleDecisionsAction(state, { type: "set_defensive_shift", payload: false }, { log });
    expect(logs.some((l) => l.includes("Mets") && /normal alignment/i.test(l))).toBe(true);
  });

  it("make_substitution (batter) includes team name in log", () => {
    const { log, logs } = makeLogs();
    const state = makeState({
      teams: ["RedSox", "Cubs"],
      lineupOrder: [["starter1"], []],
      rosterBench: [["bench1"], []],
      playerOverrides: [{ starter1: { nickname: "Starter" }, bench1: { nickname: "Sub" } }, {}],
    });
    handleDecisionsAction(
      state,
      {
        type: "make_substitution",
        payload: { teamIdx: 0, kind: "batter", lineupIdx: 0, benchPlayerId: "bench1" },
      },
      { log },
    );
    expect(logs.some((l) => l.includes("RedSox"))).toBe(true);
  });

  it("make_substitution (pitcher) includes team name in manager log", () => {
    const { log, logs } = makeLogs();
    const state = makeState({
      teams: ["RedSox", "Cubs"],
      rosterPitchers: [["sp1", "rp1"], []],
      activePitcherIdx: [0, 0],
      playerOverrides: [{ rp1: { nickname: "Reliever" } }, {}],
    });
    handleDecisionsAction(
      state,
      { type: "make_substitution", payload: { teamIdx: 0, kind: "pitcher", pitcherIdx: 1 } },
      { log },
    );
    expect(logs.some((l) => l.includes("RedSox") && l.includes("manager"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Defensive shift de-spam — no re-announcement when shift state unchanged
// ---------------------------------------------------------------------------

describe("handleDecisionsAction — defensive shift de-spam", () => {
  it("suppresses log when shift is already ON and player selects ON again", () => {
    const { log, logs } = makeLogs();
    const state = makeState({
      defensiveShift: true,
      pendingDecision: { kind: "defensive_shift" },
    });
    handleDecisionsAction(state, { type: "set_defensive_shift", payload: true }, { log });
    expect(logs).toHaveLength(0);
  });

  it("suppresses log when shift is already OFF and player selects OFF again", () => {
    const { log, logs } = makeLogs();
    const state = makeState({
      defensiveShift: false,
      pendingDecision: { kind: "defensive_shift" },
    });
    handleDecisionsAction(state, { type: "set_defensive_shift", payload: false }, { log });
    expect(logs).toHaveLength(0);
  });

  it("clears pendingDecision even when shift state is unchanged (no-op)", () => {
    const { log } = makeLogs();
    const state = makeState({
      defensiveShift: true,
      pendingDecision: { kind: "defensive_shift" },
    });
    const next = handleDecisionsAction(
      state,
      { type: "set_defensive_shift", payload: true },
      { log },
    );
    expect(next?.pendingDecision).toBeNull();
    expect(next?.defensiveShift).toBe(true);
  });

  it("still announces when shift state actually changes (OFF → ON)", () => {
    const { log, logs } = makeLogs();
    const state = makeState({
      defensiveShift: false,
      pendingDecision: { kind: "defensive_shift" },
    });
    handleDecisionsAction(state, { type: "set_defensive_shift", payload: true }, { log });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((l) => /shift/i.test(l))).toBe(true);
  });

  it("still announces when shift state actually changes (ON → OFF)", () => {
    const { log, logs } = makeLogs();
    const state = makeState({
      defensiveShift: true,
      pendingDecision: { kind: "defensive_shift" },
    });
    handleDecisionsAction(state, { type: "set_defensive_shift", payload: false }, { log });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((l) => /normal alignment/i.test(l))).toBe(true);
  });
});

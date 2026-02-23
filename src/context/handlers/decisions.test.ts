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

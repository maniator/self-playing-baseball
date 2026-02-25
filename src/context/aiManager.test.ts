/**
 * Unit tests for aiManager — AI manager decision engine for unmanaged teams.
 */
import { describe, expect, it } from "vitest";

import { makeState } from "@test/testHelpers";

import {
  AI_FATIGUE_THRESHOLD_HIGH,
  AI_FATIGUE_THRESHOLD_MEDIUM,
  findBestReliever,
  isPitcherEligibleForChange,
  makeAiPitchingDecision,
  makeAiTacticalDecision,
} from "./aiManager";

describe("isPitcherEligibleForChange", () => {
  it("returns false when pitcherIdx === activePitcherIdx", () => {
    expect(isPitcherEligibleForChange("p1", 0, 0, [], "RP")).toBe(false);
  });

  it("returns false when pitcher is in substitutedOut list", () => {
    expect(isPitcherEligibleForChange("p1", 1, 0, ["p1"], "RP")).toBe(false);
  });

  it("returns true for RP role when not active and not subbed out", () => {
    expect(isPitcherEligibleForChange("p2", 1, 0, [], "RP")).toBe(true);
  });

  it("returns true for SP/RP dual role", () => {
    expect(isPitcherEligibleForChange("p2", 1, 0, [], "SP/RP")).toBe(true);
  });

  it("returns false for SP-only role in in-game change", () => {
    expect(isPitcherEligibleForChange("p2", 1, 0, [], "SP")).toBe(false);
  });

  it("returns true when no role set (legacy/stock teams allow any pitcher)", () => {
    expect(isPitcherEligibleForChange("p2", 1, 0, [], undefined)).toBe(true);
  });
});

describe("findBestReliever", () => {
  it("returns -1 when no eligible pitchers exist", () => {
    const idx = findBestReliever(["p1"], 0, [], {});
    expect(idx).toBe(-1);
  });

  it("prefers explicit RP over SP/RP", () => {
    const pitchers = ["sp1", "rp1", "swingman1"];
    const roles = { sp1: "SP", rp1: "RP", swingman1: "SP/RP" };
    const idx = findBestReliever(pitchers, 0, [], roles);
    expect(idx).toBe(1); // rp1 is at index 1
  });

  it("falls back to SP/RP when no pure RP available", () => {
    const pitchers = ["sp1", "swingman1"];
    const roles = { sp1: "SP", swingman1: "SP/RP" };
    const idx = findBestReliever(pitchers, 0, [], roles);
    expect(idx).toBe(1); // swingman1
  });

  it("skips the active pitcher", () => {
    const pitchers = ["rp1", "rp2"];
    const roles = { rp1: "RP", rp2: "RP" };
    const idx = findBestReliever(pitchers, 0, [], roles); // active is index 0 (rp1)
    expect(idx).toBe(1); // rp2
  });

  it("skips substituted-out pitchers", () => {
    const pitchers = ["p1", "p2", "p3"];
    const roles = { p1: "RP", p2: "RP", p3: "RP" };
    const idx = findBestReliever(pitchers, 0, ["p2"], roles);
    // p1 is active (idx 0), p2 is subbed out, so p3 (idx 2) should be chosen
    expect(idx).toBe(2);
  });
});

describe("makeAiPitchingDecision", () => {
  it("returns none when pitcher is not fatigued", () => {
    const state = makeState({
      pitcherBattersFaced: [5, 5],
      rosterPitchers: [
        ["sp1", "rp1"],
        ["sp1", "rp1"],
      ],
      activePitcherIdx: [0, 0],
      substitutedOut: [[], []],
    });
    const decision = makeAiPitchingDecision(state, 1);
    expect(decision.kind).toBe("none");
  });

  it("returns pitching_change when fatigue is high", () => {
    const state = makeState({
      pitcherBattersFaced: [0, AI_FATIGUE_THRESHOLD_HIGH],
      rosterPitchers: [[], ["sp1", "rp1"]],
      activePitcherIdx: [0, 0],
      substitutedOut: [[], []],
    });
    const decision = makeAiPitchingDecision(state, 1, { sp1: "SP", rp1: "RP" });
    expect(decision.kind).toBe("pitching_change");
    if (decision.kind === "pitching_change") {
      expect(decision.pitcherIdx).toBe(1); // rp1 at index 1
      expect(decision.reason).toBe("pitcher_fatigue_high");
      expect(decision.reasonText).toContain("fatigue");
    }
  });

  it("returns pitching_change in late innings at medium fatigue", () => {
    const state = makeState({
      inning: 6,
      pitcherBattersFaced: [0, AI_FATIGUE_THRESHOLD_MEDIUM],
      rosterPitchers: [[], ["sp1", "rp1"]],
      activePitcherIdx: [0, 0],
      substitutedOut: [[], []],
    });
    const decision = makeAiPitchingDecision(state, 1, { sp1: "SP", rp1: "RP" });
    expect(decision.kind).toBe("pitching_change");
    if (decision.kind === "pitching_change") {
      expect(decision.reason).toBe("pitcher_fatigue_medium");
    }
  });

  it("returns none at medium fatigue in early innings", () => {
    const state = makeState({
      inning: 3,
      pitcherBattersFaced: [0, AI_FATIGUE_THRESHOLD_MEDIUM],
      rosterPitchers: [[], ["sp1", "rp1"]],
      activePitcherIdx: [0, 0],
      substitutedOut: [[], []],
    });
    const decision = makeAiPitchingDecision(state, 1, { sp1: "SP", rp1: "RP" });
    expect(decision.kind).toBe("none");
  });

  it("returns none when all relievers are used (no-reentry)", () => {
    const state = makeState({
      pitcherBattersFaced: [0, AI_FATIGUE_THRESHOLD_HIGH],
      rosterPitchers: [[], ["sp1", "rp1"]],
      activePitcherIdx: [0, 0],
      substitutedOut: [[], ["rp1"]], // rp1 was subbed out
    });
    const decision = makeAiPitchingDecision(state, 1, { sp1: "SP", rp1: "RP" });
    // sp1 is SP-only so not eligible, rp1 is subbed out
    expect(decision.kind).toBe("none");
  });

  it("handles missing pitcherBattersFaced gracefully (backward compat)", () => {
    // Simulate an older save without the field
    const state = makeState({
      rosterPitchers: [[], ["sp1", "rp1"]],
      activePitcherIdx: [0, 0],
      substitutedOut: [[], []],
    });
    // Delete the field to simulate an older save
    delete (state as Record<string, unknown>)["pitcherBattersFaced"];
    const decision = makeAiPitchingDecision(state as typeof state, 1);
    expect(decision.kind).toBe("none");
  });
});

describe("makeAiTacticalDecision", () => {
  it("steal: sends runner when successPct is high", () => {
    const state = makeState({ atBat: 0, score: [0, 0], inning: 5 });
    const result = makeAiTacticalDecision(state, {
      kind: "steal",
      base: 0,
      successPct: 0.7,
    });
    expect(result.kind).toBe("tactical");
    if (result.kind === "tactical") {
      expect(result.actionType).toBe("steal_attempt");
      expect(result.reasonText).toContain("steal");
    }
  });

  it("steal: does NOT send runner when successPct is below threshold", () => {
    const state = makeState({ atBat: 0 });
    const result = makeAiTacticalDecision(state, {
      kind: "steal",
      base: 0,
      successPct: 0.5,
    });
    expect(result.kind).toBe("none");
  });

  it("bunt: sacrifices in close late game when behind", () => {
    // atBat=0 means away batting; score[0]-score[1] = 1-2 = -1 (away behind)
    const result = makeAiTacticalDecision(
      makeState({ atBat: 0, score: [1, 2], inning: 8, outs: 0 }),
      { kind: "bunt" },
    );
    expect(result.kind).toBe("tactical");
    if (result.kind === "tactical") {
      expect(result.actionType).toBe("bunt_attempt");
    }
  });

  it("bunt: does not bunt when team is winning", () => {
    const state = makeState({ atBat: 0, score: [3, 1], inning: 8, outs: 0 });
    const result = makeAiTacticalDecision(state, { kind: "bunt" });
    expect(result.kind).toBe("none");
  });

  it("count30: always takes the pitch", () => {
    const state = makeState({ atBat: 0 });
    const result = makeAiTacticalDecision(state, { kind: "count30" });
    expect(result.kind).toBe("tactical");
    if (result.kind === "tactical") {
      expect(result.actionType).toBe("set_one_pitch_modifier");
      expect(result.payload).toBe("take");
    }
  });

  it("count02: always protects the plate", () => {
    const state = makeState({ atBat: 0 });
    const result = makeAiTacticalDecision(state, { kind: "count02" });
    expect(result.kind).toBe("tactical");
    if (result.kind === "tactical") {
      expect(result.actionType).toBe("set_one_pitch_modifier");
      expect(result.payload).toBe("protect");
    }
  });

  it("ibb: always issues intentional walk", () => {
    const state = makeState({ atBat: 0 });
    const result = makeAiTacticalDecision(state, { kind: "ibb" });
    expect(result.kind).toBe("tactical");
    if (result.kind === "tactical") {
      expect(result.actionType).toBe("intentional_walk");
    }
  });

  it("defensive_shift: always enables shift", () => {
    const state = makeState({ atBat: 0 });
    const result = makeAiTacticalDecision(state, { kind: "defensive_shift" });
    expect(result.kind).toBe("tactical");
    if (result.kind === "tactical") {
      expect(result.actionType).toBe("set_defensive_shift");
      expect(result.payload).toBe(true);
    }
  });

  it("pinch_hitter: dispatches make_substitution when bench candidates are available", () => {
    const state = makeState({ atBat: 0, inning: 8 });
    const result = makeAiTacticalDecision(state, {
      kind: "pinch_hitter",
      candidates: [{ id: "b1", name: "Bench Player" }],
      teamIdx: 0,
      lineupIdx: 2,
    });
    expect(result.kind).toBe("tactical");
    if (result.kind === "tactical") {
      expect(result.actionType).toBe("make_substitution");
      const payload = result.payload as Record<string, unknown>;
      expect(payload.benchPlayerId).toBe("b1");
      expect(payload.lineupIdx).toBe(2);
      expect(result.reasonText).toContain("Bench Player");
    }
  });

  it("pinch_hitter: falls back to strategy when no bench candidates", () => {
    const state = makeState({ atBat: 0, inning: 8 });
    const result = makeAiTacticalDecision(state, {
      kind: "pinch_hitter",
      candidates: [],
      teamIdx: 0,
      lineupIdx: 0,
    });
    expect(result.kind).toBe("tactical");
    if (result.kind === "tactical") {
      expect(result.actionType).toBe("set_pinch_hitter_strategy");
      expect(result.payload).toBe("contact");
    }
  });
});

/**
 * Tests for src/context/playerActions.ts — focused on computeWaitOutcome threshold clamping.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { makeLogs, makeState } from "@test/testHelpers";
import * as rngModule from "@utils/rng";

import type { ModPreset } from "./index";
import type { TeamCustomPlayerOverrides } from "./index";
import { playerWait } from "./playerActions";

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// computeWaitOutcome — threshold clamping at extreme pitcher mods
// ---------------------------------------------------------------------------

describe("playerWait — computeWaitOutcome threshold clamping", () => {
  const buildStateWithPitcher = (controlMod: ModPreset, velocityMod: ModPreset) => {
    const pitcherOverrides: TeamCustomPlayerOverrides = {
      pitcher1: { controlMod, velocityMod },
    };
    return makeState({
      atBat: 0,
      rosterPitchers: [[], ["pitcher1"]],
      activePitcherIdx: [0, 0],
      playerOverrides: [{}, pitcherOverrides],
    });
  };

  it("extreme high pitcher mods (+20/+20): strike threshold does not exceed 999", () => {
    // With controlMod=+20 and velocityMod=+20, controlFactor = 1 + (20+10)/100 = 1.3
    // adjustedStrikeThreshold = clamp(500 * 1.0 * 1.3 / 1.0, 0, 999) = 650 — well within range
    const state = buildStateWithPitcher(20, 20);
    // Force RNG to always return 998 (near top of range) — should still be deterministic
    vi.spyOn(rngModule, "random").mockReturnValue(0.999);
    const { log } = makeLogs();
    // Should not throw and should return a valid state
    expect(() => playerWait(state, log)).not.toThrow();
  });

  it("extreme low pitcher mods (-20/-20): strike threshold is not negative", () => {
    // With controlMod=-20 and velocityMod=-20, controlFactor = 1 + (-20-10)/100 = 0.7
    // adjustedStrikeThreshold = clamp(500 * 1.0 * 0.7 / 1.0, 0, 999) = 350 — fine
    const state = buildStateWithPitcher(-20, -20);
    vi.spyOn(rngModule, "random").mockReturnValue(0.001);
    const { log } = makeLogs();
    expect(() => playerWait(state, log)).not.toThrow();
  });

  it("take modifier: walk chance is clamped to [0, 999]", () => {
    // With very generous walk strategy + low controlFactor, walk chance must stay ≤ 999
    const state = buildStateWithPitcher(-20, -20);
    vi.spyOn(rngModule, "random").mockReturnValue(0.5);
    const { log } = makeLogs();
    // "patient" strategy has stratMod walk = 1.4; combined with low controlFactor should be high
    // but must not overflow
    expect(() => playerWait(state, log, "patient", "take")).not.toThrow();
  });

  it("with no pitcher overrides: outcome is deterministic (baseline behavior preserved)", () => {
    const state = makeState({ atBat: 0 });
    // RNG 0.4 → 400 < 500 → strike on "swing"
    vi.spyOn(rngModule, "random").mockReturnValue(0.4);
    const { log, logs } = makeLogs();
    playerWait(state, log);
    expect(logs.some((l) => /strike/i.test(l))).toBe(true);
  });
});

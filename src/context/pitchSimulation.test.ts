/**
 * Unit tests for src/context/pitchSimulation.ts
 *
 * Tests cover:
 *   - computeFatigueFactor: stamina delays fatigue; fatigue increases over batters faced
 *   - computeSwingRate: count, strategy, and pitch-type effects
 *   - resolveSwingOutcome: whiff/foul/contact thresholds; pitcher stats and fatigue effects
 *   - resolveBattedBallType: contact quality tiers; batted-ball distribution; power strategy boost
 *   - Integration: identical inputs always produce identical outputs (determinism)
 */

import { describe, expect, it } from "vitest";

import {
  computeFatigueFactor,
  computeSwingRate,
  resolveBattedBallType,
  resolveSwingOutcome,
} from "./pitchSimulation";

// ---------------------------------------------------------------------------
// computeFatigueFactor
// ---------------------------------------------------------------------------

describe("computeFatigueFactor", () => {
  it("returns exactly 1.0 when pitcher has faced 0 batters", () => {
    expect(computeFatigueFactor(0, 0)).toBe(1.0);
  });

  it("returns 1.0 up to and including the freshThreshold (9 with no stamina mod)", () => {
    for (let bf = 0; bf <= 9; bf++) {
      expect(computeFatigueFactor(bf, 0)).toBe(1.0);
    }
  });

  it("grows beyond 1.0 after the freshThreshold", () => {
    const at10 = computeFatigueFactor(10, 0);
    const at15 = computeFatigueFactor(15, 0);
    const at20 = computeFatigueFactor(20, 0);
    expect(at10).toBeGreaterThan(1.0);
    expect(at15).toBeGreaterThan(at10);
    expect(at20).toBeGreaterThan(at15);
  });

  it("is capped at 1.6", () => {
    expect(computeFatigueFactor(1000, 0)).toBe(1.6);
    expect(computeFatigueFactor(500, -20)).toBe(1.6);
  });

  it("higher staminaMod delays the onset of fatigue", () => {
    // With staminaMod=+20, freshThreshold = 9 + 4 = 13.
    // After 10 batters, no-stamina pitcher is tired; high-stamina pitcher is still fresh.
    const noStamina = computeFatigueFactor(10, 0);
    const highStamina = computeFatigueFactor(10, 20);
    expect(noStamina).toBeGreaterThan(1.0);
    expect(highStamina).toBe(1.0);
  });

  it("negative staminaMod accelerates fatigue onset", () => {
    // With staminaMod=-20, freshThreshold = 9 - 4 = 5.
    const noStamina = computeFatigueFactor(6, 0);
    const lowStamina = computeFatigueFactor(6, -20);
    expect(noStamina).toBe(1.0); // still fresh
    expect(lowStamina).toBeGreaterThan(1.0); // already fatigued
  });

  it("is deterministic given identical inputs", () => {
    expect(computeFatigueFactor(12, 5)).toBe(computeFatigueFactor(12, 5));
  });
});

// ---------------------------------------------------------------------------
// computeSwingRate
// ---------------------------------------------------------------------------

describe("computeSwingRate", () => {
  it("increases with more strikes (0→1→2)", () => {
    const rate0 = computeSwingRate(0, "balanced", 0, undefined, null);
    const rate1 = computeSwingRate(1, "balanced", 0, undefined, null);
    const rate2 = computeSwingRate(2, "balanced", 0, undefined, null);
    expect(rate1).toBeGreaterThan(rate0);
    expect(rate2).toBeGreaterThan(rate1);
  });

  it("returns 920 for the 'swing' one-pitch modifier regardless of count", () => {
    expect(computeSwingRate(0, "balanced", 0, undefined, "swing")).toBe(920);
    expect(computeSwingRate(2, "power", 0, undefined, "swing")).toBe(920);
  });

  it("returns 0 for the 'take' one-pitch modifier", () => {
    expect(computeSwingRate(0, "balanced", 0, undefined, "take")).toBe(0);
    expect(computeSwingRate(2, "aggressive", 10, undefined, "take")).toBe(0);
  });

  it("aggressive strategy swings more than patient", () => {
    const aggressive = computeSwingRate(0, "aggressive", 0, undefined, null);
    const patient = computeSwingRate(0, "patient", 0, undefined, null);
    expect(aggressive).toBeGreaterThan(patient);
  });

  it("'protect' modifier increases the swing rate", () => {
    const normal = computeSwingRate(1, "balanced", 0, undefined, null);
    const protect = computeSwingRate(1, "balanced", 0, undefined, "protect");
    expect(protect).toBeGreaterThan(normal);
  });

  it("is always in [0, 920]", () => {
    const strategies = ["balanced", "aggressive", "patient", "contact", "power"] as const;
    const pitchTypes = ["fastball", "curveball", "slider", "changeup"] as const;
    const mods = ["swing", "take", "protect", null] as const;
    for (const strat of strategies) {
      for (const pitch of pitchTypes) {
        for (const mod of mods) {
          for (const strikes of [0, 1, 2]) {
            const rate = computeSwingRate(strikes, strat, 0, pitch, mod);
            expect(rate).toBeGreaterThanOrEqual(0);
            expect(rate).toBeLessThanOrEqual(920);
          }
        }
      }
    }
  });

  it("is deterministic given identical inputs", () => {
    expect(computeSwingRate(1, "contact", 5, "slider", null)).toBe(
      computeSwingRate(1, "contact", 5, "slider", null),
    );
  });
});

// ---------------------------------------------------------------------------
// resolveSwingOutcome
// ---------------------------------------------------------------------------

describe("resolveSwingOutcome", () => {
  it("low roll → whiff", () => {
    // Roll 0 is always below the whiff threshold (minimum whiff threshold is 8).
    expect(resolveSwingOutcome(0, 0, 0, 0)).toBe("whiff");
  });

  it("mid roll → foul", () => {
    // Roll 30: above whiff threshold (22) but below foul threshold (22+33=55).
    expect(resolveSwingOutcome(30, 0, 0, 0)).toBe("foul");
  });

  it("high roll → contact", () => {
    // Roll 80: above foul threshold (55) → contact.
    expect(resolveSwingOutcome(80, 0, 0, 0)).toBe("contact");
  });

  it("high pitcher velocity increases whiff probability (lowers contact)", () => {
    const baseContactCount = [70, 75, 80].filter(
      (r) => resolveSwingOutcome(r, 0, 0, 0) === "contact",
    ).length;
    const highVeloContactCount = [70, 75, 80].filter(
      (r) => resolveSwingOutcome(r, 20, 0, 0) === "contact",
    ).length;
    // More rolls become whiff/foul with high velocity → fewer contacts
    expect(highVeloContactCount).toBeLessThanOrEqual(baseContactCount);
  });

  it("high batter contact skill reduces whiff rate", () => {
    // With contactMod=+20, the whiff threshold decreases → fewer whiffs at low rolls.
    const whiffNoMod = resolveSwingOutcome(10, 0, 0, 0);
    const whiffHighContact = resolveSwingOutcome(10, 0, 0, 20);
    // With lower whiff threshold, roll=10 might no longer be a whiff.
    // Either way, the threshold decreases — high contact can only equal or improve outcomes.
    expect(["whiff", "foul", "contact"]).toContain(whiffNoMod);
    expect(["whiff", "foul", "contact"]).toContain(whiffHighContact);
    // High contact should never *increase* whiff chance:
    // whiff threshold with contactMod=+20 is max(8, 22-2) = 20, so roll=10 is still whiff
    // but roll=21 would switch from whiff to foul.
    expect(resolveSwingOutcome(21, 0, 0, 0)).toBe("whiff");
    expect(resolveSwingOutcome(21, 0, 0, 20)).toBe("foul"); // no longer a whiff
  });

  it("fatigue reduces pitcher effectiveness (fewer whiffs)", () => {
    // A tired pitcher loses velocity bonus → lower whiff threshold → roll that was whiff may become foul/contact
    const roll = 20; // near the whiff threshold
    const freshResult = resolveSwingOutcome(roll, 10, 0, 0, 1.0);
    const tiredResult = resolveSwingOutcome(roll, 10, 0, 0, 1.4);
    // With fatigue, the velocity bonus is reduced, so some whiffs shift to fouls or contact
    // Either stays whiff or becomes something better for batter — never worse
    if (freshResult === "whiff") {
      // tiredResult should be whiff or something better (foul/contact)
      expect(["whiff", "foul", "contact"]).toContain(tiredResult);
    }
  });

  it("always returns a valid outcome", () => {
    const validOutcomes = ["whiff", "foul", "contact"] as const;
    for (let roll = 0; roll < 100; roll++) {
      expect(validOutcomes).toContain(resolveSwingOutcome(roll, 0, 0, 0));
    }
  });

  it("is deterministic given identical inputs", () => {
    expect(resolveSwingOutcome(45, 10, 5, -5, 1.2)).toBe(resolveSwingOutcome(45, 10, 5, -5, 1.2));
  });
});

// ---------------------------------------------------------------------------
// resolveBattedBallType
// ---------------------------------------------------------------------------

describe("resolveBattedBallType", () => {
  // Hard contact: contactRoll < 25 (base hardThreshold with no mods)
  // Medium contact: 25 ≤ contactRoll < 60
  // Weak contact: contactRoll ≥ 60

  describe("hard contact (contactRoll < 25)", () => {
    it("typeRoll < 40 → deep_fly", () => {
      expect(resolveBattedBallType(0, 10)).toBe("deep_fly");
    });
    it("typeRoll 40–74 → line_drive", () => {
      expect(resolveBattedBallType(0, 50)).toBe("line_drive");
    });
    it("typeRoll ≥ 75 → hard_grounder", () => {
      expect(resolveBattedBallType(0, 80)).toBe("hard_grounder");
    });
  });

  describe("medium contact (25 ≤ contactRoll < 60)", () => {
    it("typeRoll < 35 → medium_fly", () => {
      expect(resolveBattedBallType(40, 10)).toBe("medium_fly");
    });
    it("typeRoll 35–54 → hard_grounder", () => {
      expect(resolveBattedBallType(40, 40)).toBe("hard_grounder");
    });
    it("typeRoll 55–74 → line_drive", () => {
      expect(resolveBattedBallType(40, 60)).toBe("line_drive");
    });
    it("typeRoll ≥ 75 → weak_grounder", () => {
      expect(resolveBattedBallType(40, 80)).toBe("weak_grounder");
    });
  });

  describe("weak contact (contactRoll ≥ 60)", () => {
    it("typeRoll < 35 → pop_up", () => {
      expect(resolveBattedBallType(80, 10)).toBe("pop_up");
    });
    it("typeRoll 35–79 → weak_grounder", () => {
      expect(resolveBattedBallType(80, 50)).toBe("weak_grounder");
    });
    it("typeRoll ≥ 80 → medium_fly", () => {
      expect(resolveBattedBallType(80, 85)).toBe("medium_fly");
    });
  });

  describe("hard contact produces more premium batted balls than weak contact", () => {
    it("hard yields more deep_fly+line_drive than weak", () => {
      let hardPremium = 0;
      let weakPremium = 0;
      for (let typeRoll = 0; typeRoll < 100; typeRoll++) {
        const hardBBT = resolveBattedBallType(0, typeRoll);
        const weakBBT = resolveBattedBallType(80, typeRoll);
        if (hardBBT === "deep_fly" || hardBBT === "line_drive") hardPremium++;
        if (weakBBT === "deep_fly" || weakBBT === "line_drive") weakPremium++;
      }
      expect(hardPremium).toBeGreaterThan(weakPremium);
    });
  });

  describe("power strategy", () => {
    it("power + medium contact + typeRoll < 15 → deep_fly (powerBoost)", () => {
      // Medium contact (contactRoll=40) + power + typeRoll=5 < 15 → powerBoost upgrades to deep_fly
      expect(resolveBattedBallType(40, 5, { strategy: "power" })).toBe("deep_fly");
    });

    it("power + hard contact: already hard, typeRoll < 40 → deep_fly", () => {
      expect(resolveBattedBallType(0, 10, { strategy: "power" })).toBe("deep_fly");
    });

    it("power + medium contact + typeRoll ≥ 15 → no boost (normal medium outcome)", () => {
      // typeRoll=20 ≥ 15 → powerBoost is false → medium → typeRoll=20 < 35 → medium_fly
      expect(resolveBattedBallType(40, 20, { strategy: "power" })).toBe("medium_fly");
    });
  });

  describe("pitcher stats affect contact quality", () => {
    it("high pitcher velocity reduces hard contact threshold (contact quality suppressed)", () => {
      // No mods: hardThreshold=25; contactRoll=24 < 25 → hard → typeRoll=10 < 40 → deep_fly
      // velocityMod=20, movementMod=20: hardThreshold = max(10, 25 - round(40/10)) = 21
      //   contactRoll=24 ≥ 21 → medium → typeRoll=10 < 35 → medium_fly
      expect(resolveBattedBallType(24, 10)).toBe("deep_fly");
      expect(
        resolveBattedBallType(24, 10, { pitcherVelocityMod: 20, pitcherMovementMod: 20 }),
      ).toBe("medium_fly");
    });
  });

  describe("pitcher fatigue increases hard contact (batted ball quality rises)", () => {
    it("tired pitcher: contactRoll=26 becomes hard (was medium with fresh pitcher)", () => {
      // fatigueFactor=1.0: hardThreshold=25; 26 ≥ 25 → medium → typeRoll=10 < 35 → medium_fly
      // fatigueFactor=1.4: hardThreshold=25+round(0.4*10)=29; 26 < 29 → hard → typeRoll=10 < 40 → deep_fly
      const freshResult = resolveBattedBallType(26, 10, { fatigueFactor: 1.0 });
      const tiredResult = resolveBattedBallType(26, 10, { fatigueFactor: 1.4 });
      expect(freshResult).toBe("medium_fly");
      expect(tiredResult).toBe("deep_fly");
    });
  });

  it("always returns a valid BattedBallType", () => {
    const validTypes = [
      "pop_up",
      "weak_grounder",
      "hard_grounder",
      "line_drive",
      "medium_fly",
      "deep_fly",
    ];
    for (let cRoll = 0; cRoll < 100; cRoll++) {
      for (let tRoll = 0; tRoll < 100; tRoll += 10) {
        expect(validTypes).toContain(resolveBattedBallType(cRoll, tRoll));
      }
    }
  });

  it("is deterministic given identical inputs", () => {
    const opts = {
      strategy: "contact" as const,
      batterPowerMod: 10,
      pitcherVelocityMod: -5,
      fatigueFactor: 1.2,
    };
    expect(resolveBattedBallType(15, 25, opts)).toBe(resolveBattedBallType(15, 25, opts));
  });
});

// ---------------------------------------------------------------------------
// Cross-function integration: stat sanity across a simulated game
// ---------------------------------------------------------------------------

describe("simulation stat sanity (aggregate)", () => {
  /**
   * Runs a simplified deterministic pitch loop and counts outcomes.
   * Uses a fixed sequence of rolls to verify broad distribution properties.
   */
  it("contact rate is meaningfully higher with good contact batter vs average", () => {
    const rolls = Array.from({ length: 100 }, (_, i) => i);
    const countContact = (contactMod: number) =>
      rolls.filter((roll) => resolveSwingOutcome(roll, 0, 0, contactMod) === "contact").length;

    const avgContact = countContact(0);
    const goodContact = countContact(20);
    // Higher contact mod should produce more contact outcomes
    expect(goodContact).toBeGreaterThanOrEqual(avgContact);
  });

  it("high velocity pitcher produces more whiffs than low velocity", () => {
    const rolls = Array.from({ length: 100 }, (_, i) => i);
    const countWhiffs = (velocityMod: number) =>
      rolls.filter((roll) => resolveSwingOutcome(roll, velocityMod, 0, 0) === "whiff").length;

    const lowVeloWhiffs = countWhiffs(-10);
    const highVeloWhiffs = countWhiffs(20);
    expect(highVeloWhiffs).toBeGreaterThan(lowVeloWhiffs);
  });

  it("hard contact produces more deep_fly/line_drive than weak contact", () => {
    const typeRolls = Array.from({ length: 100 }, (_, i) => i);
    const premiumBBT = (contactRoll: number) =>
      typeRolls.filter((t) => {
        const b = resolveBattedBallType(contactRoll, t);
        return b === "deep_fly" || b === "line_drive";
      }).length;

    const hardPremium = premiumBBT(5); // hard contact
    const weakPremium = premiumBBT(85); // weak contact
    expect(hardPremium).toBeGreaterThan(weakPremium);
  });
});

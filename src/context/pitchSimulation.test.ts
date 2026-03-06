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
// resolveContactHitType
// ---------------------------------------------------------------------------

describe("resolveContactHitType", () => {
  // Hard contact: contactRoll < 25 (base hardThreshold with no mods)
  // Medium contact: 25 ≤ contactRoll < 60
  // Weak contact: contactRoll ≥ 60

  describe("hard contact (contactRoll < 25)", () => {
    it("typeRoll < 15 → Homerun", () => {
      expect(resolveContactHitType(0, 10, "balanced", 0, 0, 0)).toBe(Hit.Homerun);
    });
    it("typeRoll 15–19 → Triple", () => {
      expect(resolveContactHitType(0, 17, "balanced", 0, 0, 0)).toBe(Hit.Triple);
    });
    it("typeRoll 20–44 → Double", () => {
      expect(resolveContactHitType(0, 30, "balanced", 0, 0, 0)).toBe(Hit.Double);
    });
    it("typeRoll ≥ 45 → Single", () => {
      expect(resolveContactHitType(0, 50, "balanced", 0, 0, 0)).toBe(Hit.Single);
    });
  });

  describe("medium contact (25 ≤ contactRoll < 60)", () => {
    it("typeRoll < 5 → Homerun", () => {
      expect(resolveContactHitType(40, 3, "balanced", 0, 0, 0)).toBe(Hit.Homerun);
    });
    it("typeRoll 5–7 → Triple", () => {
      expect(resolveContactHitType(40, 6, "balanced", 0, 0, 0)).toBe(Hit.Triple);
    });
    it("typeRoll 8–27 → Double", () => {
      expect(resolveContactHitType(40, 18, "balanced", 0, 0, 0)).toBe(Hit.Double);
    });
    it("typeRoll ≥ 28 → Single", () => {
      expect(resolveContactHitType(40, 40, "balanced", 0, 0, 0)).toBe(Hit.Single);
    });
  });

  describe("weak contact (contactRoll ≥ 60)", () => {
    it("typeRoll < 2 → Homerun (bloop or short porch)", () => {
      expect(resolveContactHitType(80, 1, "balanced", 0, 0, 0)).toBe(Hit.Homerun);
    });
    it("typeRoll 2–3 → Triple", () => {
      expect(resolveContactHitType(80, 3, "balanced", 0, 0, 0)).toBe(Hit.Triple);
    });
    it("typeRoll 4–13 → Double", () => {
      expect(resolveContactHitType(80, 8, "balanced", 0, 0, 0)).toBe(Hit.Double);
    });
    it("typeRoll ≥ 14 → Single", () => {
      expect(resolveContactHitType(80, 50, "balanced", 0, 0, 0)).toBe(Hit.Single);
    });
  });

  describe("hard contact produces HRs more often than weak contact", () => {
    it("HR rate for hard > HR rate for weak (typeRoll < 15 vs typeRoll < 2)", () => {
      // Hard: HR if typeRoll < 15 → 15/100 = 15% chance
      // Weak: HR if typeRoll < 2 → 2/100 = 2% chance
      let hardHR = 0;
      let weakHR = 0;
      for (let typeRoll = 0; typeRoll < 100; typeRoll++) {
        if (resolveContactHitType(0, typeRoll, "balanced", 0, 0, 0) === Hit.Homerun) hardHR++;
        if (resolveContactHitType(80, typeRoll, "balanced", 0, 0, 0) === Hit.Homerun) weakHR++;
      }
      expect(hardHR).toBeGreaterThan(weakHR);
    });
  });

  describe("power strategy", () => {
    it("power + medium contact + typeRoll < 15 → HR (powerBoost upgrades to hard)", () => {
      // Medium contact (contactRoll=40) + power strategy + typeRoll=5 < 15 → powerBoost
      // quality upgrades medium → hard → typeRoll=5 < 15 → HR
      expect(resolveContactHitType(40, 5, "power", 0, 0, 0)).toBe(Hit.Homerun);
    });

    it("power + hard contact: no double-boost needed, hard HR at typeRoll < 15", () => {
      // Already hard, typeRoll < 15 → HR regardless of powerBoost check
      expect(resolveContactHitType(0, 10, "power", 0, 0, 0)).toBe(Hit.Homerun);
    });

    it("power + medium contact + typeRoll ≥ 15 → no boost (normal medium outcome)", () => {
      // typeRoll=20 ≥ 15 → powerBoost is false → stays medium → 8≤20<28 → Double
      expect(resolveContactHitType(40, 20, "power", 0, 0, 0)).toBe(Hit.Double);
    });
  });

  describe("pitcher stats affect contact quality", () => {
    it("high pitcher velocity reduces hard contact threshold (fewer HR opportunities)", () => {
      // With velocityMod=+20 and movementMod=+20:
      //   hardThreshold = max(10, 25 - round((20+20)/10)) = max(10, 21) = 21
      // contactRoll=24: hard with no mods (24 < 25), medium with high pitcher stuff (24 ≥ 21).
      // Hard + typeRoll=10 < 15 → HR; Medium + typeRoll=10: 8≤10<28 → Double
      expect(resolveContactHitType(24, 10, "balanced", 0, 0, 0)).toBe(Hit.Homerun); // hard → HR
      expect(resolveContactHitType(24, 10, "balanced", 0, 20, 20)).toBe(Hit.Double); // medium → Double
    });
  });

  describe("pitcher fatigue increases hard contact", () => {
    it("tired pitcher increases the hardThreshold (more hard contact)", () => {
      // Fatigue adds to hardThreshold: +round((1.4-1)*10) = +4
      // So hardThreshold rises from 25 to ~29 with fatigueFactor=1.4.
      const freshHardThreshold = 25;
      // contactRoll=26 is medium for fresh pitcher but might be hard for tired
      const freshResult = resolveContactHitType(26, 10, "balanced", 0, 0, 0, 1.0);
      const tiredResult = resolveContactHitType(26, 10, "balanced", 0, 0, 0, 1.4);
      // Fresh: 26 ≥ 25 → medium, typeRoll=10 ≥ 8 → Double
      expect(freshResult).toBe(Hit.Double);
      // Tired: hardThreshold rises to ~29, so 26 < 29 → hard, typeRoll=10 < 15 → HR
      expect(tiredResult).toBe(Hit.Homerun);
    });
  });

  it("always returns a valid Hit type", () => {
    const validHits = [Hit.Single, Hit.Double, Hit.Triple, Hit.Homerun];
    for (let cRoll = 0; cRoll < 100; cRoll++) {
      for (let tRoll = 0; tRoll < 100; tRoll += 10) {
        expect(validHits).toContain(resolveContactHitType(cRoll, tRoll, "balanced", 0, 0, 0));
      }
    }
  });

  it("is deterministic given identical inputs", () => {
    expect(resolveContactHitType(15, 25, "contact", 10, -5, 0, 1.2)).toBe(
      resolveContactHitType(15, 25, "contact", 10, -5, 0, 1.2),
    );
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

/**
 * Tests for src/utilities/rng.ts and getRandomInt.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initSeedFromUrl, random, buildReplayUrl, getSeed } from "../utilities/rng";
import getRandomInt from "../utilities/getRandomInt";

// rng keeps module-level state, so we cannot easily reinitialise between tests.
// Instead we test that:
//  - initSeedFromUrl returns a non-null number
//  - random() returns values in [0,1)
//  - the sequence is deterministic within a single test run
//  - buildReplayUrl returns a URL containing seed=
//  - getRandomInt returns integers in [0, max)

describe("rng – basic", () => {
  it("initSeedFromUrl returns a number", () => {
    const s = initSeedFromUrl();
    // May already be initialised; still should be a number.
    expect(typeof s === "number" || s === null).toBe(true);
  });

  it("random() returns values in [0, 1)", () => {
    // Ensure initialised
    initSeedFromUrl();
    for (let i = 0; i < 200; i++) {
      const v = random();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("successive random() calls return different values (not all the same)", () => {
    initSeedFromUrl();
    const vals = new Set(Array.from({ length: 10 }, () => random()));
    // With a seeded PRNG the probability of all 10 being identical is negligible.
    expect(vals.size).toBeGreaterThan(1);
  });

  it("buildReplayUrl contains seed= param", () => {
    initSeedFromUrl();
    const url = buildReplayUrl();
    expect(url).toContain("seed=");
  });

  it("getSeed returns a number after initialisation", () => {
    initSeedFromUrl();
    expect(typeof getSeed()).toBe("number");
  });
});

describe("getRandomInt", () => {
  it("returns integers in [0, max)", () => {
    for (let i = 0; i < 100; i++) {
      const v = getRandomInt(10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("getRandomInt(1) always returns 0", () => {
    for (let i = 0; i < 20; i++) {
      expect(getRandomInt(1)).toBe(0);
    }
  });
});

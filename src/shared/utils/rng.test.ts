/**
 * Tests for src/utilities/rng.ts and getRandomInt.ts
 */

import getRandomInt from "@feat/gameplay/utils/getRandomInt";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSeed, initSeed, random, reinitSeed } from "./rng";

// rng keeps module-level state, so we cannot easily reinitialize between tests.
// Instead we test that:
//  - initSeed returns a non-null number
//  - random() returns values in [0,1)
//  - the sequence is deterministic within a single test run
//  - getRandomInt returns integers in [0, max)

describe("rng – basic", () => {
  it("initSeed returns a number", () => {
    const s = initSeed();
    // May already be initialized; still should be a number.
    expect(typeof s === "number" || s === null).toBe(true);
  });

  it("random() returns values in [0, 1)", () => {
    // Ensure initialized
    initSeed();
    for (let i = 0; i < 200; i++) {
      const v = random();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("successive random() calls return different values (not all the same)", () => {
    initSeed();
    const vals = new Set(Array.from({ length: 10 }, () => random()));
    // With a seeded PRNG the probability of all 10 being identical is negligible.
    expect(vals.size).toBeGreaterThan(1);
  });

  it("getSeed returns a number after initialization", () => {
    initSeed();
    expect(typeof getSeed()).toBe("number");
  });

  it("calling initSeed again returns the same seed (already initialized)", () => {
    const first = getSeed();
    const second = initSeed();
    // Once initialized, repeated calls return the same seed without re-randomizing.
    expect(second).toBe(first);
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

  it("getRandomInt(1000) returns values across a wide range", () => {
    const vals = new Set(Array.from({ length: 200 }, () => getRandomInt(1000)));
    expect(vals.size).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// Isolated module instances (reset module registry for each test)
// ---------------------------------------------------------------------------
describe("rng.ts — isolated module instances", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("getSeed() before initSeed still returns a number (auto-initializes)", async () => {
    const rng = await import("./rng");
    expect(typeof rng.getSeed()).toBe("number");
  });

  it("random() before initSeed auto-initializes", async () => {
    const rng = await import("./rng");
    const result = rng.random();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(1);
  });

  it("initSeed is idempotent across multiple calls", async () => {
    const rng = await import("./rng");
    const first = rng.initSeed();
    const second = rng.initSeed();
    expect(first).toBe(second);
  });
});

// ---------------------------------------------------------------------------
// getRngState / restoreRng — PRNG state save and restore
// ---------------------------------------------------------------------------
describe("rng.ts — getRngState and restoreRng", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("getRngState() returns null before any random() call", async () => {
    const rng = await import("./rng");
    // fresh module: rngInternalA is null until initSeed is called
    expect(rng.getRngState()).toBeNull();
  });

  it("getRngState() returns a number after initSeed + random()", async () => {
    const rng = await import("./rng");
    rng.initSeed();
    rng.random(); // first call sets rngInternalA
    expect(typeof rng.getRngState()).toBe("number");
  });

  it("restoreRng makes subsequent random() calls match the original sequence", async () => {
    const rng = await import("./rng");
    rng.initSeed();

    // Advance N calls and capture the sequence from call N+1 onwards.
    for (let i = 0; i < 10; i++) rng.random();
    const stateAfter10 = rng.getRngState()!;
    const originalNext5 = Array.from({ length: 5 }, () => rng.random());

    // Now restore to the state after 10 calls and replay.
    rng.restoreRng(stateAfter10);
    const restoredNext5 = Array.from({ length: 5 }, () => rng.random());

    expect(restoredNext5).toEqual(originalNext5);
  });

  it("restoreRng after a save/load round-trip produces identical pitch values", async () => {
    const rng = await import("./rng");
    rng.initSeed();

    // Simulate playing some pitches.
    for (let i = 0; i < 25; i++) rng.random();

    // Simulate a save: capture state.
    const savedState = rng.getRngState()!;

    // Continue the original game a few more pitches.
    const originalValues = Array.from({ length: 8 }, () => rng.random());

    // "Load" by restoring state, then play the same pitches.
    rng.restoreRng(savedState);
    const restoredValues = Array.from({ length: 8 }, () => rng.random());

    expect(restoredValues).toEqual(originalValues);
  });

  it("getRngState changes after each random() call", async () => {
    const rng = await import("./rng");
    rng.initSeed();
    rng.random();
    const state1 = rng.getRngState();
    rng.random();
    const state2 = rng.getRngState();
    expect(state1).not.toBe(state2);
  });
});

// ---------------------------------------------------------------------------
// reinitSeed — runtime re-seeding (used by New Game form seed input)
// ---------------------------------------------------------------------------

describe("rng.ts — reinitSeed", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reinitSeed with a base-36 string sets the seed and returns it", async () => {
    const rng = await import("./rng");
    const result = rng.reinitSeed("deadbeef");
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThan(0);
    expect(rng.getSeed()).toBe(result);
  });

  it("reinitSeed with same string produces same seed each time", async () => {
    const rng = await import("./rng");
    const a = rng.reinitSeed("abc123");
    const b = rng.reinitSeed("abc123");
    expect(a).toBe(b);
  });

  it("reinitSeed with different strings produces different seeds", async () => {
    const rng = await import("./rng");
    const a = rng.reinitSeed("seed1");
    const b = rng.reinitSeed("seed2");
    expect(a).not.toBe(b);
  });

  it("reinitSeed with blank string generates a random seed", async () => {
    const rng = await import("./rng");
    const result = rng.reinitSeed("   ");
    expect(typeof result).toBe("number");
    expect(rng.getSeed()).toBe(result);
  });

  it("reinitSeed does NOT write to the URL", async () => {
    const spy = vi.spyOn(window.history, "replaceState");
    const rng = await import("./rng");
    rng.reinitSeed("testurl");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("random() after reinitSeed produces deterministic sequence", async () => {
    const rng = await import("./rng");
    rng.reinitSeed("deterministic");
    const seq1 = Array.from({ length: 5 }, () => rng.random());
    rng.reinitSeed("deterministic");
    const seq2 = Array.from({ length: 5 }, () => rng.random());
    expect(seq1).toEqual(seq2);
  });
});

// ---------------------------------------------------------------------------
// restoreSeed — seed-only restore (used by game-load / auto-resume paths)
// ---------------------------------------------------------------------------

describe("rng.ts — restoreSeed", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("restoreSeed updates getSeed() to the parsed seed without changing PRNG state", async () => {
    const rng = await import("./rng");
    // Initialize PRNG so we have a known state.
    rng.reinitSeed("start");
    const rngStateBefore = rng.getRngState();
    // Restore seed from a save's base-36 string.
    rng.restoreSeed("deadbeef");
    // getSeed() must now reflect the restored seed.
    const expectedSeed = parseInt("deadbeef", 36) >>> 0;
    expect(rng.getSeed()).toBe(expectedSeed);
    // PRNG internal state must be unchanged — restoreSeed must NOT call reinitSeed.
    expect(rng.getRngState()).toBe(rngStateBefore);
  });

  it("restoreSeed with a digit-only string parses as base-36", async () => {
    const rng = await import("./rng");
    rng.reinitSeed("initial");
    rng.restoreSeed("12345");
    // digit-only strings are always parsed as base-36 (same as all save seeds)
    expect(rng.getSeed()).toBe(parseInt("12345", 36) >>> 0);
  });

  it("restoreSeed with an empty string is a no-op (seed unchanged)", async () => {
    const rng = await import("./rng");
    const before = rng.reinitSeed("abc");
    rng.restoreSeed("");
    expect(rng.getSeed()).toBe(before);
  });

  it("restoreSeed followed by restoreRng gives correct getSeed() and PRNG position", async () => {
    const rng = await import("./rng");
    rng.reinitSeed("game1");
    const savedSeed = rng.getSeed()!.toString(36);
    // Capture state before producing sequence.
    const savedState = rng.getRngState()!;
    const seq1 = Array.from({ length: 5 }, () => rng.random());

    // Simulate a page reload — new random startup seed.
    rng.reinitSeed("unrelated");

    // Restore from save: seed first, then exact PRNG position.
    rng.restoreSeed(savedSeed);
    rng.restoreRng(savedState);

    expect(rng.getSeed()).toBe(parseInt(savedSeed, 36) >>> 0);
    const seq2 = Array.from({ length: 5 }, () => rng.random());
    expect(seq2).toEqual(seq1);
  });
});

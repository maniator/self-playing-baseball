import { describe, expect, it } from "vitest";

import { splitBudgetNatural } from "./splitBudgetNatural";

/** Returns an rng that always produces the same constant value. */
const makeConstRng = (val: number) => () => val;

/** Returns an rng that cycles through `values` in order. */
const makeSeqRng = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("splitBudgetNatural", () => {
  describe("invalid input guards — return [0, 0, 0]", () => {
    it("budget = 0", () => {
      expect(splitBudgetNatural(makeConstRng(0.5), { budget: 0, maxEach: 50 })).toEqual([0, 0, 0]);
    });

    it("budget < 0", () => {
      expect(splitBudgetNatural(makeConstRng(0.5), { budget: -1, maxEach: 50 })).toEqual([0, 0, 0]);
    });

    it("budget = NaN", () => {
      expect(splitBudgetNatural(makeConstRng(0.5), { budget: NaN, maxEach: 50 })).toEqual([
        0, 0, 0,
      ]);
    });

    it("budget = Infinity (clamped to 3 * maxEach)", () => {
      // Positive Infinity is allowed — effectiveBudget = min(Infinity, 3*50) = 150.
      // Uniform rng gives equal weights → [50, 50, 50].
      expect(splitBudgetNatural(makeConstRng(0.5), { budget: Infinity, maxEach: 50 })).toEqual([
        50, 50, 50,
      ]);
    });

    it("budget = -Infinity", () => {
      expect(splitBudgetNatural(makeConstRng(0.5), { budget: -Infinity, maxEach: 50 })).toEqual([
        0, 0, 0,
      ]);
    });

    it("maxEach = NaN", () => {
      expect(splitBudgetNatural(makeConstRng(0.5), { budget: 90, maxEach: NaN })).toEqual([
        0, 0, 0,
      ]);
    });

    it("maxEach = Infinity", () => {
      expect(splitBudgetNatural(makeConstRng(0.5), { budget: 90, maxEach: Infinity })).toEqual([
        0, 0, 0,
      ]);
    });

    it("maxEach = -Infinity", () => {
      expect(splitBudgetNatural(makeConstRng(0.5), { budget: 90, maxEach: -Infinity })).toEqual([
        0, 0, 0,
      ]);
    });

    it("maxEach = 0 (no capacity)", () => {
      expect(splitBudgetNatural(makeConstRng(0.5), { budget: 30, maxEach: 0 })).toEqual([0, 0, 0]);
    });
  });

  describe("sum invariant", () => {
    it("portions sum to budget when budget <= 3 * maxEach", () => {
      const [a, b, c] = splitBudgetNatural(makeConstRng(0.5), { budget: 90, maxEach: 80 });
      expect(a + b + c).toBe(90);
    });

    it("portions sum to 3 * maxEach when budget > 3 * maxEach (clamped)", () => {
      // budget=300 > 3*80=240 → effectiveBudget=240
      const [a, b, c] = splitBudgetNatural(makeConstRng(0.5), { budget: 300, maxEach: 80 });
      expect(a + b + c).toBe(240);
    });

    it("portions sum to floor(budget) for a fractional budget", () => {
      // floor(90.9) = 90
      const [a, b, c] = splitBudgetNatural(makeConstRng(0.5), { budget: 90.9, maxEach: 80 });
      expect(a + b + c).toBe(90);
    });

    it("portions sum to min(floor(budget), 3 * floor(maxEach)) for fractional maxEach", () => {
      // floor(30.7) = 30; 3*30=90 = floor(90)
      const [a, b, c] = splitBudgetNatural(makeConstRng(0.5), { budget: 90, maxEach: 30.7 });
      expect(a + b + c).toBe(90);
    });

    it("sum invariant holds across varied rng sequences", () => {
      const sequences = [
        [0.1, 0.9, 0.2, 0.8, 0.3, 0.7, 0.5],
        [0.9, 0.1, 0.8, 0.2, 0.7, 0.3, 0.4],
        [0.01, 0.99, 0.5, 0.01, 0.99, 0.5, 0.5],
      ];
      for (const seq of sequences) {
        const [a, b, c] = splitBudgetNatural(makeSeqRng(seq), { budget: 90, maxEach: 80 });
        expect(a + b + c).toBe(90);
      }
    });

    it("sum equals 3 * maxEach with heavy budget clamping (budget >> 3 * maxEach)", () => {
      // budget=1000, maxEach=30: effectiveBudget = 3*30=90
      const [a, b, c] = splitBudgetNatural(makeConstRng(0.5), { budget: 1000, maxEach: 30 });
      expect(a + b + c).toBe(90);
    });

    it("budget = 3 * maxEach splits all three portions exactly to maxEach with uniform rng", () => {
      // Uniform weights → equal split; budget exactly fits capacity.
      const maxEach = 30;
      const [a, b, c] = splitBudgetNatural(makeConstRng(0.5), { budget: 90, maxEach });
      expect(a).toBe(maxEach);
      expect(b).toBe(maxEach);
      expect(c).toBe(maxEach);
    });

    it("portions stay within maxEach and still sum to budget when budget = 3 * maxEach and rng is skewed", () => {
      // Skewed weights would push the first portion beyond maxEach without clamping.
      // The redistribution loop must correctly spill the excess into the other two portions.
      const skewedRng = makeSeqRng([0.99, 0.99, 0.01, 0.01, 0.01, 0.01, 0.5]);
      const maxEach = 30;
      const [a, b, c] = splitBudgetNatural(skewedRng, { budget: 90, maxEach });
      expect(a).toBeLessThanOrEqual(maxEach);
      expect(b).toBeLessThanOrEqual(maxEach);
      expect(c).toBeLessThanOrEqual(maxEach);
      expect(a + b + c).toBe(90);
    });
  });

  describe("per-portion bounds", () => {
    it("each portion is in [0, maxEach] with uniform rng", () => {
      const maxEach = 50;
      const [a, b, c] = splitBudgetNatural(makeConstRng(0.5), { budget: 90, maxEach });
      for (const p of [a, b, c]) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(maxEach);
      }
    });

    it("no portion exceeds maxEach even when rng is heavily skewed toward one weight", () => {
      // wa≈2 >> wb≈0 and wc≈0 — the first portion would naively exceed maxEach
      const skewedRng = makeSeqRng([0.99, 0.99, 0.01, 0.01, 0.01, 0.01, 0.5]);
      const maxEach = 50;
      const [a, b, c] = splitBudgetNatural(skewedRng, { budget: 90, maxEach });
      expect(a).toBeLessThanOrEqual(maxEach);
      expect(b).toBeLessThanOrEqual(maxEach);
      expect(c).toBeLessThanOrEqual(maxEach);
      expect(a + b + c).toBe(90);
    });
  });

  describe("integer outputs", () => {
    it("all portions are integers for integer inputs", () => {
      const [a, b, c] = splitBudgetNatural(makeConstRng(0.5), { budget: 90, maxEach: 80 });
      for (const p of [a, b, c]) {
        expect(Number.isInteger(p)).toBe(true);
      }
    });

    it("all portions are integers even for fractional budget and maxEach", () => {
      const [a, b, c] = splitBudgetNatural(makeConstRng(0.5), { budget: 90.7, maxEach: 30.4 });
      for (const p of [a, b, c]) {
        expect(Number.isInteger(p)).toBe(true);
      }
    });
  });

  describe("wTotal = 0 fallback (equal-weight split)", () => {
    it("returns portions summing to budget when all 6 rng draws are 0", () => {
      // All weights are 0 → wTotal=0 → function falls back to equal weights (1/3 each)
      const [a, b, c] = splitBudgetNatural(() => 0, { budget: 90, maxEach: 80 });
      expect(a + b + c).toBe(90);
      for (const p of [a, b, c]) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(80);
      }
    });
  });

  describe("determinism", () => {
    it("same rng sequence produces the same result", () => {
      const seed = [0.3, 0.7, 0.2, 0.8, 0.5, 0.1, 0.4];
      const first = splitBudgetNatural(makeSeqRng([...seed]), { budget: 90, maxEach: 80 });
      const second = splitBudgetNatural(makeSeqRng([...seed]), { budget: 90, maxEach: 80 });
      expect(first).toEqual(second);
    });

    it("different rng sequences both produce valid allocations", () => {
      // Validate that distinct rng sequences each produce a correct result; the
      // allocator's correctness is independent of whether the two splits happen
      // to be identical (which depends on weights and clamping).
      const rng1 = makeSeqRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.5]);
      const rng2 = makeSeqRng([0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.5]);
      const options = { budget: 90, maxEach: 80 };

      const result1 = splitBudgetNatural(rng1, options);
      const result2 = splitBudgetNatural(rng2, options);

      for (const portions of [result1, result2]) {
        const [a, b, c] = portions;
        expect(a + b + c).toBe(90);
        for (const p of portions) {
          expect(Number.isInteger(p)).toBe(true);
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThanOrEqual(80);
        }
      }
    });
  });
});

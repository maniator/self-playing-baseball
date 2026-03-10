export interface SplitBudgetNaturalOptions {
  /** Total points to distribute across the three portions. */
  budget: number;
  /** Maximum points any single portion may receive. */
  maxEach: number;
}

/**
 * Splits `budget` extra points into 3 naturally distributed portions using a
 * Dirichlet-inspired scheme: each raw weight (`wa`, `wb`, `wc`) is the sum of
 * 2 independent uniform draws, then the weights are converted to proportions
 * of an integer `effectiveBudget`. This centers the split around
 * effectiveBudget/3 per portion (like rolling 2 dice each) so individual stats
 * rarely dominate while still spanning the full cap range.
 *
 * `budget` and `maxEach` are each floored to non-negative integers:
 * `intBudget = max(0, floor(budget))` and `intMaxEach = max(0, floor(maxEach))`.
 * Any `budget` that floors to 0 or below — including zero, negative values,
 * and fractional values in `(0, 1)` — returns `[0, 0, 0]` immediately, as does
 * `NaN`. Positive `Infinity` is allowed and gets clamped to `3 * intMaxEach`.
 * Non-finite `maxEach` (NaN or ±Infinity) also returns `[0, 0, 0]`.
 *
 * The function then clamps the total distributable budget to
 * `effectiveBudget = min(intBudget, 3 * intMaxEach)`.
 *
 * All three portions are integers, each in the range `[0, intMaxEach]`. Any
 * leftover from flooring or clamping is redistributed using the
 * largest-remainder method (ties broken with `rng`) so the split stays
 * symmetric and the portions always sum to exactly `effectiveBudget` (which is
 * equal to `intBudget` when `budget` is within total capacity).
 */
export const splitBudgetNatural = (
  rng: () => number,
  { budget, maxEach }: SplitBudgetNaturalOptions,
): [number, number, number] => {
  // Guard: budget that floors to 0 or below (covers zero, negative, and the
  // fractional (0,1) range) and NaN both yield all-zeros. Positive Infinity is
  // allowed and will be clamped by effectiveBudget = min(intBudget, 3 * intMaxEach).
  if (Math.floor(budget) <= 0 || Number.isNaN(budget)) {
    return [0, 0, 0];
  }
  // Guard: non-finite maxEach (NaN / Infinity) would propagate through all
  // downstream arithmetic, so treat it the same as a zero cap.
  if (!Number.isFinite(maxEach)) {
    return [0, 0, 0];
  }

  // Clamp both inputs to whole numbers so that `leftover` stays integral
  // throughout the redistribution loop and the returned portions are always
  // non-negative integers regardless of what the caller passes.
  const intBudget = Math.floor(budget);
  const intMaxEach = Math.max(0, Math.floor(maxEach));

  // Clamp budget to the maximum distributable across all three portions so
  // that the function always returns portions summing to the (clamped) budget
  // without throwing a runtime error that would break the UI.
  const effectiveBudget = Math.min(intBudget, 3 * intMaxEach);

  // Short-circuit: if there is nothing to distribute (e.g. maxEach is 0 or
  // budget was clamped to 0 by the capacity ceiling), return zeros without
  // consuming any RNG draws.
  if (effectiveBudget === 0) {
    return [0, 0, 0];
  }

  const wa = rng() + rng();
  const wb = rng() + rng();
  const wc = rng() + rng();
  const wTotal = wa + wb + wc;

  // Defensive fallback: if all six draws were exactly 0 (practically impossible
  // with a real PRNG, but guarded against), treat the three weights as equal.
  const w1 = wTotal > 0 ? wa / wTotal : 1 / 3;
  const w2 = wTotal > 0 ? wb / wTotal : 1 / 3;
  const w3 = wTotal > 0 ? wc / wTotal : 1 / 3;

  const raw1 = w1 * effectiveBudget;
  const raw2 = w2 * effectiveBudget;
  const raw3 = w3 * effectiveBudget;

  const portions: [number, number, number] = [
    Math.min(Math.floor(raw1), intMaxEach),
    Math.min(Math.floor(raw2), intMaxEach),
    Math.min(Math.floor(raw3), intMaxEach),
  ];
  const capacities = portions.map((p) => intMaxEach - p);
  // Fractional parts of the raw proportions drive the largest-remainder
  // redistribution. A used fraction is set to -1 so the next surplus point
  // goes to a different portion.
  const fracs = [raw1 % 1, raw2 % 1, raw3 % 1];

  let leftover = effectiveBudget - portions[0] - portions[1] - portions[2];
  // Largest-remainder: give each surplus point to the portion with the highest
  // fractional part that still has capacity. Ties are broken with rng() so the
  // redistribution does not favor any particular stat position.
  // Once all fractional priorities are consumed (fracs all -1), fall back to
  // spreading any remaining surplus uniformly at random among portions that
  // still have capacity, so the total always equals effectiveBudget.
  while (leftover > 0) {
    let maxFrac = -1;
    for (let i = 0; i < 3; i++) {
      if (capacities[i] > 0 && fracs[i] > maxFrac) maxFrac = fracs[i];
    }

    let candidates: readonly number[];
    const useFracs = maxFrac >= 0;
    if (useFracs) {
      candidates = ([0, 1, 2] as const).filter((i) => capacities[i] > 0 && fracs[i] === maxFrac);
    } else {
      // All fractional priorities used up; spread remaining surplus randomly
      // among any portion that still has room below maxEach.
      candidates = ([0, 1, 2] as const).filter((i) => capacities[i] > 0);
      if (candidates.length === 0) break; // truly no capacity left anywhere
    }

    const chosen =
      candidates.length === 1 ? candidates[0] : candidates[Math.floor(rng() * candidates.length)];
    portions[chosen]++;
    capacities[chosen]--;
    if (useFracs) {
      fracs[chosen] = -1; // mark as used so the next point goes elsewhere
    }
    leftover--;
  }

  return portions;
};

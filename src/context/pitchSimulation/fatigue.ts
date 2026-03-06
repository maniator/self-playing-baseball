/**
 * Pitcher fatigue model.
 *
 * As a pitcher faces more batters, their effectiveness degrades: control drops
 * first, then velocity/stuff softens, increasing hard-contact and walk risk.
 */

/**
 * Compute a fatigue factor for the active pitcher.
 *
 * Returns a value ≥ 1.0.  At 1.0 the pitcher is fully fresh; higher values
 * represent increasing fatigue that degrades their effectiveness.
 *
 * The `freshThreshold` (batters before fatigue starts) is raised by higher
 * `staminaMod` and lowered by negative staminaMod.
 *
 * @param battersFaced   Batters the current pitcher has faced this appearance.
 * @param staminaMod     Pitcher's stamina modifier (typically −20 … +20).
 * @returns fatigueFactor ∈ [1.0, 1.6]
 */
export const computeFatigueFactor = (battersFaced: number, staminaMod: number): number => {
  // Stamina mod shifts the point where fatigue begins.
  const freshThreshold = 9 + Math.round(staminaMod / 5);
  const battersBeyond = Math.max(0, battersFaced - freshThreshold);
  const factor = 1.0 + 0.025 * battersBeyond;
  return Math.min(1.6, factor);
};

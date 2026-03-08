/**
 * Pitcher fatigue model.
 *
 * Pitch count is the primary workload signal: a pitcher who gets quick outs
 * on few pitches stays fresher longer than one who grinds through long counts,
 * fouls, and full at-bats.  Batters faced acts as a lighter secondary signal.
 */

/**
 * Compute a fatigue factor for the active pitcher.
 *
 * Returns a value ≥ 1.0.  At 1.0 the pitcher is fully fresh; higher values
 * represent increasing fatigue that degrades their effectiveness.
 *
 * Pitch count is the primary driver; batters faced is a secondary modifier
 * that adds a small extra load for pitchers who face many batters per outing
 * (walks, long plate appearances).  High stamina pitchers have a higher fresh
 * threshold and tire more slowly; low stamina pitchers tire faster.
 *
 * @param pitchCount   Pitches thrown by the current pitcher this appearance.
 * @param battersFaced Batters the current pitcher has faced this appearance.
 * @param staminaMod   Pitcher's stamina modifier (typically −20 … +20).
 * @returns fatigueFactor ∈ [1.0, 1.6]
 */
export const computeFatigueFactor = (
  pitchCount: number,
  battersFaced: number,
  staminaMod: number,
): number => {
  // Primary: pitch count. High stamina raises the threshold; low stamina lowers it.
  const pitchFreshThreshold = 75 + Math.round(staminaMod * 1.5);
  const pitchesBeyond = Math.max(0, pitchCount - pitchFreshThreshold);
  const pitchComponent = 0.012 * pitchesBeyond;

  // Secondary: batters faced. Pitchers who face many batters per outing
  // (walks, long at-bats) accumulate extra stress beyond their pitch count.
  const bfThreshold = 9 + Math.round(staminaMod / 5);
  const bfBeyond = Math.max(0, battersFaced - bfThreshold);
  const bfComponent = 0.005 * bfBeyond;

  return Math.min(1.6, 1.0 + pitchComponent + bfComponent);
};

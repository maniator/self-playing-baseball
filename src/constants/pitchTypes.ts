export type PitchType = "fastball" | "curveball" | "slider" | "changeup";

/**
 * Select pitch type based on the current count (balls-strikes) and a roll [0, 100).
 * Count-aware selection adds strategic depth to count-based decisions:
 *   0-2: expand the zone with breaking balls to induce chases
 *   3-0: pitcher needs a strike — mostly fastballs
 *   Full: balanced mix leaning fastball/slider
 *   Default: fastball-heavy early-count mix
 */
export const selectPitchType = (balls: number, strikes: number, roll: number): PitchType => {
  if (strikes === 2 && balls === 0) {
    if (roll < 35) return "slider";
    if (roll < 65) return "curveball";
    if (roll < 80) return "changeup";
    return "fastball";
  }
  if (balls === 3 && strikes === 0) {
    if (roll < 65) return "fastball";
    if (roll < 82) return "curveball";
    if (roll < 93) return "changeup";
    return "slider";
  }
  if (balls === 3 && strikes === 2) {
    if (roll < 45) return "fastball";
    if (roll < 75) return "slider";
    return "curveball";
  }
  if (roll < 55) return "fastball";
  if (roll < 75) return "curveball";
  if (roll < 90) return "slider";
  return "changeup";
};

/**
 * Swing-rate multiplier — higher = batter more likely to swing.
 * Sliders induce more chases; curveballs are harder to time.
 */
export const pitchSwingRateMod = (pitch: PitchType): number => {
  switch (pitch) {
    case "fastball":  return 1.00;
    case "curveball": return 0.90;
    case "slider":    return 1.10;
    case "changeup":  return 1.05;
  }
};

/**
 * Strike-zone probability multiplier when a batter takes the pitch.
 * < 1.0 means the pitch is more likely to miss the zone (more balls called).
 */
export const pitchStrikeZoneMod = (pitch: PitchType): number => {
  switch (pitch) {
    case "fastball":  return 1.00;
    case "curveball": return 0.85;
    case "slider":    return 0.75;
    case "changeup":  return 0.90;
  }
};

/** Short display name used in play-by-play log messages. */
export const pitchName = (pitch: PitchType): string => {
  switch (pitch) {
    case "fastball":  return "Fastball";
    case "curveball": return "Curveball";
    case "slider":    return "Slider";
    case "changeup":  return "Changeup";
  }
};

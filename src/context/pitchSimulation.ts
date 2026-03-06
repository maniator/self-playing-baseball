/**
 * Pure pitch-simulation helpers.
 *
 * Implements the layered baseball pitch-resolution model:
 *   1. Swing decision  (computeSwingRate)
 *   2. Swing outcome   (resolveSwingOutcome): whiff | foul | contact
 *   3. Contact quality (resolveContactHitType): weak → medium → hard → hit type
 *   4. Pitcher fatigue (computeFatigueFactor): degrades effectiveness over batters faced
 *
 * All functions are pure (no side effects) and deterministic given the same inputs.
 * Random rolls are accepted as parameters so callers control the RNG sequence.
 */

import { Hit } from "@constants/hitTypes";
import type { PitchType } from "@constants/pitchTypes";
import { pitchSwingRateMod } from "@constants/pitchTypes";

import type { OnePitchModifier, Strategy } from "./index";

// ---------------------------------------------------------------------------
// Fatigue
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Swing decision
// ---------------------------------------------------------------------------

/** Per-strategy swing-rate multipliers (relative to "balanced" = 1.0). */
const SWING_RATE_MODS: Record<Strategy, number> = {
  balanced: 1.0,
  aggressive: 1.15,
  patient: 0.75,
  contact: 1.05,
  power: 0.95,
};

/**
 * Compute the per-pitch swing rate for the current count, strategy, and context.
 *
 * Returns an integer in [0, 1000].  Compare with `getRandomInt(1000)`:
 * if roll < swingRate → swing, otherwise → take.
 *
 * Swing rates by strikes (base):
 *   0 strikes → 360 (36%)  — selective early
 *   1 strike  → 450 (45%)  — start protecting
 *   2 strikes → 580 (58%)  — must protect the plate
 */
export const computeSwingRate = (
  strikes: number,
  strategy: Strategy,
  batterContactMod: number,
  pitchType: PitchType | undefined,
  onePitchMod: OnePitchModifier,
): number => {
  if (onePitchMod === "swing") return 920;
  if (onePitchMod === "take") return 0;

  const baseRates = [360, 450, 580];
  const base = baseRates[Math.min(strikes, 2)];

  const protectBonus = onePitchMod === "protect" ? 1.2 : 1.0;
  const stratFactor = SWING_RATE_MODS[strategy] ?? 1.0;

  // Better contact skills = marginally more willing to swing (makes contact more often)
  const contactBonus = 1 + batterContactMod / 200;

  const pitchMod = pitchType ? pitchSwingRateMod(pitchType) : 1.0;

  const raw = Math.round(base * stratFactor * protectBonus * contactBonus * pitchMod);
  return Math.min(920, Math.max(0, raw));
};

// ---------------------------------------------------------------------------
// Swing outcome
// ---------------------------------------------------------------------------

/** The outcome when a batter swings at a pitch. */
export type SwingOutcome = "whiff" | "foul" | "contact";

/**
 * Determine whether a swing results in a whiff, foul, or contact.
 *
 * Uses a 0–99 roll.  Thresholds are modified by pitcher stuff and batter
 * contact skill.  Fatigue softens pitcher velocity effectiveness.
 *
 * Base rates: whiff 22%, foul 33%, contact 45%.
 *
 * @param roll                0–99 random roll from the caller.
 * @param pitcherVelocityMod  Pitcher's velocity modifier (−20 … +20).
 * @param pitcherMovementMod  Pitcher's movement modifier.
 * @param batterContactMod    Batter's contact modifier.
 * @param fatigueFactor       Pitcher fatigue (≥ 1.0; higher = more tired).
 */
export const resolveSwingOutcome = (
  roll: number,
  pitcherVelocityMod: number,
  pitcherMovementMod: number,
  batterContactMod: number,
  fatigueFactor = 1.0,
): SwingOutcome => {
  const baseWhiff = 22;
  const baseFoul = 33;

  // Velocity adds to whiff (harder to square up); fatigue reduces this bonus.
  const velocityBonus = Math.round(pitcherVelocityMod / 5);
  const fatigueReduction = Math.round((fatigueFactor - 1) * 8);
  // Batter contact skill reduces whiff probability.
  const contactReduction = Math.round(batterContactMod / 10);

  const whiffThreshold = Math.max(
    8,
    Math.min(40, baseWhiff + velocityBonus - fatigueReduction - contactReduction),
  );

  // Movement shifts energy from contact to foul/weak contact.
  const movementFoulBonus = Math.round(pitcherMovementMod / 6);
  const contactFoulReduction = Math.round(batterContactMod / 20);
  const foulThreshold = Math.max(
    whiffThreshold + 15,
    Math.min(75, whiffThreshold + baseFoul + movementFoulBonus - contactFoulReduction),
  );

  if (roll < whiffThreshold) return "whiff";
  if (roll < foulThreshold) return "foul";
  return "contact";
};

// ---------------------------------------------------------------------------
// Contact quality and hit-type resolution
// ---------------------------------------------------------------------------

/** Broad contact quality categories used internally. */
type ContactQuality = "weak" | "medium" | "hard";

/**
 * Determine the hit type when the batter makes contact.
 *
 * Two independent rolls are accepted:
 *   `contactRoll` (0–99) — determines contact quality (weak/medium/hard).
 *   `typeRoll`    (0–99) — determines the specific hit type within the quality tier.
 *
 * Note: `hitBall()` still applies a separate pop-out / grounder check, so
 * "contact = single" does not guarantee the batter reaches base.  These
 * represent the *potential* hit type before field defence is applied.
 *
 * @param contactRoll         0–99 roll for contact quality.
 * @param typeRoll            0–99 roll for hit type selection.
 * @param strategy            Batter's current strategy.
 * @param batterPowerMod      Batter's power modifier.
 * @param pitcherVelocityMod  Pitcher's velocity modifier.
 * @param pitcherMovementMod  Pitcher's movement modifier.
 * @param fatigueFactor       Pitcher fatigue (≥ 1.0; higher = more tired).
 */
export const resolveContactHitType = (
  contactRoll: number,
  typeRoll: number,
  strategy: Strategy,
  batterPowerMod: number,
  pitcherVelocityMod: number,
  pitcherMovementMod: number,
  fatigueFactor = 1.0,
): Hit => {
  // Hard contact threshold: batter power raises it; pitcher stuff lowers it;
  // fatigue raises it (tired pitchers allow more hard contact).
  const hardBase = 25;
  const hardThreshold = Math.max(
    10,
    Math.min(
      50,
      hardBase +
        Math.round(batterPowerMod / 5) -
        Math.round((pitcherVelocityMod + pitcherMovementMod) / 10) +
        Math.round((fatigueFactor - 1) * 10),
    ),
  );
  const mediumThreshold = Math.min(75, hardThreshold + 35);

  let quality: ContactQuality;
  if (contactRoll < hardThreshold) {
    quality = "hard";
  } else if (contactRoll < mediumThreshold) {
    quality = "medium";
  } else {
    quality = "weak";
  }

  // Power strategy boosts the chance of hard contact converting to extra bases.
  const powerBoost = strategy === "power" && quality !== "hard" && typeRoll < 15;
  if (powerBoost) {
    quality = quality === "weak" ? "medium" : "hard";
  }

  switch (quality) {
    case "hard":
      // Hard contact: meaningful HR and extra-base potential.
      if (typeRoll < 15) return Hit.Homerun;
      if (typeRoll < 20) return Hit.Triple;
      if (typeRoll < 45) return Hit.Double;
      return Hit.Single;

    case "medium":
      // Medium contact: mostly singles and doubles, occasional extra base.
      if (typeRoll < 5) return Hit.Homerun;
      if (typeRoll < 8) return Hit.Triple;
      if (typeRoll < 28) return Hit.Double;
      return Hit.Single;

    case "weak":
      // Weak contact: mostly singles (many will become outs in hitBall).
      if (typeRoll < 2) return Hit.Homerun;
      if (typeRoll < 4) return Hit.Triple;
      if (typeRoll < 14) return Hit.Double;
      return Hit.Single;
  }
};

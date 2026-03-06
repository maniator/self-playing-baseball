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
// Contact quality and batted-ball type resolution
// ---------------------------------------------------------------------------

/** Broad contact quality categories. */
export type ContactQuality = "weak" | "medium" | "hard";

/**
 * The type of ball put in play.
 *
 * This is the explicit intermediate layer between contact quality and the final
 * ball-in-play result.  The final outcome (hit type or out) is determined by
 * `handleBallInPlay()` in `hitBall.ts` using the batted-ball type.
 *
 * Outcome shape per type (approximate):
 *   pop_up       → ~100% out (pop-up)
 *   weak_grounder→ ~65% out (ground out / FC / DP), ~35% infield single
 *   hard_grounder→ ~40% out (ground out / FC / DP), ~60% single
 *   line_drive   → ~15% out (liner caught),          ~85% hit (Single–HR)
 *   medium_fly   → ~70% out (fly out),               ~30% hit (Single–Double)
 *   deep_fly     → ~35% out (warning-track out),     ~65% hit (Double–HR)
 */
export type BattedBallType =
  | "pop_up"
  | "weak_grounder"
  | "hard_grounder"
  | "line_drive"
  | "medium_fly"
  | "deep_fly";

/**
 * Compute contact quality from a 0–99 roll and pitcher/batter modifiers.
 *
 * Extracted so it can be reused by `resolveBattedBallType` and tested in
 * isolation.
 */
export interface ResolveContactQualityOptions {
  batterPowerMod?: number;
  pitcherVelocityMod?: number;
  pitcherMovementMod?: number;
  /** Pitcher fatigue (≥ 1.0; higher = more tired, allows more hard contact). */
  fatigueFactor?: number;
}

export const resolveContactQuality = (
  contactRoll: number,
  {
    batterPowerMod = 0,
    pitcherVelocityMod = 0,
    pitcherMovementMod = 0,
    fatigueFactor = 1.0,
  }: ResolveContactQualityOptions = {},
): ContactQuality => {
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

  if (contactRoll < hardThreshold) return "hard";
  if (contactRoll < mediumThreshold) return "medium";
  return "weak";
};

/**
 * Determine the batted-ball type from contact quality and a 0–99 type roll.
 *
 * This is the explicit ball-in-play intermediate layer:
 *   contact quality → batted-ball type → final result (in `handleBallInPlay`)
 *
 * Hard contact skews toward deep fly balls and line drives.
 * Medium contact produces a mix of fly balls, grounders, and liners.
 * Weak contact mostly produces pop-ups and weak grounders.
 *
 * Power strategy can upgrade the batted-ball type for the same contact quality.
 */
export interface ResolveBattedBallOptions {
  strategy?: Strategy;
  batterPowerMod?: number;
  pitcherVelocityMod?: number;
  pitcherMovementMod?: number;
  /** Pitcher fatigue (≥ 1.0; higher = more tired). */
  fatigueFactor?: number;
}

export const resolveBattedBallType = (
  contactRoll: number,
  typeRoll: number,
  {
    strategy = "balanced",
    batterPowerMod = 0,
    pitcherVelocityMod = 0,
    pitcherMovementMod = 0,
    fatigueFactor = 1.0,
  }: ResolveBattedBallOptions = {},
): BattedBallType => {
  const quality = resolveContactQuality(contactRoll, {
    batterPowerMod,
    pitcherVelocityMod,
    pitcherMovementMod,
    fatigueFactor,
  });

  // Power strategy can upgrade the batted-ball type one tier toward extra bases.
  const powerBoost = strategy === "power" && typeRoll < 15;

  switch (quality) {
    case "hard":
      // Hard contact: deep fly (40%) → line drive (35%) → hard grounder (25%).
      if (typeRoll < 40) return "deep_fly";
      if (typeRoll < 75) return "line_drive";
      return "hard_grounder";

    case "medium":
      // Power boost on medium: elevate to deep fly.
      if (powerBoost) return "deep_fly";
      // medium fly (35%) → hard grounder (20%) → line drive (20%) → weak grounder (25%).
      if (typeRoll < 35) return "medium_fly";
      if (typeRoll < 55) return "hard_grounder";
      if (typeRoll < 75) return "line_drive";
      return "weak_grounder";

    case "weak":
      // Power boost on weak: elevate to medium fly (at least a chance at a hit).
      if (powerBoost) return "medium_fly";
      // pop up (35%) → weak grounder (45%) → medium fly (20%).
      if (typeRoll < 35) return "pop_up";
      if (typeRoll < 80) return "weak_grounder";
      return "medium_fly";
  }
};

/**
 * Determine the hit type when the batter makes contact.
 *
 * @deprecated Use `resolveBattedBallType` + `handleBallInPlay` instead.
 *   This function is kept for unit-test backward-compatibility only and now
 *   derives its result via `resolveBattedBallType`.
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
  const bbt = resolveBattedBallType(contactRoll, typeRoll, {
    strategy,
    batterPowerMod,
    pitcherVelocityMod,
    pitcherMovementMod,
    fatigueFactor,
  });
  // Map batted-ball type to the approximate hit type it would produce when it
  // falls for a hit (used only by legacy tests; `handleBallInPlay` is the
  // authoritative implementation for actual gameplay).
  switch (bbt) {
    case "pop_up":
      return Hit.Single; // will be converted to an out by handleBallInPlay
    case "weak_grounder":
      return Hit.Single;
    case "hard_grounder":
      return Hit.Single;
    case "line_drive":
      if (typeRoll < 15) return Hit.Homerun;
      if (typeRoll < 23) return Hit.Triple;
      if (typeRoll < 50) return Hit.Double;
      return Hit.Single;
    case "medium_fly":
      if (typeRoll < 5) return Hit.Homerun;
      if (typeRoll < 8) return Hit.Triple;
      if (typeRoll < 28) return Hit.Double;
      return Hit.Single;
    case "deep_fly":
      if (typeRoll < 25) return Hit.Homerun;
      if (typeRoll < 40) return Hit.Triple;
      if (typeRoll < 80) return Hit.Double;
      return Hit.Single;
  }
};

import { fnv1a } from "@storage/hash";

import type { Handedness } from "./index";

export type EffectiveBatterSide = "R" | "L";

export type MatchupBucket = "R_R" | "R_L" | "L_R" | "L_L" | "S_R" | "S_L";

export interface HandednessMatchup {
  batterHandedness: Handedness;
  pitcherHandedness: "R" | "L";
  effectiveBatterSide: EffectiveBatterSide;
  bucket: MatchupBucket;
}

/**
 * Deterministic fallback used when a player has no explicit handedness value.
 * Uses stable player ID hashing so repeated setups remain reproducible.
 */
export const deterministicHandednessForPlayerId = (playerId: string): Handedness => {
  const hash = parseInt(fnv1a(playerId), 16) % 100;
  if (hash < 62) return "R";
  if (hash < 90) return "L";
  return "S";
};

export const resolvePlayerHandedness = (
  explicitHandedness: Handedness | undefined,
  playerId: string,
): Handedness => explicitHandedness ?? deterministicHandednessForPlayerId(playerId);

export const resolvePitcherHandedness = (
  explicitHandedness: Handedness | undefined,
  pitcherId: string,
): "R" | "L" => {
  const resolved = resolvePlayerHandedness(explicitHandedness, pitcherId);
  // Pitchers should not be switch-handed in this model; normalize to a throw side.
  if (resolved === "S") return "R";
  return resolved;
};

export const resolveEffectiveBatterSide = (
  batterHandedness: Handedness,
  pitcherHandedness: "R" | "L",
): EffectiveBatterSide => {
  if (batterHandedness === "S") return pitcherHandedness === "R" ? "L" : "R";
  return batterHandedness;
};

export const getMatchupBucket = (
  batterHandedness: Handedness,
  pitcherHandedness: "R" | "L",
): MatchupBucket => {
  if (batterHandedness === "S") return pitcherHandedness === "R" ? "S_R" : "S_L";
  return `${batterHandedness}_${pitcherHandedness}` as MatchupBucket;
};

export const buildHandednessMatchup = (
  batterHandedness: Handedness,
  pitcherHandedness: "R" | "L",
): HandednessMatchup => ({
  batterHandedness,
  pitcherHandedness,
  effectiveBatterSide: resolveEffectiveBatterSide(batterHandedness, pitcherHandedness),
  bucket: getMatchupBucket(batterHandedness, pitcherHandedness),
});
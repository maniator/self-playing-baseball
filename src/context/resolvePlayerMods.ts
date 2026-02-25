import type { PlayerCustomization, ResolvedPlayerMods } from "./index";

export const ZERO_MODS: ResolvedPlayerMods = {
  contactMod: 0,
  powerMod: 0,
  speedMod: 0,
  velocityMod: 0,
  controlMod: 0,
  movementMod: 0,
};

/**
 * Resolves a PlayerCustomization into a ResolvedPlayerMods with all fields defaulted to 0.
 * Used to pre-compute mods at setTeams time so simulation never needs ?? 0 lookups.
 */
export const resolvePlayerMods = (ov: PlayerCustomization | undefined): ResolvedPlayerMods => {
  if (!ov) return ZERO_MODS;
  return {
    contactMod: ov.contactMod ?? 0,
    powerMod: ov.powerMod ?? 0,
    speedMod: ov.speedMod ?? 0,
    velocityMod: ov.velocityMod ?? 0,
    controlMod: ov.controlMod ?? 0,
    movementMod: ov.movementMod ?? 0,
  };
};

/**
 * Builds the resolvedMods map for one team from its playerOverrides.
 */
export const buildResolvedMods = (
  overrides: Record<string, PlayerCustomization>,
): Record<string, ResolvedPlayerMods> => {
  const resolved: Record<string, ResolvedPlayerMods> = {};
  for (const [id, ov] of Object.entries(overrides)) {
    resolved[id] = resolvePlayerMods(ov);
  }
  return resolved;
};

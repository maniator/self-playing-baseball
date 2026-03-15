import { generateSeed } from "@storage/generateId";
import { fnv1a } from "@storage/hash";
import type { TeamPlayer, TeamRoster } from "@storage/types";

import { buildPlayerSig } from "./customTeamSignatures";

export const STAT_MIN = 0;
export const STAT_MAX = 100;
export const ROSTER_SCHEMA_VERSION = 1;

export function requireNonEmpty(value: unknown, fieldPath: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldPath} must be a non-empty string`);
  }
  return value.trim();
}

/**
 * Sanitizes an abbreviation: trims, uppercases, and enforces 2–3 characters.
 * Throws if the result is outside that range so stored docs are always valid.
 */
export function sanitizeAbbreviation(value: string): string {
  const abbr = value.trim().toUpperCase();
  if (abbr.length < 2 || abbr.length > 3) {
    throw new Error(`abbreviation must be 2–3 characters (got "${abbr}")`);
  }
  return abbr;
}

export function clampStat(value: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, value));
}

export function sanitizePlayer(player: TeamPlayer, index: number): TeamPlayer {
  const name = requireNonEmpty(player.name, `roster player[${index}].name`);
  if (!["batter", "pitcher", "two-way"].includes(player.role)) {
    throw new Error(`roster player[${index}].role must be "batter", "pitcher", or "two-way"`);
  }
  if (!player.batting || typeof player.batting !== "object") {
    throw new Error(`roster player[${index}].batting is required`);
  }
  const sanitized: TeamPlayer = {
    ...player,
    name,
    batting: {
      contact: clampStat(Number(player.batting.contact) || 0),
      power: clampStat(Number(player.batting.power) || 0),
      speed: clampStat(Number(player.batting.speed) || 0),
    },
    ...(player.pitching && {
      pitching: {
        ...(player.pitching.velocity !== undefined && {
          velocity: clampStat(Number(player.pitching.velocity)),
        }),
        ...(player.pitching.control !== undefined && {
          control: clampStat(Number(player.pitching.control)),
        }),
        ...(player.pitching.movement !== undefined && {
          movement: clampStat(Number(player.pitching.movement)),
        }),
      },
    }),
  };
  // Preserve the existing playerSeed or generate a new one at creation time.
  // The seed is stored permanently so the fingerprint can be re-verified.
  const playerSeed = player.playerSeed ?? generateSeed();
  // Always persist a content fingerprint so global duplicate detection works
  // without re-reading all teams. The fingerprint covers the immutable identity
  // fields (name, role, batting, pitching) plus the per-player seed.
  const fingerprint = buildPlayerSig({ ...sanitized, playerSeed });
  // Derive a stable team-independent identity from the player's seed.
  // "pl_" prefix distinguishes it from team IDs and raw nanoid strings.
  // Using fnv1a(playerSeed) means the same player always gets the same globalPlayerId
  // regardless of which team they belong to, enabling cross-team career aggregation.
  const globalPlayerId = player.globalPlayerId ?? `pl_${fnv1a(playerSeed)}`;
  return { ...sanitized, playerSeed, fingerprint, globalPlayerId };
}

export function buildRoster(input: {
  lineup: TeamPlayer[];
  bench?: TeamPlayer[];
  pitchers?: TeamPlayer[];
}): TeamRoster {
  if (!Array.isArray(input.lineup) || input.lineup.length < 1) {
    throw new Error("roster.lineup must have at least 1 player");
  }
  return {
    schemaVersion: ROSTER_SCHEMA_VERSION,
    lineup: input.lineup.map((p, i) => sanitizePlayer(p, i)),
    bench: (input.bench ?? []).map((p, i) => sanitizePlayer(p, i)),
    pitchers: (input.pitchers ?? []).map((p, i) => sanitizePlayer(p, i)),
  };
}

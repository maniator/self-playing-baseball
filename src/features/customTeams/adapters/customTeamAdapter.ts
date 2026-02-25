import type { TeamCustomPlayerOverrides } from "@context/index";
import type { CustomTeamDoc } from "@storage/types";

/**
 * Returns a stable game-session ID for a custom team.
 * Uses the `custom:` prefix so it is distinguishable from numeric MLB IDs.
 */
export function customTeamToGameId(team: CustomTeamDoc): string {
  return `custom:${team.id}`;
}

/**
 * Returns the display name for a custom team (city + name, or just name).
 */
export function customTeamToDisplayName(team: CustomTeamDoc): string {
  if (team.city) return `${team.city} ${team.name}`;
  return team.name;
}

/**
 * Maps the lineup section of a CustomTeamDoc into the ordered array of
 * player IDs expected by the game's `lineupOrder` setup field.
 */
export function customTeamToLineupOrder(team: CustomTeamDoc): string[] {
  return team.roster.lineup.map((p) => p.id);
}

/**
 * Returns the abbreviation for a custom team, or a safe short fallback.
 * Used by compact UI surfaces like the line score.
 *
 * @param gameId - The game-session team string (e.g. `"custom:ct_123"` or an MLB name).
 * @param teams  - List of known custom team docs for lookup.
 */
export function customTeamToAbbreviation(
  gameId: string,
  teams: CustomTeamDoc[],
): string | undefined {
  if (!gameId.startsWith("custom:")) return undefined;
  const id = gameId.slice("custom:".length);
  const doc = teams.find((t) => t.id === id);
  if (!doc) return undefined;
  if (doc.abbreviation) return doc.abbreviation;
  // Fallback: first 3 chars of team name (uppercase)
  return doc.name.trim().toUpperCase().slice(0, 3) || undefined;
}

/**
 * Returns the full display label for any team string (MLB name or `custom:<id>`).
 * Used in non-compact UI surfaces (tabs, selectors, hit-log entries).
 *
 * @param gameId  - The game-session team string.
 * @param teams   - Known custom team docs for lookup.
 */
export function resolveTeamLabel(gameId: string, teams: CustomTeamDoc[]): string {
  if (!gameId.startsWith("custom:")) return gameId;
  const id = gameId.slice("custom:".length);
  const doc = teams.find((t) => t.id === id);
  // Safe short fallback: strip the `custom:` prefix and show the first 8 chars of the
  // internal ID so the user sees something recognizable, never the full raw ID.
  if (!doc) return gameId.replace(/^custom:/, "").slice(0, 8);
  return customTeamToDisplayName(doc);
}

type ModPreset = -20 | -10 | -5 | 0 | 5 | 10 | 20;

/** Rounds a raw offset to the nearest valid ModPreset value. */
function clampMod(offset: number): ModPreset {
  const presets: ModPreset[] = [-20, -10, -5, 0, 5, 10, 20];
  return presets.reduce((best, p) => (Math.abs(p - offset) < Math.abs(best - offset) ? p : best));
}

/**
 * Maps a CustomTeamDoc's batting stats into the `TeamCustomPlayerOverrides`
 * shape consumed by the game's `setTeams` action.
 *
 * Stat modifier scale: the game uses ModPreset offsets (-20…+20) relative to
 * a baseline. For custom teams we store absolute stats (0–100), so we convert
 * by expressing each stat as an offset from 60 (the midpoint of 40–80 typical
 * range), clamped to valid ModPreset values.
 */
export function customTeamToPlayerOverrides(team: CustomTeamDoc): TeamCustomPlayerOverrides {
  const overrides: TeamCustomPlayerOverrides = {};
  const allPlayers = [...team.roster.lineup, ...team.roster.bench, ...team.roster.pitchers];
  for (const player of allPlayers) {
    overrides[player.id] = {
      nickname: player.name,
      ...(player.position ? { position: player.position } : {}),
      contactMod: clampMod(player.batting.contact - 60),
      powerMod: clampMod(player.batting.power - 60),
      speedMod: clampMod(player.batting.speed - 60),
      ...(player.pitching && {
        velocityMod: clampMod((player.pitching.velocity ?? 60) - 60),
        controlMod: clampMod((player.pitching.control ?? 60) - 60),
      }),
    };
  }
  return overrides;
}

/**
 * Returns the ordered list of bench player IDs for a custom team.
 * Used to populate `rosterBench` when a custom team game is started.
 */
export function customTeamToBenchRoster(team: CustomTeamDoc): string[] {
  return team.roster.bench.map((p) => p.id);
}

/**
 * Returns the ordered list of pitcher IDs for a custom team.
 * Used to populate `rosterPitchers` when a custom team game is started.
 */
export function customTeamToPitcherRoster(team: CustomTeamDoc): string[] {
  return team.roster.pitchers.map((p) => p.id);
}

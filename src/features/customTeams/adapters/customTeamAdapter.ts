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

type ModPreset = -20 | -10 | -5 | 0 | 5 | 10 | 20;

/** Rounds a raw offset to the nearest valid ModPreset value. */
function clampMod(offset: number): ModPreset {
  const presets: ModPreset[] = [-20, -10, -5, 0, 5, 10, 20];
  return presets.reduce((best, p) =>
    Math.abs(p - offset) < Math.abs(best - offset) ? p : best,
  );
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

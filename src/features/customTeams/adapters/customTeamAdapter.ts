import type { TeamCustomPlayerOverrides } from "@context/index";
import type { CustomTeamDoc } from "@storage/types";
import { BATTING_POSITIONS } from "@utils/roster";

/**
 * Returns a stable game-session ID for a custom team.
 * Uses the `custom:` prefix to distinguish it from other string team identifiers.
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
 * @param gameId - The game-session team string (e.g. `"custom:ct_123"`).
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
 * Returns the full display label for any team string (`custom:<id>`).
 * Used in non-compact UI surfaces (tabs, selectors, hit-log entries).
 *
 * All team IDs must now use the `custom:` prefix. Any ID that does not start
 * with `custom:` is treated as an unknown/legacy identifier and returns a
 * safe placeholder rather than echoing the raw ID into the UI.
 *
 * @param gameId  - The game-session team string (e.g. `"custom:ct_123"`).
 * @param teams   - Known custom team docs for lookup.
 */
export function resolveTeamLabel(gameId: string, teams: CustomTeamDoc[]): string {
  if (!gameId.startsWith("custom:")) return "Unknown Team";
  const id = gameId.slice("custom:".length);
  const doc = teams.find((t) => t.id === id);
  // Safe short fallback: strip the `custom:` prefix and show the first 8 chars of the
  // internal ID so the user sees something recognizable, never the full raw ID.
  if (!doc) return gameId.replace(/^custom:/, "").slice(0, 8);
  return customTeamToDisplayName(doc);
}

/**
 * Replaces all `custom:<id>` tokens in a string with their resolved display
 * labels.  Used to sanitize free-text fields that may contain raw team IDs —
 * specifically: save names (displayed in SavesModal / SavesPage) and TTS
 * announcement strings (Game/index.tsx).  These surfaces receive opaque strings
 * from legacy saves, so a regex scan is the correct approach here.
 *
 * The in-game play-by-play log (Announcements component) does NOT use this
 * function — it uses the structured `teamLabels` from `State` directly via
 * `String.replaceAll` on the two known team IDs, which is both faster and
 * type-safe.  Do not add new callers of this function for structured data;
 * prefer `teamLabels`-based substitution for those surfaces instead.
 */
export function resolveCustomIdsInString(text: string, teams: CustomTeamDoc[]): string {
  return text.replace(/custom:[^\s"',]+/g, (id) => resolveTeamLabel(id, teams));
}

/**
 * Resolves human-readable team labels for a restored save's game state.
 *
 * The parameter uses `teamLabels?: [string, string]` (optional) rather than the
 * full `State` type because legacy saves may not carry this field at all at
 * runtime, even though `State` declares it as required. The optional shape
 * accurately reflects the actual runtime data coming from persisted snapshots.
 *
 * Legacy saves may lack `teamLabels` or carry raw game IDs as labels (when
 * `teamLabels` was auto-populated from the `teams` array before display names
 * were stored separately). In those cases the labels are resolved from the
 * current custom team docs so reducer log messages use readable names.
 * New saves that already carry display names are returned unchanged.
 */
export function resolveRestoreLabels(
  state: { teams: [string, string]; teamLabels?: [string, string] },
  customTeams: CustomTeamDoc[],
): [string, string] {
  const existing = state.teamLabels;
  const needsResolution =
    !existing ||
    existing.some(
      (l, i) => typeof l === "string" && l === state.teams[i] && l.startsWith("custom:"),
    );
  return needsResolution
    ? [resolveTeamLabel(state.teams[0], customTeams), resolveTeamLabel(state.teams[1], customTeams)]
    : existing;
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
        movementMod: clampMod((player.pitching.movement ?? 60) - 60),
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

/**
 * Validates a custom team document for use in a game.
 * Returns null if valid, or an error message string describing what's wrong.
 *
 * Used by NewGameDialog to block game start with invalid (including legacy) teams.
 */
export function validateCustomTeamForGame(team: CustomTeamDoc): string | null {
  if (!team.name || !team.name.trim()) {
    return `Team has no name. Please edit it before starting a game.`;
  }
  const lineup = team.roster?.lineup ?? [];
  if (lineup.length === 0) {
    return `"${team.name}" has no lineup players. Edit the team to add batters before starting.`;
  }
  const pitchers = team.roster?.pitchers ?? [];
  if (pitchers.length === 0) {
    return `"${team.name}" has no pitchers. Edit the team to add at least one pitcher before starting.`;
  }
  // Validate each lineup player has a non-empty name.
  for (const player of lineup) {
    if (!player.name || !player.name.trim()) {
      return `"${team.name}" has a lineup player with no name. Edit the team to fix it before starting.`;
    }
  }
  // Validate each pitcher has a non-empty name.
  for (const pitcher of pitchers) {
    if (!pitcher.name || !pitcher.name.trim()) {
      return `"${team.name}" has a pitcher with no name. Edit the team to fix it before starting.`;
    }
  }
  // Validate starting lineup has exactly one of each required position (no duplicates, no missing).
  const lineupPosCounts = new Map<string, number>();
  for (const player of lineup) {
    const pos = player.position ?? "";
    if (pos) lineupPosCounts.set(pos, (lineupPosCounts.get(pos) ?? 0) + 1);
  }
  const duplicatePos = BATTING_POSITIONS.filter((pos) => (lineupPosCounts.get(pos) ?? 0) > 1);
  const missingPos = BATTING_POSITIONS.filter((pos) => !lineupPosCounts.has(pos));
  if (duplicatePos.length > 0) {
    return `"${team.name}" starting lineup has duplicate position(s): ${duplicatePos.join(", ")}. Edit the team to fix it.`;
  }
  if (missingPos.length > 0) {
    return `"${team.name}" starting lineup is missing position(s): ${missingPos.join(", ")}. Edit the team to fix it.`;
  }
  return null;
}

import { fnv1a } from "./hash";
import type { CustomTeamDoc, ExportedCustomTeams, TeamPlayer } from "./types";

export const CUSTOM_TEAM_EXPORT_FORMAT_VERSION = 1 as const;
/** Signing key for custom-teams exports — change alongside CUSTOM_TEAM_EXPORT_FORMAT_VERSION. */
export const TEAMS_EXPORT_KEY = "ballgame:teams:v1";

export interface ImportCustomTeamsResult {
  teams: CustomTeamDoc[];
  created: number;
  remapped: number;
  duplicateWarnings: string[];
}

/**
 * Builds a content-based fingerprint for a team that is stable across export/import
 * (does not include the team id).
 */
export function buildTeamFingerprint(team: CustomTeamDoc): string {
  const key =
    team.name.toLowerCase() +
    "|" +
    (team.abbreviation ?? "").toLowerCase() +
    "|" +
    team.roster.lineup
      .map((p) => p.name.toLowerCase())
      .sort()
      .join(",");
  return fnv1a(key);
}

/**
 * Computes an integrity signature for a single player, anchored to the parent team's
 * fingerprint. Covers the player's non-editable identity fields (id, role, stats,
 * position, handedness, jerseyNumber, pitchingRole) so any post-export mutation is
 * detectable. The player's `name` is intentionally excluded — it is a display label
 * and the team fingerprint already captures lineup names for duplicate detection.
 */
export function buildPlayerSig(teamFingerprint: string, player: TeamPlayer): string {
  const { id, role, batting, pitching, position, handedness, jerseyNumber, pitchingRole } = player;
  return fnv1a(
    teamFingerprint +
      JSON.stringify({ id, role, batting, pitching, position, handedness, jerseyNumber, pitchingRole }),
  );
}

/** Returns a copy of `player` with its `sig` field stripped (for clean DB storage). */
function stripPlayerSig(player: TeamPlayer): TeamPlayer {
  if (!("sig" in player)) return player;
  const { sig: _sig, ...rest } = player;
  return rest as TeamPlayer;
}

/** Returns a team with all player `sig` fields removed from every roster slot. */
export function stripTeamPlayerSigs(team: CustomTeamDoc): CustomTeamDoc {
  return {
    ...team,
    roster: {
      ...team.roster,
      lineup: team.roster.lineup.map(stripPlayerSig),
      bench: team.roster.bench.map(stripPlayerSig),
      pitchers: team.roster.pitchers.map(stripPlayerSig),
    },
  };
}

/** Attaches a `sig` to every player in a roster slot array using the team fingerprint. */
function signPlayers(players: TeamPlayer[], teamFingerprint: string): TeamPlayer[] {
  return players.map((p) => ({ ...p, sig: buildPlayerSig(teamFingerprint, p) }));
}

/**
 * Serialises an array of CustomTeamDoc objects into a portable signed JSON string.
 * Each player receives an individual sig anchored to its team fingerprint, then the
 * whole payload is signed with a bundle-level FNV-1a sig (same pattern as save export).
 */
export function exportCustomTeams(teams: CustomTeamDoc[]): string {
  // Attach per-player sigs before computing the bundle sig so the bundle sig covers them.
  const signedTeams = teams.map((team) => {
    const fingerprint = team.fingerprint ?? buildTeamFingerprint(team);
    return {
      ...team,
      roster: {
        ...team.roster,
        lineup: signPlayers(team.roster.lineup, fingerprint),
        bench: signPlayers(team.roster.bench, fingerprint),
        pitchers: signPlayers(team.roster.pitchers, fingerprint),
      },
    };
  });
  const payload = { teams: signedTeams };
  const sig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload));
  const bundle: ExportedCustomTeams = {
    type: "customTeams",
    formatVersion: CUSTOM_TEAM_EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    payload,
    sig,
  };
  return JSON.stringify(bundle, null, 2);
}

/**
 * Verifies the per-player sig for a single player given its team fingerprint.
 * Throws a descriptive error on mismatch.
 */
function verifyPlayerSig(
  teamFingerprint: string,
  player: Record<string, unknown>,
  teamIdx: number,
  playerIdx: number,
  slot: string,
): void {
  const { id, role, batting, pitching, position, handedness, jerseyNumber, pitchingRole, sig } =
    player as TeamPlayer & { sig?: string };
  const expected = fnv1a(
    teamFingerprint +
      JSON.stringify({ id, role, batting, pitching, position, handedness, jerseyNumber, pitchingRole }),
  );
  if (sig !== expected) {
    throw new Error(
      `Team[${teamIdx}] ${slot}[${playerIdx}] player signature mismatch — ` +
        `player data may have been tampered with after export`,
    );
  }
}

/** Parses and validates a custom-teams export JSON string. Verifies bundle and per-player FNV-1a signatures. Throws on malformed input. */
export function parseExportedCustomTeams(json: string): ExportedCustomTeams {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON: could not parse custom teams file");
  }
  if (!parsed || typeof parsed !== "object")
    throw new Error("Invalid custom teams file: not an object");
  const obj = parsed as Record<string, unknown>;
  if (obj["type"] !== "customTeams")
    throw new Error(`Invalid custom teams file: expected type "customTeams", got "${obj["type"]}"`);
  if (obj["formatVersion"] !== 1)
    throw new Error(`Unsupported custom teams format version: ${obj["formatVersion"]}`);
  if (!obj["payload"] || typeof obj["payload"] !== "object")
    throw new Error("Invalid custom teams file: missing payload");
  const payload = obj["payload"] as Record<string, unknown>;
  if (!Array.isArray(payload["teams"]))
    throw new Error("Invalid custom teams file: payload.teams must be an array");

  // Structural validation before signature checks.
  (payload["teams"] as unknown[]).forEach((t, i) => {
    if (!t || typeof t !== "object") throw new Error(`Team[${i}] is not an object`);
    const team = t as Record<string, unknown>;
    if (typeof team["id"] !== "string" || !team["id"])
      throw new Error(`Team[${i}] missing required field: id`);
    if (typeof team["name"] !== "string" || !team["name"])
      throw new Error(`Team[${i}] missing required field: name`);
    if (typeof team["source"] !== "string")
      throw new Error(`Team[${i}] missing required field: source`);
    if (!team["roster"] || typeof team["roster"] !== "object")
      throw new Error(`Team[${i}] missing required field: roster`);
    const roster = team["roster"] as Record<string, unknown>;
    if (!Array.isArray(roster["lineup"]) || (roster["lineup"] as unknown[]).length === 0)
      throw new Error(`Team[${i}] roster.lineup must be a non-empty array`);
  });

  // 1) Verify bundle-level signature (covers player sigs too, since they're in the payload).
  const expectedBundleSig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(obj["payload"]));
  if (typeof obj["sig"] !== "string" || obj["sig"] !== expectedBundleSig)
    throw new Error(
      "Teams signature mismatch — file may be corrupted or not a valid Ballgame teams export",
    );

  // 2) Verify per-player signatures — more granular tamper detection.
  (payload["teams"] as Record<string, unknown>[]).forEach((team, ti) => {
    const fingerprint = (team["fingerprint"] as string | undefined) ?? "";
    const roster = team["roster"] as Record<string, unknown>;
    (["lineup", "bench", "pitchers"] as const).forEach((slot) => {
      ((roster[slot] ?? []) as Record<string, unknown>[]).forEach((player, pi) => {
        verifyPlayerSig(fingerprint, player, ti, pi, slot);
      });
    });
  });

  return parsed as ExportedCustomTeams;
}

function remapPlayerIds(
  players: TeamPlayer[],
  existingPlayerIds: Set<string>,
  makeId: () => string,
): { players: TeamPlayer[]; hadCollision: boolean } {
  let hadCollision = false;
  const remapped = players.map((p) => {
    if (existingPlayerIds.has(p.id)) {
      hadCollision = true;
      const newId = makeId();
      existingPlayerIds.add(newId);
      return { ...p, id: newId };
    }
    return p;
  });
  return { players: remapped, hadCollision };
}

export interface ImportIdFactories {
  /** Factory for new team IDs on collision. */
  makeTeamId?: () => string;
  /** Factory for new player IDs on collision. */
  makePlayerId?: () => string;
}

/**
 * Merges incoming teams into the local collection, remapping IDs on collision
 * and flagging potential duplicates via fingerprint matching.
 * Player `sig` fields are stripped from the output so they are not stored in the DB.
 *
 * - created: teams where neither team-id nor any player-id collided
 * - remapped: teams where at least one ID (team or player) was regenerated
 */
export function importCustomTeams(
  json: string,
  existingTeams: CustomTeamDoc[],
  factories?: ImportIdFactories,
): ImportCustomTeamsResult {
  const parsed = parseExportedCustomTeams(json);
  const makeTeamId =
    factories?.makeTeamId ?? (() => `ct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const makePlayerId =
    factories?.makePlayerId ?? (() => `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  const existingTeamIds = new Set(existingTeams.map((t) => t.id));
  const existingPlayerIds = new Set(
    existingTeams.flatMap((t) => [
      ...t.roster.lineup.map((p) => p.id),
      ...t.roster.bench.map((p) => p.id),
      ...t.roster.pitchers.map((p) => p.id),
    ]),
  );
  const existingFingerprints = new Map(
    existingTeams.map((t) => [t.fingerprint ?? buildTeamFingerprint(t), t.name]),
  );

  let created = 0;
  let remapped = 0;
  const duplicateWarnings: string[] = [];

  const resultTeams = parsed.payload.teams.map((team) => {
    let finalTeam = { ...team };
    let anyIdCollision = false;

    if (existingTeamIds.has(finalTeam.id)) {
      finalTeam = { ...finalTeam, id: makeTeamId() };
      anyIdCollision = true;
    }

    const lineupResult = remapPlayerIds(finalTeam.roster.lineup, existingPlayerIds, makePlayerId);
    const benchResult = remapPlayerIds(
      finalTeam.roster.bench ?? [],
      existingPlayerIds,
      makePlayerId,
    );
    const pitchersResult = remapPlayerIds(
      finalTeam.roster.pitchers ?? [],
      existingPlayerIds,
      makePlayerId,
    );

    if (lineupResult.hadCollision || benchResult.hadCollision || pitchersResult.hadCollision) {
      anyIdCollision = true;
    }

    finalTeam = {
      ...finalTeam,
      roster: {
        ...finalTeam.roster,
        lineup: lineupResult.players,
        bench: benchResult.players,
        pitchers: pitchersResult.players,
      },
    };

    if (anyIdCollision) {
      remapped++;
    } else {
      created++;
    }

    finalTeam = { ...finalTeam, fingerprint: buildTeamFingerprint(finalTeam) };

    if (existingFingerprints.has(finalTeam.fingerprint)) {
      duplicateWarnings.push(`A team named "${finalTeam.name}" may already exist locally.`);
    }

    // Strip player sigs before returning — they are export-only integrity metadata.
    return stripTeamPlayerSigs(finalTeam);
  });

  return { teams: resultTeams, created, remapped, duplicateWarnings };
}


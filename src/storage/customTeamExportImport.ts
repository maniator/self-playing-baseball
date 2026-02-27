import { generatePlayerId, generateTeamId } from "./generateId";
import { fnv1a } from "./hash";
import type { CustomTeamDoc, ExportedCustomTeams, TeamPlayer } from "./types";

export const CUSTOM_TEAM_EXPORT_FORMAT_VERSION = 1 as const;
/** Signing key for custom-teams exports — change alongside CUSTOM_TEAM_EXPORT_FORMAT_VERSION. */
export const TEAMS_EXPORT_KEY = "ballgame:teams:v1";

/** `TeamPlayer` carrying the export-only `sig` field before it is stripped for DB storage. */
type TeamPlayerWithSig = TeamPlayer & { sig?: string };

export interface ImportCustomTeamsResult {
  teams: CustomTeamDoc[];
  created: number;
  remapped: number;
  /** Team-level duplicate warnings (same team fingerprint already in DB). */
  duplicateWarnings: string[];
  /**
   * Player-level duplicate warnings. Populated when an imported player's signature
   * matches a player already stored in the local DB, indicating the player may already
   * exist. The UI should surface these so the user can review before accepting the import.
   */
  duplicatePlayerWarnings: string[];
}

/**
 * Builds a stable content fingerprint for a team (excludes id so it survives re-import).
 * Used both for team-level duplicate detection and as the anchor for per-player sigs.
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
 * fingerprint. Covers the player's stable identity fields (id, role, batting, pitching,
 * position, handedness, jerseyNumber, pitchingRole) — name is intentionally excluded
 * because the team fingerprint already tracks lineup names for duplicate detection.
 *
 * The player sig serves two purposes:
 *   1. Tamper detection: any post-export mutation of these fields is detectable on import.
 *   2. Duplicate detection: a player whose sig matches a player already in the DB is likely
 *      a duplicate and the user should be prompted before the import proceeds.
 */
export function buildPlayerSig(teamFingerprint: string, player: TeamPlayer): string {
  const { id, role, batting, pitching, position, handedness, jerseyNumber, pitchingRole } = player;
  return fnv1a(
    teamFingerprint +
      JSON.stringify({
        id,
        role,
        batting,
        pitching,
        position,
        handedness,
        jerseyNumber,
        pitchingRole,
      }),
  );
}

/** Returns a copy of `player` with its `sig` field stripped (export-only metadata). */
function stripPlayerSig(player: TeamPlayer): TeamPlayer {
  if (!("sig" in player)) return player;

  const { sig: _sig, ...rest } = player as TeamPlayer & { sig?: string };
  return rest as TeamPlayer;
}

/** Returns a team doc with all player `sig` fields removed from every roster slot. */
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

/** Attaches a `sig` to every player in `players` using the team fingerprint. */
function signPlayers(players: TeamPlayer[], teamFingerprint: string): TeamPlayer[] {
  return players.map((p) => ({ ...stripPlayerSig(p), sig: buildPlayerSig(teamFingerprint, p) }));
}

/**
 * Serialises teams into a portable signed JSON string.
 *
 * Signing order (important — bundle sig must cover player sigs):
 *   1. Compute each team's fingerprint.
 *   2. Compute per-player sigs using the team fingerprint.
 *   3. Compute the bundle-level sig over the whole payload (which now includes player sigs).
 */
export function exportCustomTeams(teams: CustomTeamDoc[]): string {
  const signedTeams = teams.map((team) => {
    const fingerprint = buildTeamFingerprint(team);
    return {
      ...team,
      fingerprint, // always embed so import can verify player sigs
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
 * Parses and validates a custom-teams export JSON string.
 * Performs checks in order: (1) structural validation, (2) bundle-level FNV-1a
 * signature, (3) per-player signatures. Throws a descriptive error on any failure.
 */
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

  // ── Structural validation ──────────────────────────────────────────────────
  (payload["teams"] as unknown[]).forEach((t, i) => {
    if (!t || typeof t !== "object") throw new Error(`Team[${i}] is not an object`);
    const team = t as Record<string, unknown>;
    if (typeof team["id"] !== "string" || !team["id"])
      throw new Error(`Team[${i}] missing required field: id`);
    if (typeof team["name"] !== "string" || !team["name"])
      throw new Error(`Team[${i}] missing required field: name`);
    if (typeof team["source"] !== "string")
      throw new Error(`Team[${i}] missing required field: source`);
    if (typeof team["fingerprint"] !== "string" || !team["fingerprint"])
      throw new Error(`Team[${i}] missing fingerprint — file may be from an incompatible version`);
    if (!team["roster"] || typeof team["roster"] !== "object")
      throw new Error(`Team[${i}] missing required field: roster`);
    const roster = team["roster"] as Record<string, unknown>;
    if (!Array.isArray(roster["lineup"]) || (roster["lineup"] as unknown[]).length === 0)
      throw new Error(`Team[${i}] roster.lineup must be a non-empty array`);
  });

  // ── 1. Bundle signature ────────────────────────────────────────────────────
  const expectedBundleSig = fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(obj["payload"]));
  if (typeof obj["sig"] !== "string" || obj["sig"] !== expectedBundleSig)
    throw new Error(
      "Teams signature mismatch — file may be corrupted or not a valid Ballgame teams export",
    );

  // ── 2. Per-player signatures ───────────────────────────────────────────────
  (payload["teams"] as Record<string, unknown>[]).forEach((team, ti) => {
    const fingerprint = team["fingerprint"] as string;
    const roster = team["roster"] as Record<string, unknown>;
    (["lineup", "bench", "pitchers"] as const).forEach((slot) => {
      ((roster[slot] ?? []) as TeamPlayerWithSig[]).forEach((player, pi) => {
        const expectedPlayerSig = buildPlayerSig(fingerprint, player);
        if (player.sig !== expectedPlayerSig) {
          throw new Error(
            `Team[${ti}] ${slot}[${pi}] player signature mismatch — ` +
              `player data may have been tampered with after export`,
          );
        }
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
 * Merges incoming teams into the local collection.
 *
 * - ID collisions (team or player): remapped silently with new IDs.
 * - Team fingerprint matches: reported in `duplicateWarnings`.
 * - Player sig matches: reported in `duplicatePlayerWarnings` so the UI can prompt the user.
 * - Player `sig` fields are stripped from the output so they are not stored in the DB.
 */
export function importCustomTeams(
  json: string,
  existingTeams: CustomTeamDoc[],
  factories?: ImportIdFactories,
): ImportCustomTeamsResult {
  const parsed = parseExportedCustomTeams(json);
  const makeTeamId = factories?.makeTeamId ?? generateTeamId;
  const makePlayerId = factories?.makePlayerId ?? generatePlayerId;

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

  // Pre-compute player sigs for all existing players so we can detect duplicates.
  const existingPlayerSigs = new Set<string>();
  for (const t of existingTeams) {
    const fp = t.fingerprint ?? buildTeamFingerprint(t);
    for (const p of [...t.roster.lineup, ...t.roster.bench, ...t.roster.pitchers]) {
      existingPlayerSigs.add(buildPlayerSig(fp, p));
    }
  }

  let created = 0;
  let remapped = 0;
  const duplicateWarnings: string[] = [];
  const duplicatePlayerWarnings: string[] = [];

  const resultTeams = parsed.payload.teams.map((team) => {
    let finalTeam = { ...team };
    let anyIdCollision = false;

    // ── Duplicate player detection (before ID remapping, using sigs from export) ──
    const teamFp = team.fingerprint ?? buildTeamFingerprint(team as CustomTeamDoc);
    const allSlotPlayers: { player: TeamPlayer; slot: string }[] = [
      ...team.roster.lineup.map((p) => ({ player: p, slot: "lineup" })),
      ...(team.roster.bench ?? []).map((p) => ({ player: p, slot: "bench" })),
      ...(team.roster.pitchers ?? []).map((p) => ({ player: p, slot: "pitchers" })),
    ];
    for (const { player } of allSlotPlayers) {
      // Use the sig embedded in the export; fall back to computing it if absent.
      const pSig = (player as TeamPlayerWithSig).sig ?? buildPlayerSig(teamFp, player);
      if (existingPlayerSigs.has(pSig)) {
        duplicatePlayerWarnings.push(
          `Player "${player.name}" in "${team.name}" may already exist in your teams.`,
        );
      }
    }

    // ── Team ID collision ──────────────────────────────────────────────────────
    if (existingTeamIds.has(finalTeam.id)) {
      finalTeam = { ...finalTeam, id: makeTeamId() };
      anyIdCollision = true;
    }

    // ── Player ID collision ────────────────────────────────────────────────────
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

    // Strip player sigs — export-only integrity metadata, not stored in DB.
    return stripTeamPlayerSigs(finalTeam);
  });

  return { teams: resultTeams, created, remapped, duplicateWarnings, duplicatePlayerWarnings };
}

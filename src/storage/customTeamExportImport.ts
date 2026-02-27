import { generatePlayerId, generateTeamId } from "./generateId";
import { fnv1a } from "./hash";
import type { CustomTeamDoc, ExportedCustomTeams, TeamPlayer } from "./types";

export const CUSTOM_TEAM_EXPORT_FORMAT_VERSION = 1 as const;
/** Signing key for custom-teams exports — change alongside CUSTOM_TEAM_EXPORT_FORMAT_VERSION. */
export const TEAMS_EXPORT_KEY = "ballgame:teams:v1";

export const PLAYER_EXPORT_FORMAT_VERSION = 1 as const;
/** Signing key for individual-player exports. */
export const PLAYER_EXPORT_KEY = "ballgame:player:v1";

/** `TeamPlayer` carrying the export-only `sig` field before it is stripped for DB storage. */
type TeamPlayerWithSig = TeamPlayer & { sig?: string };

export interface ImportCustomTeamsResult {
  teams: CustomTeamDoc[];
  created: number;
  remapped: number;
  /**
   * Number of incoming teams that were exact fingerprint duplicates of an existing team
   * and were silently skipped (not imported) to prevent creating duplicate entries.
   */
  skipped: number;
  /** Team-level duplicate warnings (same team fingerprint already in DB). */
  duplicateWarnings: string[];
  /**
   * Player-level duplicate warnings. Populated when an imported player's signature
   * matches a player already stored in the local DB, indicating the player may already
   * exist. The UI should surface these so the user can review before accepting the import.
   */
  duplicatePlayerWarnings: string[];
  /**
   * When true the import was blocked because one or more players in the incoming
   * bundle already exist in the local DB (by content fingerprint).
   * The caller should prompt the user to confirm before re-trying with
   * `options.allowDuplicatePlayers = true` to proceed despite the duplicates.
   */
  requiresDuplicateConfirmation: boolean;
}

/**
 * Builds a stable seed-based fingerprint for a team (excludes id so it survives re-import).
 * Covers only team-identity fields (name + abbreviation, case-insensitive) plus the
 * per-team random seed generated at creation time.
 * Roster changes do NOT affect the fingerprint — the same team remains the same
 * fingerprint after trades, roster edits, or any player moves.
 * Used for team-level duplicate detection on import.
 * The `teamSeed ?? ""` fallback ensures legacy bundles without a seed still parse cleanly.
 */
export function buildTeamFingerprint(
  team: Pick<CustomTeamDoc, "name" | "abbreviation" | "teamSeed">,
): string {
  const seed = team.teamSeed ?? "";
  const key = team.name.toLowerCase() + "|" + (team.abbreviation ?? "").toLowerCase();
  return fnv1a(seed + key);
}

/**
 * Computes a seed-based integrity signature for a single player.
 * Covers only the player's immutable identity fields: name, role, and stats
 * (batting for hitters; pitching for pitchers), plus the per-player random seed
 * generated at creation time.
 *
 * Design notes:
 *   - `id` is intentionally excluded: IDs are remapped on import collision and must
 *     not affect duplicate detection — two players with identical stats and name but
 *     different DB IDs are the same person.
 *   - `position`, `handedness`, `jerseyNumber`, `pitchingRole` are intentionally excluded:
 *     these are editable after creation and must not invalidate a previously issued sig.
 *   - For pure hitters `pitching` is `undefined`. `JSON.stringify` omits `undefined` values
 *     consistently on both the export side and the re-import side, so the sig is
 *     deterministic across round-trips with no special normalisation needed.
 *   - `playerSeed ?? ""` fallback ensures legacy bundles without a seed still parse cleanly.
 *
 * The sig serves two purposes:
 *   1. Tamper detection: any post-export mutation of name or stats is detectable on import.
 *   2. Duplicate detection: a player whose sig matches one already in the DB is a likely
 *      duplicate even if imported to a different team or with a remapped ID.
 */
export function buildPlayerSig(
  player: Pick<TeamPlayer, "name" | "role" | "batting" | "pitching" | "playerSeed">,
): string {
  const seed = player.playerSeed ?? "";
  const { name, role, batting, pitching } = player;
  return fnv1a(seed + JSON.stringify({ name, role, batting, pitching }));
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

/** Attaches a `sig` to every player in `players`. */
function signPlayers(players: TeamPlayer[]): TeamPlayer[] {
  return players.map((p) => ({ ...stripPlayerSig(p), sig: buildPlayerSig(p) }));
}

/**
 * Serializes teams into a portable signed JSON string.
 *
 * Signing order (important — bundle sig must cover player sigs):
 *   1. Compute each team's fingerprint.
 *   2. Compute per-player sigs over immutable player identity fields (name, role, stats).
 *   3. Compute the bundle-level sig over the whole payload (which now includes player sigs).
 */
export function exportCustomTeams(teams: CustomTeamDoc[]): string {
  const signedTeams = teams.map((team) => {
    const fingerprint = buildTeamFingerprint(team);
    return {
      ...team,
      fingerprint, // always embed for team-level duplicate detection on import
      roster: {
        ...team.roster,
        lineup: signPlayers(team.roster.lineup),
        bench: signPlayers(team.roster.bench),
        pitchers: signPlayers(team.roster.pitchers),
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
    // fingerprint is optional for legacy files (pre-v2 exports without fingerprints)
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
    const roster = team["roster"] as Record<string, unknown>;
    (["lineup", "bench", "pitchers"] as const).forEach((slot) => {
      const slotValue = roster[slot] ?? [];
      if (!Array.isArray(slotValue)) {
        throw new Error(`Team[${ti}] roster.${slot} is not an array — file may be malformed`);
      }
      (slotValue as TeamPlayerWithSig[]).forEach((player, pi) => {
        // Skip sig validation for legacy files that pre-date per-player signatures.
        if (player.sig === undefined) return;
        const expectedPlayerSig = buildPlayerSig(player);
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
    // Mark as in-use so later slots in the same team cannot reuse this ID,
    // preventing intra-team cross-slot duplicate player IDs after import.
    existingPlayerIds.add(p.id);
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

export interface ImportCustomTeamsOptions {
  /**
   * When true, imports teams even if some players already exist in the local DB.
   * When false (the default), the import is blocked and `requiresDuplicateConfirmation`
   * is set to true so the caller can prompt the user for confirmation.
   */
  allowDuplicatePlayers?: boolean;
}

/**
 * Merges incoming teams into the local collection.
 *
 * - ID collisions (team or player): remapped silently with new IDs.
 * - Team fingerprint matches: reported in `duplicateWarnings`.
 * - Player sig matches: reported in `duplicatePlayerWarnings` so the UI can prompt the user.
 * - Player `sig` fields are stripped from the output so they are not stored in the DB.
 * - When `options.allowDuplicatePlayers` is false (the default) and duplicate players are
 *   found, the import is blocked: `teams` is empty and `requiresDuplicateConfirmation` is
 *   true. Re-call with `{ allowDuplicatePlayers: true }` after the user confirms.
 *
 * **Legacy bundle limitation:** Players in legacy export bundles (pre-v2, no per-player `sig`
 * or `playerSeed`) fall back to `buildPlayerSig(player)` with an empty-string seed, which
 * produces a different hash than the same player already stored in the DB (which has a
 * non-empty `playerSeed`).  As a result, duplicate detection silently misses duplicates for
 * legacy imports.  This is intentional — legacy files lack the seed needed to reproduce the
 * stored fingerprint — and is documented here so callers are aware of the limitation.
 */
export function importCustomTeams(
  json: string,
  existingTeams: CustomTeamDoc[],
  factories?: ImportIdFactories,
  options?: ImportCustomTeamsOptions,
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
    for (const p of [...t.roster.lineup, ...t.roster.bench, ...t.roster.pitchers]) {
      existingPlayerSigs.add(buildPlayerSig(p));
    }
  }

  // ── Pre-scan: detect duplicate players in non-fingerprint-skipped teams ────
  // If any are found and the caller hasn't opted in to allowing duplicates,
  // block the import and require an explicit confirmation from the user.
  const allowDuplicates = options?.allowDuplicatePlayers ?? false;
  const preScanWarnings: string[] = [];
  let preScanSkipped = 0;

  for (const team of parsed.payload.teams) {
    const incomingFp = team.fingerprint ?? buildTeamFingerprint(team as CustomTeamDoc);
    if (existingFingerprints.has(incomingFp)) {
      preScanSkipped++;
      continue;
    }
    const allPlayers = [
      ...team.roster.lineup.map((p) => ({ player: p })),
      ...(team.roster.bench ?? []).map((p) => ({ player: p })),
      ...(team.roster.pitchers ?? []).map((p) => ({ player: p })),
    ];
    for (const { player } of allPlayers) {
      const pSig = (player as TeamPlayerWithSig).sig ?? buildPlayerSig(player);
      if (existingPlayerSigs.has(pSig)) {
        preScanWarnings.push(
          `Player "${player.name}" in "${team.name}" may already exist in your teams.`,
        );
      }
    }
  }

  if (preScanWarnings.length > 0 && !allowDuplicates) {
    return {
      teams: [],
      created: 0,
      remapped: 0,
      skipped: preScanSkipped,
      duplicateWarnings: [],
      duplicatePlayerWarnings: preScanWarnings,
      requiresDuplicateConfirmation: true,
    };
  }

  let created = 0;
  let remapped = 0;
  let skipped = 0;
  const duplicateWarnings: string[] = [];
  const duplicatePlayerWarnings: string[] = [];

  const resultTeams: CustomTeamDoc[] = [];

  for (const team of parsed.payload.teams) {
    // ── Early exact-duplicate check ────────────────────────────────────────────
    // If the incoming team's content fingerprint already exists locally, skip it
    // entirely to prevent creating a duplicate entry. The fingerprint is content-
    // based (name + abbreviation + sorted lineup names) so it is stable across
    // re-exports regardless of stored team ID.
    const incomingFp = team.fingerprint ?? buildTeamFingerprint(team as CustomTeamDoc);
    if (existingFingerprints.has(incomingFp)) {
      skipped++;
      continue;
    }

    let finalTeam = { ...team };
    let anyIdCollision = false;

    // ── Duplicate player detection (before ID remapping, using sigs from export) ──
    const allSlotPlayers: { player: TeamPlayer; slot: string }[] = [
      ...team.roster.lineup.map((p) => ({ player: p, slot: "lineup" })),
      ...(team.roster.bench ?? []).map((p) => ({ player: p, slot: "bench" })),
      ...(team.roster.pitchers ?? []).map((p) => ({ player: p, slot: "pitchers" })),
    ];
    for (const { player } of allSlotPlayers) {
      // Use the sig embedded in the export; fall back to computing it if absent.
      const pSig = (player as TeamPlayerWithSig).sig ?? buildPlayerSig(player);
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

    // Strip player sigs — export-only integrity metadata, not stored in DB.
    resultTeams.push(stripTeamPlayerSigs(finalTeam));
  }

  return {
    teams: resultTeams,
    created,
    remapped,
    skipped,
    duplicateWarnings,
    duplicatePlayerWarnings,
    requiresDuplicateConfirmation: false,
  };
}

/**
 * Serializes a single player into a portable signed JSON string.
 * The player gets a `sig` field covering its immutable identity fields, and
 * the bundle gets its own FNV-1a signature so tampering is detectable on import.
 */
export function exportCustomPlayer(player: TeamPlayer): string {
  const playerWithSig: TeamPlayer & { sig: string } = {
    ...stripPlayerSig(player),
    sig: buildPlayerSig(player),
  };
  const payload = { player: playerWithSig };
  const sig = fnv1a(PLAYER_EXPORT_KEY + JSON.stringify(payload));
  const bundle = {
    type: "customPlayer" as const,
    formatVersion: PLAYER_EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    payload,
    sig,
  };
  return JSON.stringify(bundle, null, 2);
}

/**
 * Parses and validates a single-player export JSON string.
 * Verifies both the bundle-level FNV-1a signature and the per-player content
 * signature. Throws a descriptive error on any validation failure.
 * Returns the player with `sig` stripped (not stored in DB).
 */
export function parseExportedCustomPlayer(json: string): TeamPlayer {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON: could not parse player file");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid player file: not an object");
  const obj = parsed as Record<string, unknown>;

  if (obj["type"] !== "customPlayer")
    throw new Error(
      `Invalid player file: expected type "customPlayer", got "${obj["type"] as string}"`,
    );
  if (obj["formatVersion"] !== 1)
    throw new Error(`Unsupported player format version: ${obj["formatVersion"] as number}`);
  if (!obj["payload"] || typeof obj["payload"] !== "object")
    throw new Error("Invalid player file: missing payload");

  const payload = obj["payload"] as Record<string, unknown>;
  if (!payload["player"] || typeof payload["player"] !== "object")
    throw new Error("Invalid player file: missing payload.player");

  const playerObj = payload["player"] as Record<string, unknown>;
  if (typeof playerObj["id"] !== "string" || !playerObj["id"])
    throw new Error("Invalid player file: missing required field: id");
  if (typeof playerObj["name"] !== "string" || !playerObj["name"])
    throw new Error("Invalid player file: missing required field: name");
  if (typeof playerObj["role"] !== "string")
    throw new Error("Invalid player file: missing required field: role");
  if (!playerObj["batting"] || typeof playerObj["batting"] !== "object")
    throw new Error("Invalid player file: missing required field: batting");

  // ── Bundle signature ───────────────────────────────────────────────────────
  const expectedBundleSig = fnv1a(PLAYER_EXPORT_KEY + JSON.stringify(obj["payload"]));
  if (typeof obj["sig"] !== "string" || obj["sig"] !== expectedBundleSig)
    throw new Error(
      "Player signature mismatch — file may be corrupted or not a valid Ballgame player export",
    );

  // ── Per-player content signature ───────────────────────────────────────────
  const player = payload["player"] as TeamPlayer & { sig?: string };
  const expectedPlayerSig = buildPlayerSig(player);
  if (player.sig !== expectedPlayerSig)
    throw new Error("Player content signature mismatch — player data may have been tampered with");

  // Return the player with `sig` stripped — export-only metadata, not stored in DB.
  return stripPlayerSig(player);
}

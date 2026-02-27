import type { CustomTeamDoc, ExportedCustomTeams, TeamPlayer } from "./types";

// FNV-1a 32-bit hash — same algorithm as saveStore (integrity only, not crypto).
const fnv1a = (str: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
};

export const CUSTOM_TEAM_EXPORT_FORMAT_VERSION = 1 as const;

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

/** Serialises an array of CustomTeamDoc objects into a portable JSON string. */
export function exportCustomTeams(teams: CustomTeamDoc[]): string {
  const bundle: ExportedCustomTeams = {
    type: "customTeams",
    formatVersion: CUSTOM_TEAM_EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    payload: { teams },
  };
  return JSON.stringify(bundle, null, 2);
}

/** Parses and validates a custom-teams export JSON string. Throws on malformed input. */
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

/**
 * Merges incoming teams into the local collection, remapping IDs on collision
 * and flagging potential duplicates via fingerprint matching.
 *
 * - created: teams where neither team-id nor any player-id collided
 * - remapped: teams where at least one ID (team or player) was regenerated
 */
export function importCustomTeams(
  json: string,
  existingTeams: CustomTeamDoc[],
  idFactory?: () => string,
): ImportCustomTeamsResult {
  const parsed = parseExportedCustomTeams(json);
  const makeId = idFactory ?? (() => `ct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

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
      finalTeam = { ...finalTeam, id: makeId() };
      anyIdCollision = true;
    }

    const lineupResult = remapPlayerIds(finalTeam.roster.lineup, existingPlayerIds, makeId);
    const benchResult = remapPlayerIds(finalTeam.roster.bench ?? [], existingPlayerIds, makeId);
    const pitchersResult = remapPlayerIds(
      finalTeam.roster.pitchers ?? [],
      existingPlayerIds,
      makeId,
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

    return finalTeam;
  });

  return { teams: resultTeams, created, remapped, duplicateWarnings };
}

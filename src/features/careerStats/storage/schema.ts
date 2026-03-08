import type { RxJsonSchema } from "rxdb";

import { fnv1a } from "@storage/hash";
import type { GameDoc, PitcherGameStatDoc, PlayerDoc, PlayerGameStatDoc } from "@storage/types";
import { appLog } from "@utils/logger";

const playersSchema: RxJsonSchema<PlayerDoc> = {
  // Version 2: scopes the primary key to `${teamId}:${player.id}` to prevent cross-team
  // collisions when two teams contain a player with the same original ID (e.g. from
  // manually-crafted import JSON). A new `playerId` field stores the original player ID
  // so roster assembly can reconstruct the correct `TeamPlayer.id`.
  // Migration v1→v2 computes the composite ID from the existing `teamId` field.
  //
  // Version 3: adds `globalPlayerId` — a team-independent stable identity derived from
  // `playerSeed` as `"pl_" + fnv1a(playerSeed)`. Used as `playerKey` in PlayerGameStatDoc
  // so career stats follow a player across team moves and imports.
  // Migration v2→v3 backfills `globalPlayerId` from the existing `playerSeed` field.
  //
  // Version 4: adds an index on `globalPlayerId` so cross-team duplicate checks in
  // importPlayer resolve in one index scan instead of a full roster hydration of all teams.
  // Migration v3→v4 is a defensive identity pass that also ensures every doc has
  // `globalPlayerId` (safety net for any doc that somehow missed the v2→v3 backfill).
  version: 4,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 256 },
    /** Original player ID (TeamPlayer.id). The primary key `id` is `${teamId}:${playerId}`. */
    playerId: { type: "string", maxLength: 128 },
    teamId: { type: ["string", "null"] },
    section: { type: "string", enum: ["lineup", "bench", "pitchers"], maxLength: 16 },
    orderIndex: { type: "number", minimum: 0, maximum: 9999, multipleOf: 1 },
    name: { type: "string" },
    role: { type: "string" },
    batting: { type: "object", additionalProperties: true },
    pitching: { type: "object", additionalProperties: true },
    position: { type: "string" },
    handedness: { type: "string" },
    isBenchEligible: { type: "boolean" },
    isPitcherEligible: { type: "boolean" },
    jerseyNumber: { type: ["number", "null"] },
    pitchingRole: { type: "string" },
    playerSeed: { type: "string", maxLength: 32 },
    fingerprint: { type: "string", maxLength: 8 },
    globalPlayerId: { type: "string", maxLength: 32 },
    schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
  },
  required: [
    "id",
    "section",
    "orderIndex",
    "name",
    "role",
    "batting",
    "schemaVersion",
    "globalPlayerId",
  ],
  // No index on teamId: RxDB 17 beta cannot compute index strings for nullable union types
  // (`type: ["string", "null"]`). Full collection scans are acceptable for the small
  // roster sizes (≤25 players per team) typical of this app.
  // globalPlayerId is indexed so importPlayer can resolve cross-team conflicts in one
  // DB round-trip without hydrating every team's roster.
  indexes: ["globalPlayerId"],
};

const gamesSchema: RxJsonSchema<GameDoc> = {
  // Version 1: added optional committedBySaveId field for debug traceability.
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    playedAt: { type: "number", minimum: 0, maximum: 9_999_999_999_999, multipleOf: 1 },
    seed: { type: "string" },
    rngState: { type: ["number", "null"] },
    homeTeamId: { type: "string", maxLength: 128 },
    awayTeamId: { type: "string", maxLength: 128 },
    homeScore: { type: "number", minimum: 0, maximum: 9999, multipleOf: 1 },
    awayScore: { type: "number", minimum: 0, maximum: 9999, multipleOf: 1 },
    innings: { type: "number", minimum: 1, maximum: 999, multipleOf: 1 },
    committedBySaveId: { type: "string" },
    schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
  },
  required: [
    "id",
    "playedAt",
    "seed",
    "rngState",
    "homeTeamId",
    "awayTeamId",
    "homeScore",
    "awayScore",
    "innings",
    "schemaVersion",
  ],
  indexes: ["playedAt", ["homeTeamId", "playedAt"], ["awayTeamId", "playedAt"]],
};

const playerGameStatsSchema: RxJsonSchema<PlayerGameStatDoc> = {
  // Version 0: initial schema.
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 256 },
    gameId: { type: "string", maxLength: 128 },
    teamId: { type: "string", maxLength: 128 },
    opponentTeamId: { type: "string", maxLength: 128 },
    playerKey: { type: "string", maxLength: 256 },
    playerId: { type: "string" },
    nameAtGameTime: { type: "string" },
    role: { type: "string", enum: ["batter", "pitcher"], maxLength: 8 },
    batting: { type: "object", additionalProperties: true },
    createdAt: { type: "number", minimum: 0, maximum: 9_999_999_999_999, multipleOf: 1 },
    schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
  },
  required: [
    "id",
    "gameId",
    "teamId",
    "opponentTeamId",
    "playerKey",
    "playerId",
    "nameAtGameTime",
    "role",
    "batting",
    "createdAt",
    "schemaVersion",
  ],
  indexes: ["gameId", ["playerKey", "createdAt"], ["teamId", "createdAt"]],
};

const pitcherGameStatsSchema: RxJsonSchema<PitcherGameStatDoc> = {
  // Version 1: added pitchesThrown field.
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 256 },
    gameId: { type: "string", maxLength: 128 },
    teamId: { type: "string", maxLength: 128 },
    opponentTeamId: { type: "string", maxLength: 128 },
    pitcherKey: { type: "string", maxLength: 256 },
    pitcherId: { type: "string" },
    nameAtGameTime: { type: "string" },
    outsPitched: { type: "number", minimum: 0, maximum: 99999, multipleOf: 1 },
    battersFaced: { type: "number", minimum: 0, maximum: 99999, multipleOf: 1 },
    pitchesThrown: { type: "number", minimum: 0, maximum: 99999, multipleOf: 1 },
    hitsAllowed: { type: "number", minimum: 0, maximum: 99999, multipleOf: 1 },
    walksAllowed: { type: "number", minimum: 0, maximum: 99999, multipleOf: 1 },
    strikeoutsRecorded: { type: "number", minimum: 0, maximum: 99999, multipleOf: 1 },
    homersAllowed: { type: "number", minimum: 0, maximum: 99999, multipleOf: 1 },
    runsAllowed: { type: "number", minimum: 0, maximum: 99999, multipleOf: 1 },
    earnedRuns: { type: "number", minimum: 0, maximum: 99999, multipleOf: 1 },
    saves: { type: "number", minimum: 0, maximum: 9999, multipleOf: 1 },
    holds: { type: "number", minimum: 0, maximum: 9999, multipleOf: 1 },
    blownSaves: { type: "number", minimum: 0, maximum: 9999, multipleOf: 1 },
    createdAt: { type: "number", minimum: 0, maximum: 9_999_999_999_999, multipleOf: 1 },
    schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
  },
  required: [
    "id",
    "gameId",
    "teamId",
    "opponentTeamId",
    "pitcherKey",
    "pitcherId",
    "nameAtGameTime",
    "outsPitched",
    "battersFaced",
    "pitchesThrown",
    "hitsAllowed",
    "walksAllowed",
    "strikeoutsRecorded",
    "homersAllowed",
    "runsAllowed",
    "earnedRuns",
    "saves",
    "holds",
    "blownSaves",
    "createdAt",
    "schemaVersion",
  ],
  indexes: ["gameId", ["pitcherKey", "createdAt"], ["teamId", "createdAt"]],
};

export const playersCollectionConfig = {
  schema: playersSchema,
  migrationStrategies: {
    // v0→v1: teamId is now optional (nullable). Existing docs already have a
    // valid non-null teamId string so this is a safe identity migration.
    1: (oldDoc: Record<string, unknown>) => oldDoc,
    // v1→v2: scope the primary key as `${teamId}:${playerId}` to prevent
    // cross-team collisions when two teams share a player ID (e.g. from
    // manually-crafted import JSON). A new `playerId` field records the
    // original player ID for roster reconstruction.
    // For free-agent docs (teamId = null), the composite form would be
    // meaningless, so their `id` is left unchanged. `playerId` is still
    // set so assembleRoster can reconstruct the correct TeamPlayer.id.
    2: (oldDoc: Record<string, unknown>) => {
      try {
        const teamId = oldDoc["teamId"] as string | null | undefined;
        const originalId = oldDoc["id"] as string;
        const newId = teamId ? `${teamId}:${originalId}` : originalId;
        return { ...oldDoc, id: newId, playerId: originalId };
      } catch (err) {
        // Migration must never throw — log the error and return the document unchanged
        // so the app can still start and user data is preserved as-is.
        appLog.warn(
          "[players v1→v2 migration] failed to compute composite key; returning doc unchanged:",
          err,
        );
        return oldDoc;
      }
    },
    // v2→v3: backfill globalPlayerId from playerSeed.
    // globalPlayerId = "pl_" + fnv1a(playerSeed) when playerSeed is available.
    // For players without playerSeed, derive a deterministic fallback from
    // stable existing fields so the same legacy doc always migrates to the
    // same globalPlayerId on every device/run.
    3: (oldDoc: Record<string, unknown>) => {
      try {
        const existing = oldDoc["globalPlayerId"] as string | undefined;
        if (existing) return oldDoc;
        const playerSeed = oldDoc["playerSeed"] as string | undefined;
        // Derive a deterministic fallback from the composite key and fingerprint
        // so re-running the migration on a different device yields the same result.
        const id = oldDoc["id"] as string | undefined;
        const playerId = oldDoc["playerId"] as string | undefined;
        const fingerprint = oldDoc["fingerprint"] as string | undefined;
        const deterministicBasis = `${id ?? ""}|${playerId ?? ""}|${fingerprint ?? ""}`;
        const seed = playerSeed ?? fnv1a(deterministicBasis);
        const globalPlayerId = `pl_${fnv1a(seed)}`;
        return { ...oldDoc, globalPlayerId };
      } catch {
        return oldDoc;
      }
    },
    // v3→v4: adds a globalPlayerId index (no structural change to documents).
    // Defensive safety pass: any doc that still lacks globalPlayerId (e.g.
    // imported from a bundle created before the v2→v3 migration applied)
    // gets the same deterministic backfill that v2→v3 would have applied.
    4: (oldDoc: Record<string, unknown>) => {
      try {
        if (oldDoc["globalPlayerId"]) return oldDoc;
        const playerSeed = oldDoc["playerSeed"] as string | undefined;
        const id = oldDoc["id"] as string | undefined;
        const playerId = oldDoc["playerId"] as string | undefined;
        const fingerprint = oldDoc["fingerprint"] as string | undefined;
        const deterministicBasis = `${id ?? ""}|${playerId ?? ""}|${fingerprint ?? ""}`;
        const seed = playerSeed ?? fnv1a(deterministicBasis);
        const globalPlayerId = `pl_${fnv1a(seed)}`;
        return { ...oldDoc, globalPlayerId };
      } catch {
        // Migration must never throw. Apply a best-effort deterministic fallback so the
        // required `globalPlayerId` field is always present in the migrated document.
        try {
          const basis = JSON.stringify(oldDoc ?? {});
          const fallbackSeed = fnv1a(basis);
          return { ...oldDoc, globalPlayerId: `pl_${fallbackSeed}` };
        } catch {
          // Derive a deterministic ID from whatever stable fields remain so
          // each doc gets a unique fallback rather than a shared constant.
          const safeDoc = oldDoc ?? {};
          const id = (safeDoc as Record<string, unknown>)["id"] as string | undefined;
          const playerId = (safeDoc as Record<string, unknown>)["playerId"] as string | undefined;
          const fingerprint = (safeDoc as Record<string, unknown>)["fingerprint"] as
            | string
            | undefined;
          const basis = `${id ?? ""}|${playerId ?? ""}|${fingerprint ?? ""}|${Object.keys(safeDoc)
            .sort()
            .join(",")}`;
          return { ...oldDoc, globalPlayerId: `pl_${fnv1a(basis)}` };
        }
      }
    },
  },
};

export const gamesCollectionConfig = {
  schema: gamesSchema,
  migrationStrategies: {
    // v0 → v1: added optional committedBySaveId field — identity migration is safe.
    1: (oldDoc: Record<string, unknown>) => oldDoc,
  },
};

export const playerGameStatsCollectionConfig = {
  schema: playerGameStatsSchema,
};

export const pitcherGameStatsCollectionConfig = {
  schema: pitcherGameStatsSchema,
  migrationStrategies: {
    // v0 → v1: backfill pitchesThrown = 0 for existing records (field did not exist).
    1: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, pitchesThrown: 0 }),
  },
};

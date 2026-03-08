/// <reference types="vite/client" />
import {
  addRxPlugin,
  createRxDatabase,
  removeRxDatabase,
  type RxCollection,
  type RxDatabase,
  RxError,
  type RxJsonSchema,
  type RxStorage,
} from "rxdb";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

import { appLog } from "@utils/logger";

import { fnv1a } from "./hash";
import type {
  CustomTeamDoc,
  EventDoc,
  GameDoc,
  PitcherGameStatDoc,
  PlayerDoc,
  PlayerGameStatDoc,
  SaveDoc,
} from "./types";

type DbCollections = {
  saves: RxCollection<SaveDoc>;
  events: RxCollection<EventDoc>;
  customTeams: RxCollection<CustomTeamDoc>;
  players: RxCollection<PlayerDoc>;
  games: RxCollection<GameDoc>;
  playerGameStats: RxCollection<PlayerGameStatDoc>;
  pitcherGameStats: RxCollection<PitcherGameStatDoc>;
};

export type BallgameDb = RxDatabase<DbCollections>;

const savesSchema: RxJsonSchema<SaveDoc> = {
  // Version 0: original schema with plain additionalProperties objects.
  // Version 1: explicit nested properties definitions for setup/snapshots.
  // Version 2: removed matchupMode (legacy field, never used for game restore).
  //   Migration drops the field; all other fields remain unchanged.
  version: 2,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    name: { type: "string" },
    seed: { type: "string" },
    homeTeamId: { type: "string" },
    awayTeamId: { type: "string" },
    createdAt: { type: "number", minimum: 0, maximum: 9_999_999_999_999, multipleOf: 1 },
    updatedAt: { type: "number", minimum: 0, maximum: 9_999_999_999_999, multipleOf: 1 },
    progressIdx: { type: "number", minimum: -1, maximum: 9_999_999, multipleOf: 1 },
    setup: {
      type: "object",
      additionalProperties: true,
      properties: {
        strategy: { type: "string" },
        managerMode: { type: "boolean" },
        homeTeam: { type: "string" },
        awayTeam: { type: "string" },
        playerOverrides: { type: "array" },
        lineupOrder: { type: "array" },
      },
    },
    scoreSnapshot: {
      type: "object",
      additionalProperties: true,
      properties: {
        away: { type: "number" },
        home: { type: "number" },
      },
    },
    inningSnapshot: {
      type: "object",
      additionalProperties: true,
      properties: {
        inning: { type: "number" },
        atBat: { type: "number" },
      },
    },
    /**
     * stateSnapshot: full game State blob + seeded PRNG state.
     * `state` is stored as an opaque object and backfilled via
     * `backfillRestoredState` on load to handle schema evolution.
     * `rngState` is null for saves predating PRNG persistence.
     */
    stateSnapshot: {
      type: "object",
      additionalProperties: true,
      properties: {
        state: { type: "object", additionalProperties: true },
        rngState: { type: ["number", "null"] },
      },
    },
    schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
  },
  required: [
    "id",
    "name",
    "seed",
    "homeTeamId",
    "awayTeamId",
    "createdAt",
    "updatedAt",
    "progressIdx",
    "setup",
    "schemaVersion",
  ],
  indexes: ["updatedAt"],
};

const eventsSchema: RxJsonSchema<EventDoc> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 256 },
    saveId: { type: "string", maxLength: 128 },
    idx: { type: "number", minimum: 0, maximum: 9_999_999, multipleOf: 1 },
    at: { type: "number", minimum: 0, maximum: 9_999_999, multipleOf: 1 },
    type: { type: "string" },
    payload: { type: "object", additionalProperties: true },
    ts: { type: "number", minimum: 0, maximum: 9_999_999_999_999, multipleOf: 1 },
    schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
  },
  required: ["id", "saveId", "idx", "at", "type", "payload", "ts", "schemaVersion"],
  indexes: ["saveId", ["saveId", "idx"]],
};

const customTeamsSchema: RxJsonSchema<CustomTeamDoc> = {
  // Version 1: formally declares `abbreviation` (was already stored as an additional
  // property) and `fingerprint` (new in the import/export stage — computed via FNV-1a
  // over name+abbreviation (case-insensitive), used for duplicate detection on import).
  // Both fields are optional so the identity migration is safe for all existing docs.
  //
  // Version 2: adds `fingerprint` to every player embedded in the roster.
  // Each player's fingerprint is a FNV-1a hash of {name, role, batting, pitching},
  // enabling O(1) global duplicate detection without re-reading all teams on every
  // check. Migration backfills fingerprints for all players in existing documents.
  //
  // Version 3: adds `teamSeed` and per-player `playerSeed` for instance-unique fingerprints.
  // Migration backfills random seeds for all existing docs and recomputes fingerprints.
  //
  // Version 4: adds `globalPlayerId` to every embedded roster player (for legacy teams
  // that haven't yet been migrated to the `players` collection and still carry roster arrays).
  // New teams store empty embedded arrays (players live in the `players` collection), so
  // this migration is mostly a safe no-op for them.
  version: 4,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
    // ISO 8601 timestamps — 32 chars is safe ("2024-01-01T00:00:00.000Z" = 24).
    createdAt: { type: "string", maxLength: 32 },
    updatedAt: { type: "string", maxLength: 32 },
    name: { type: "string", maxLength: 256 },
    /** 2–3 char compact label used by line score / scoreboard contexts (max 8 chars). */
    abbreviation: { type: "string", maxLength: 8 },
    nickname: { type: "string", maxLength: 256 },
    city: { type: "string", maxLength: 256 },
    slug: { type: "string", maxLength: 256 },
    source: { type: "string", enum: ["custom", "generated"], maxLength: 16 },
    roster: { type: "object", additionalProperties: true },
    metadata: { type: "object", additionalProperties: true },
    statsProfile: { type: "string", maxLength: 64 },
    /**
     * FNV-1a content fingerprint (8 hex chars) — used only for duplicate detection
     * on import.  NOT the primary identity key; `id` remains the primary key.
     * Computed by `buildTeamFingerprint` from `customTeamExportImport.ts`.
     */
    fingerprint: { type: "string", maxLength: 8 },
    /**
     * Random seed generated once at team creation. Stored permanently so the
     * fingerprint (fnv1a(teamSeed + name + abbreviation)) can be re-verified.
     * Absent on documents created before schema v3 — backfilled by v2→v3 migration.
     */
    teamSeed: { type: "string", maxLength: 32 },
  },
  required: [
    "id",
    "schemaVersion",
    "createdAt",
    "updatedAt",
    "name",
    "source",
    "roster",
    "metadata",
  ],
  indexes: ["updatedAt", "source"],
};

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

async function initDb(
  storage: RxStorage<unknown, unknown>,
  name = "ballgame",
): Promise<BallgameDb> {
  addRxPlugin(RxDBMigrationSchemaPlugin);

  const db = await createRxDatabase<DbCollections>({
    name,
    storage: storage as RxStorage<object, object>,
    multiInstance: false,
  });
  await db.addCollections({
    saves: {
      schema: savesSchema,
      migrationStrategies: {
        // Identity migration: all new schema fields were optional; existing
        // docs are already valid against the new schema.
        1: (oldDoc) => oldDoc,
        // Drop matchupMode (legacy field removed in v2). All other fields unchanged.
        2: (oldDoc: Record<string, unknown>) => {
          const { matchupMode: _drop, ...rest } = oldDoc;
          return rest;
        },
      },
    },
    events: { schema: eventsSchema },
    customTeams: {
      schema: customTeamsSchema,
      migrationStrategies: {
        // Identity migration: `abbreviation` and `fingerprint` are optional fields.
        // Existing docs without them remain valid; `fingerprint` will be computed
        // and stored on the next write (team update or import). No data loss.
        1: (oldDoc) => oldDoc,
        // Backfill player fingerprints: each player gets a persistent FNV-1a hash
        // covering {name, role, batting, pitching} so global duplicate detection
        // works without re-reading all teams on every query.
        // `fnv1a` is imported from `./hash` (already a db.ts dependency) so
        // the migration has no additional module dependencies.
        2: (oldDoc: Record<string, unknown>) => {
          try {
            const roster = oldDoc["roster"] as Record<string, unknown> | undefined;
            if (!roster || typeof roster !== "object") return oldDoc;

            const addFp = (player: unknown): unknown => {
              if (!player || typeof player !== "object") return player;
              const p = player as Record<string, unknown>;
              // Already fingerprinted — skip.
              if (p["fingerprint"]) return p;
              const fp = fnv1a(
                JSON.stringify({
                  name: p["name"],
                  role: p["role"],
                  batting: p["batting"],
                  pitching: p["pitching"],
                }),
              );
              return { ...p, fingerprint: fp };
            };

            return {
              ...oldDoc,
              roster: {
                ...roster,
                // Only fingerprint when the slot is an array; preserve any
                // existing non-array value to avoid accidental data loss.
                lineup: Array.isArray(roster["lineup"])
                  ? roster["lineup"].map(addFp)
                  : roster["lineup"],
                bench: Array.isArray(roster["bench"])
                  ? roster["bench"].map(addFp)
                  : roster["bench"],
                pitchers: Array.isArray(roster["pitchers"])
                  ? roster["pitchers"].map(addFp)
                  : roster["pitchers"],
              },
            };
          } catch {
            // Migration must never throw — return unchanged doc as a safe fallback.
            return oldDoc;
          }
        },
        // Backfill teamSeed and per-player playerSeed for seed-based instance fingerprints.
        // Uses Math.random()-derived seeds (~83 bits of entropy) because migration
        // strategies must be pure synchronous functions — they cannot `import` other
        // modules or call async APIs, so `generateSeed()` from `generateId.ts` (which
        // relies on `nanoid`) cannot be used here.
        3: (oldDoc: Record<string, unknown>) => {
          try {
            // Inline fallback seed generator — synchronous, no module dependencies.
            // Two Math.random() calls give ~18 base-36 chars: 12 chars (~62 bits)
            // plus 4 chars (~21 bits) ≈ 83 bits of entropy total,
            // which is sufficient for a migration backfill where CSPRNG is unavailable.
            const fallbackSeed = (): string =>
              Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 6);

            // Backfill teamSeed and recompute team fingerprint.
            const teamSeed = (oldDoc["teamSeed"] as string | undefined) ?? fallbackSeed();
            const teamFingerprint = fnv1a(
              teamSeed +
                ((oldDoc["name"] as string | undefined) ?? "").toLowerCase() +
                "|" +
                ((oldDoc["abbreviation"] as string | undefined) ?? "").toLowerCase(),
            );

            // Backfill playerSeed and recompute each player's fingerprint.
            const addSeed = (player: unknown): unknown => {
              if (!player || typeof player !== "object") return player;
              const p = player as Record<string, unknown>;
              const playerSeed = (p["playerSeed"] as string | undefined) ?? fallbackSeed();
              const { name, role, batting, pitching } = p as {
                name?: string;
                role?: string;
                batting?: Record<string, number>;
                pitching?: Record<string, number>;
              };
              const fingerprint = fnv1a(
                playerSeed + JSON.stringify({ name, role, batting, pitching }),
              );
              return { ...p, playerSeed, fingerprint };
            };

            const roster = oldDoc["roster"] as Record<string, unknown> | undefined;
            if (!roster || typeof roster !== "object") {
              return { ...oldDoc, teamSeed, fingerprint: teamFingerprint };
            }

            return {
              ...oldDoc,
              teamSeed,
              fingerprint: teamFingerprint,
              roster: {
                ...roster,
                lineup: Array.isArray(roster["lineup"])
                  ? roster["lineup"].map(addSeed)
                  : roster["lineup"],
                bench: Array.isArray(roster["bench"])
                  ? roster["bench"].map(addSeed)
                  : roster["bench"],
                pitchers: Array.isArray(roster["pitchers"])
                  ? roster["pitchers"].map(addSeed)
                  : roster["pitchers"],
              },
            };
          } catch {
            // Migration must never throw — return unchanged doc as a safe fallback.
            return oldDoc;
          }
        },
        // v3→v4: backfill globalPlayerId in embedded roster players.
        // New teams have empty embedded arrays so this is mostly a no-op; for
        // legacy teams whose rosters haven't yet migrated to the players collection
        // this ensures every player gets a stable globalPlayerId.
        4: (oldDoc: Record<string, unknown>) => {
          try {
            const roster = oldDoc["roster"] as Record<string, unknown> | undefined;
            if (!roster || typeof roster !== "object") return oldDoc;

            const addGlobalId = (player: unknown): unknown => {
              if (!player || typeof player !== "object") return player;
              const p = player as Record<string, unknown>;
              if (p["globalPlayerId"]) return p; // already has one
              const playerSeed = p["playerSeed"] as string | undefined;
              // Derive a deterministic fallback from stable fields so the same legacy
              // document always migrates to the same globalPlayerId on every device/run.
              const id = p["id"] as string | undefined;
              const fingerprint = p["fingerprint"] as string | undefined;
              const deterministicBasis = `${id ?? ""}|${fingerprint ?? ""}`;
              const seed = playerSeed ?? fnv1a(deterministicBasis);
              const globalPlayerId = `pl_${fnv1a(seed)}`;
              return { ...p, globalPlayerId };
            };

            const hasAnyPlayers =
              (Array.isArray(roster["lineup"]) && roster["lineup"].length > 0) ||
              (Array.isArray(roster["bench"]) && roster["bench"].length > 0) ||
              (Array.isArray(roster["pitchers"]) && roster["pitchers"].length > 0);

            if (!hasAnyPlayers) return oldDoc;

            return {
              ...oldDoc,
              roster: {
                ...roster,
                lineup: Array.isArray(roster["lineup"])
                  ? roster["lineup"].map(addGlobalId)
                  : roster["lineup"],
                bench: Array.isArray(roster["bench"])
                  ? roster["bench"].map(addGlobalId)
                  : roster["bench"],
                pitchers: Array.isArray(roster["pitchers"])
                  ? roster["pitchers"].map(addGlobalId)
                  : roster["pitchers"],
              },
            };
          } catch {
            return oldDoc;
          }
        },
      },
    },
    players: {
      schema: playersSchema,
      migrationStrategies: {
        // v0→v1: teamId is now optional (nullable). Existing docs already have a
        // valid non-null teamId string so this is a safe identity migration.
        1: (oldDoc) => oldDoc,
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
              const playerId = (safeDoc as Record<string, unknown>)["playerId"] as
                | string
                | undefined;
              const fingerprint = (safeDoc as Record<string, unknown>)["fingerprint"] as
                | string
                | undefined;
              const basis = `${id ?? ""}|${playerId ?? ""}|${fingerprint ?? ""}|${Object.keys(
                safeDoc,
              )
                .sort()
                .join(",")}`;
              return { ...oldDoc, globalPlayerId: `pl_${fnv1a(basis)}` };
            }
          }
        },
      },
    },
    games: {
      schema: gamesSchema,
      migrationStrategies: {
        // v0 → v1: added optional committedBySaveId field — identity migration is safe.
        1: (oldDoc: Record<string, unknown>) => oldDoc,
      },
    },
    playerGameStats: { schema: playerGameStatsSchema },
    pitcherGameStats: {
      schema: pitcherGameStatsSchema,
      migrationStrategies: {
        // v0 → v1: backfill pitchesThrown = 0 for existing records (field did not exist).
        1: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, pitchesThrown: 0 }),
      },
    },
  });
  return db;
}

let dbPromise: Promise<BallgameDb> | null = null;

/** True if the database was wiped and recreated during this session due to an init error. */
let dbWasReset = false;
/** Returns true if the database was reset during this session. */
export const wasDbReset = (): boolean => dbWasReset;

/**
 * Returns true when an error represents a migration failure:
 * - DB6: schema hash mismatch at the same version (schema changed without bumping version)
 * - DM4: migration strategy execution failed (strategy was run but returned an error)
 * Transient errors (quota exceeded, blocked IndexedDB, etc.) are NOT included so we
 * never silently wipe user data for non-schema faults.
 */
const isMigrationFailure = (err: unknown): boolean =>
  err instanceof RxError && (err.code === "DB6" || err.code === "DM4");

/** Returns the singleton IndexedDB-backed database instance (lazy-initialized). */
export const getDb = (): Promise<BallgameDb> => {
  if (!dbPromise) {
    dbPromise = initDb(getRxStorageDexie()).catch(async (err: unknown) => {
      // Only attempt recovery when migration itself failed — either a schema hash
      // mismatch (DB6) or a migration strategy execution error (DM4). All other
      // errors are rethrown so the app can surface the failure without silently
      // wiping user data.
      if (!isMigrationFailure(err)) throw err;

      appLog.warn("DB migration failed; resetting local database for recovery:", err);
      // Only mark the DB as reset if removal actually succeeds; if removal also
      // fails we still attempt a fresh init but don't show the reset notice.
      let resetSucceeded = false;
      try {
        await removeRxDatabase("ballgame", getRxStorageDexie());
        resetSucceeded = true;
      } catch (removalErr: unknown) {
        appLog.warn("DB removal also failed during recovery:", removalErr);
      }
      dbWasReset = resetSucceeded;
      return initDb(getRxStorageDexie());
    });
  }
  return dbPromise;
};

export const savesCollection = async (): Promise<RxCollection<SaveDoc>> => (await getDb()).saves;

export const eventsCollection = async (): Promise<RxCollection<EventDoc>> => (await getDb()).events;

export const customTeamsCollection = async (): Promise<RxCollection<CustomTeamDoc>> =>
  (await getDb()).customTeams;

export const playersCollection = async (): Promise<RxCollection<PlayerDoc>> =>
  (await getDb()).players;

export const gamesCollection = async (): Promise<RxCollection<GameDoc>> => (await getDb()).games;

export const playerGameStatsCollection = async (): Promise<RxCollection<PlayerGameStatDoc>> =>
  (await getDb()).playerGameStats;

export const pitcherGameStatsCollection = async (): Promise<RxCollection<PitcherGameStatDoc>> =>
  (await getDb()).pitcherGameStats;

/**
 * Creates a fresh database with the given storage — intended for tests only.
 * Uses a random name by default so concurrent test files sharing the same
 * in-memory RxDB storage never produce COL23 name collisions.
 * Callers are responsible for calling `db.close()` when finished.
 */
export const _createTestDb = (
  storage: RxStorage<unknown, unknown>,
  name = `ballgame_test_${Math.random().toString(36).slice(2, 14)}`,
): Promise<BallgameDb> => initDb(storage, name);

/**
 * Resets module-level singleton state so `getDb()` can be re-exercised in tests.
 * Call this in `afterEach` / `beforeEach` when testing the `getDb()` recovery path.
 */
export const _resetDbForTest = (): void => {
  dbPromise = null;
  dbWasReset = false;
};

/**
 * Exposes the internal `isMigrationFailure` predicate for unit testing.
 * Returns true for DB6 (schema hash mismatch) and DM4 (strategy execution
 * failure) RxErrors; false for all other error types.
 */
export const _isMigrationFailureForTest = (err: unknown): boolean => isMigrationFailure(err);

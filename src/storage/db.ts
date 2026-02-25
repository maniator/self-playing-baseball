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

import type { CustomTeamDoc, EventDoc, SaveDoc, TeamDoc } from "./types";

type DbCollections = {
  saves: RxCollection<SaveDoc>;
  events: RxCollection<EventDoc>;
  teams: RxCollection<TeamDoc>;
  customTeams: RxCollection<CustomTeamDoc>;
};

export type BallgameDb = RxDatabase<DbCollections>;

const savesSchema: RxJsonSchema<SaveDoc> = {
  // Stage 3B added explicit `properties` sub-definitions to the nested
  // `setup`, `scoreSnapshot`, `inningSnapshot`, and `stateSnapshot` fields
  // without bumping the version, causing a DB6 schema-hash mismatch for
  // users with existing data. Version bumped to 1; identity migration is
  // sufficient because all required fields were already present and
  // additionalProperties: true is retained on all changed sub-objects.
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    name: { type: "string" },
    seed: { type: "string" },
    matchupMode: { type: "string" },
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
    "matchupMode",
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

const teamsSchema: RxJsonSchema<TeamDoc> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 32 },
    numericId: { type: "number", minimum: 0, maximum: 999_999, multipleOf: 1 },
    name: { type: "string" },
    abbreviation: { type: "string" },
    league: { type: "string", enum: ["al", "nl"], maxLength: 2 },
    cachedAt: { type: "number", minimum: 0, maximum: 9_999_999_999_999, multipleOf: 1 },
    schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
  },
  required: ["id", "numericId", "name", "abbreviation", "league", "cachedAt", "schemaVersion"],
  indexes: ["league", "cachedAt"],
};

const customTeamsSchema: RxJsonSchema<CustomTeamDoc> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 128 },
    schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
    // ISO 8601 timestamps — 32 chars is safe ("2024-01-01T00:00:00.000Z" = 24).
    createdAt: { type: "string", maxLength: 32 },
    updatedAt: { type: "string", maxLength: 32 },
    name: { type: "string", maxLength: 256 },
    nickname: { type: "string", maxLength: 256 },
    city: { type: "string", maxLength: 256 },
    slug: { type: "string", maxLength: 256 },
    source: { type: "string", enum: ["custom", "generated"], maxLength: 16 },
    roster: { type: "object", additionalProperties: true },
    metadata: { type: "object", additionalProperties: true },
    statsProfile: { type: "string", maxLength: 64 },
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

// Promise-based guard: set synchronously before the first await so concurrent
// initDb calls share the same load (JS is single-threaded; ??= is atomic here).
let devModePluginPromise: Promise<void> | null = null;

async function initDb(
  storage: RxStorage<unknown, unknown>,
  name = "ballgame",
): Promise<BallgameDb> {
  addRxPlugin(RxDBMigrationSchemaPlugin);

  if (import.meta.env.MODE === "development") {
    devModePluginPromise ??= import("rxdb/plugins/dev-mode").then(({ RxDBDevModePlugin }) => {
      addRxPlugin(RxDBDevModePlugin);
    });
    await devModePluginPromise.catch(() => {}); // dev plugin is optional; don't block DB init
  }

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
      },
    },
    events: { schema: eventsSchema },
    teams: { schema: teamsSchema },
    customTeams: { schema: customTeamsSchema },
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

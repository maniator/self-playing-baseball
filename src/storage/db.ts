/// <reference types="vite/client" />
import {
  gamesCollectionConfig,
  pitcherGameStatsCollectionConfig,
  playerGameStatsCollectionConfig,
  playersCollectionConfig,
} from "@feat/careerStats/storage/schema";
import { customTeamsCollectionConfig } from "@feat/customTeams/storage/schema";
import { eventsCollectionConfig, savesCollectionConfig } from "@feat/saves/storage/schema";
import { appLog } from "@shared/utils/logger";
import {
  addRxPlugin,
  createRxDatabase,
  removeRxDatabase,
  type RxCollection,
  type RxDatabase,
  RxError,
  type RxStorage,
} from "rxdb";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

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
    saves: savesCollectionConfig,
    events: eventsCollectionConfig,
    customTeams: customTeamsCollectionConfig,
    players: playersCollectionConfig,
    games: gamesCollectionConfig,
    playerGameStats: playerGameStatsCollectionConfig,
    pitcherGameStats: pitcherGameStatsCollectionConfig,
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

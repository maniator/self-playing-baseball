/// <reference types="vite/client" />
import {
  batterGameStatsV1CollectionConfig,
  completedGamesV1CollectionConfig,
  pitcherGameStatsV1CollectionConfig,
} from "@feat/careerStats/storage/schemaV1";
import {
  playersV1CollectionConfig,
  teamsV1CollectionConfig,
} from "@feat/customTeams/storage/schemaV1";
import { eventsV1CollectionConfig, savesV1CollectionConfig } from "@feat/saves/storage/schemaV1";
import { appLog } from "@shared/utils/logger";
import {
  createRxDatabase,
  removeRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxStorage,
} from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

import type {
  BatterGameStatRecord,
  CompletedGameRecord,
  EventRecord,
  PitcherGameStatRecord,
  PlayerRecord,
  SaveRecord,
  TeamRecord,
} from "./types";

// ── v1 schema epoch ───────────────────────────────────────────────────────────
// Bump BETA_SCHEMA_EPOCH whenever the v1 schema family is replaced with a new
// incompatible version. Changing this value triggers a deliberate wipe-and-recreate
// of the local ballgame IndexedDB on the user's next app load.
const BETA_SCHEMA_EPOCH = "v1.2";
const BETA_EPOCH_KEY = "ballgame:schemaEpoch";

export type DbCollections = {
  saves: RxCollection<SaveRecord>;
  events: RxCollection<EventRecord>;
  teams: RxCollection<TeamRecord>;
  players: RxCollection<PlayerRecord>;
  completedGames: RxCollection<CompletedGameRecord>;
  batterGameStats: RxCollection<BatterGameStatRecord>;
  pitcherGameStats: RxCollection<PitcherGameStatRecord>;
};

export type BallgameDb = RxDatabase<DbCollections>;

/**
 * Checks whether the locally stored schema epoch matches the current BETA_SCHEMA_EPOCH.
 * When the epoch is stale (an old epoch string is present in localStorage), the existing
 * `ballgame` IndexedDB is removed so it can be recreated with the v1 schemas.
 * When no epoch has been stored yet (first install), the epoch is recorded without
 * removing anything — there is no old data to wipe.
 *
 * Returns true if a DB removal was performed (caller should set dbWasReset).
 */
async function resetIfEpochChanged(storage: RxStorage<unknown, unknown>): Promise<boolean> {
  if (typeof localStorage === "undefined") return false;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(BETA_EPOCH_KEY);
  } catch (err: unknown) {
    // localStorage can throw in restricted/privacy contexts. Treat as
    // "unknown epoch" and continue without blocking DB initialization.
    appLog.warn("[db] Failed to read schema epoch from localStorage; skipping epoch gate:", err);
    return false;
  }
  if (stored === BETA_SCHEMA_EPOCH) return false;

  let wasReset = false;
  if (stored !== null) {
    // An old epoch is recorded — the DB belongs to an obsolete schema family.
    // Wipe it before recreating with the new v1 schemas.
    appLog.log(
      `[db] Schema epoch changed (${stored} → ${BETA_SCHEMA_EPOCH}); wiping local ballgame DB.`,
    );
    try {
      await removeRxDatabase("ballgame", storage as RxStorage<object, object>);
      wasReset = true;
    } catch (err: unknown) {
      // Removal failure is non-fatal: initDb will attempt creation regardless.
      // If the old DB somehow persists, RxDB may surface a schema-mismatch error
      // which the existing schema-failure recovery path handles below.
      appLog.warn("[db] Failed to remove old ballgame DB during epoch reset:", err);
    }
  }

  try {
    localStorage.setItem(BETA_EPOCH_KEY, BETA_SCHEMA_EPOCH);
  } catch (err: unknown) {
    // Non-fatal: DB can still run without persisting the epoch marker.
    appLog.warn("[db] Failed to persist schema epoch to localStorage:", err);
  }
  return wasReset;
}

async function initDb(
  storage: RxStorage<unknown, unknown>,
  name = "ballgame",
): Promise<BallgameDb> {
  const db = await createRxDatabase<DbCollections>({
    name,
    storage: storage as RxStorage<object, object>,
    multiInstance: false,
  });
  await db.addCollections({
    saves: savesV1CollectionConfig,
    events: eventsV1CollectionConfig,
    teams: teamsV1CollectionConfig,
    players: playersV1CollectionConfig,
    completedGames: completedGamesV1CollectionConfig,
    batterGameStats: batterGameStatsV1CollectionConfig,
    pitcherGameStats: pitcherGameStatsV1CollectionConfig,
  });
  return db;
}

let dbPromise: Promise<BallgameDb> | null = null;

/** True if the database was wiped and recreated during this session. */
let dbWasReset = false;
/** Returns true if the database was reset during this session. */
export const wasDbReset = (): boolean => dbWasReset;

/**
 * Returns true when an error represents a schema failure that warrants a last-resort
 * DB wipe-and-recreate as emergency recovery:
 * - DB6: schema hash mismatch (schema changed without bumping version)
 * - DM4: migration strategy execution failed
 *
 * Transient errors (quota exceeded, blocked IndexedDB, etc.) are NOT included so
 * we never silently wipe user data for non-schema faults.
 */
const isSchemaFailure = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "DB6" || code === "DM4";
};

/** Returns the singleton IndexedDB-backed database instance (lazy-initialized). */
export const getDb = (): Promise<BallgameDb> => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const storage = getRxStorageDexie();

      // Check for a stale schema epoch and wipe the old DB when found.
      // This is the deliberate beta reset path — no migration strategies needed.
      const epochReset = await resetIfEpochChanged(storage);
      if (epochReset) dbWasReset = true;

      try {
        return await initDb(storage);
      } catch (err: unknown) {
        // Last-resort recovery: if the DB still fails to open (e.g. epoch removal
        // failed and the old DB persists), attempt one final wipe.
        if (!isSchemaFailure(err)) throw err;

        appLog.warn("[db] Schema mismatch after epoch check; attempting emergency DB reset:", err);
        let resetSucceeded = false;
        try {
          await removeRxDatabase("ballgame", storage as RxStorage<object, object>);
          resetSucceeded = true;
        } catch (removalErr: unknown) {
          appLog.warn("[db] Emergency DB removal also failed:", removalErr);
        }
        if (resetSucceeded) dbWasReset = true;
        return initDb(storage);
      }
    })();
  }
  return dbPromise;
};

export const savesCollection = async (): Promise<RxCollection<SaveRecord>> => (await getDb()).saves;

export const eventsCollection = async (): Promise<RxCollection<EventRecord>> =>
  (await getDb()).events;

export const teamsCollection = async (): Promise<RxCollection<TeamRecord>> => (await getDb()).teams;

export const playersCollection = async (): Promise<RxCollection<PlayerRecord>> =>
  (await getDb()).players;

export const completedGamesCollection = async (): Promise<RxCollection<CompletedGameRecord>> =>
  (await getDb()).completedGames;

export const batterGameStatsCollection = async (): Promise<RxCollection<BatterGameStatRecord>> =>
  (await getDb()).batterGameStats;

export const pitcherGameStatsCollection = async (): Promise<RxCollection<PitcherGameStatRecord>> =>
  (await getDb()).pitcherGameStats;

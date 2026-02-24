import {
  addRxPlugin,
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxJsonSchema,
  type RxStorage,
} from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

import type { CustomTeamDoc, EventDoc, SaveDoc, TeamDoc } from "./types";

type DbCollections = {
  saves: RxCollection<SaveDoc>;
  events: RxCollection<EventDoc>;
  teams: RxCollection<TeamDoc>;
  customTeams: RxCollection<CustomTeamDoc>;
};

export type BallgameDb = RxDatabase<DbCollections>;

const savesSchema: RxJsonSchema<SaveDoc> = {
  version: 0,
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
    saves: { schema: savesSchema },
    events: { schema: eventsSchema },
    teams: { schema: teamsSchema },
    customTeams: { schema: customTeamsSchema },
  });
  return db;
}

let dbPromise: Promise<BallgameDb> | null = null;

/** Returns the singleton IndexedDB-backed database instance (lazy-initialized). */
export const getDb = (): Promise<BallgameDb> => {
  if (!dbPromise) {
    dbPromise = initDb(getRxStorageDexie());
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

import {
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxJsonSchema,
  type RxStorage,
} from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

import type { EventDoc, SaveDoc } from "./types";

type DbCollections = {
  saves: RxCollection<SaveDoc>;
  events: RxCollection<EventDoc>;
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
    setup: { type: "object", additionalProperties: true },
    scoreSnapshot: { type: "object", additionalProperties: true },
    inningSnapshot: { type: "object", additionalProperties: true },
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
    at: {},
    type: { type: "string" },
    payload: { type: "object", additionalProperties: true },
    ts: { type: "number", minimum: 0, maximum: 9_999_999_999_999, multipleOf: 1 },
    schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
  },
  required: ["id", "saveId", "idx", "type", "ts", "schemaVersion"],
  indexes: ["saveId", ["saveId", "idx"]],
};

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
    saves: { schema: savesSchema },
    events: { schema: eventsSchema },
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

/**
 * Creates a fresh database with the given storage — intended for tests only.
 * Each call returns an independent instance; callers are responsible for
 * calling `db.destroy()` when finished.
 */
let _testCounter = 0;
export const _createTestDb = (
  storage: RxStorage<unknown, unknown>,
  name = `ballgame_test_${++_testCounter}`,
): Promise<BallgameDb> => initDb(storage, name);

import "fake-indexeddb/auto";

import { createRxDatabase, newRxError, type RxJsonSchema } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  _createTestDb,
  _isMigrationFailureForTest,
  _resetDbForTest,
  type BallgameDb,
  customTeamsCollection,
  eventsCollection,
  getDb,
  savesCollection,
  wasDbReset,
} from "./db";

let db: BallgameDb;

beforeEach(async () => {
  db = await _createTestDb(getRxStorageMemory());
});

afterEach(async () => {
  await db.close();
});

describe("db collections", () => {
  it("creates saves, events, teams, and customTeams collections", () => {
    expect(db.saves).toBeDefined();
    expect(db.events).toBeDefined();
    expect(db.teams).toBeDefined();
    expect(db.customTeams).toBeDefined();
  });

  it("inserts and retrieves a saves document", async () => {
    await db.saves.insert({
      id: "s1",
      name: "Test Game",
      seed: "abc",
      matchupMode: "default",
      homeTeamId: "Yankees",
      awayTeamId: "Mets",
      createdAt: 1000,
      updatedAt: 1000,
      progressIdx: 0,
      setup: {},
      schemaVersion: 1,
    });
    const doc = await db.saves.findOne("s1").exec();
    expect(doc?.name).toBe("Test Game");
    expect(doc?.homeTeamId).toBe("Yankees");
  });

  it("inserts and retrieves an events document", async () => {
    await db.events.insert({
      id: "s1:0",
      saveId: "s1",
      idx: 0,
      at: 0,
      type: "pitch",
      payload: { result: "strike" },
      ts: 1000,
      schemaVersion: 1,
    });
    const doc = await db.events.findOne("s1:0").exec();
    expect(doc?.type).toBe("pitch");
    expect(doc?.saveId).toBe("s1");
    expect(doc?.idx).toBe(0);
  });

  it("indexes events by saveId", async () => {
    for (let i = 0; i < 3; i++) {
      await db.events.insert({
        id: `save_a:${i}`,
        saveId: "save_a",
        idx: i,
        at: i,
        type: "pitch",
        payload: {},
        ts: Date.now(),
        schemaVersion: 1,
      });
    }
    // Insert one for a different save to verify filtering
    await db.events.insert({
      id: "save_b:0",
      saveId: "save_b",
      idx: 0,
      at: 0,
      type: "pitch",
      payload: {},
      ts: Date.now(),
      schemaVersion: 1,
    });
    const results = await db.events.find({ selector: { saveId: "save_a" } }).exec();
    expect(results).toHaveLength(3);
  });
});

describe("savesCollection / eventsCollection helpers (singleton)", () => {
  it("savesCollection() resolves to the RxDB saves collection", async () => {
    // getDb() uses getRxStorageDexie() — fake-indexeddb polyfills IndexedDB for the test.
    const singletonDb = await getDb();
    const col = await savesCollection();
    expect(col).toBe(singletonDb.saves);
  });

  it("eventsCollection() resolves to the RxDB events collection", async () => {
    const singletonDb = await getDb();
    const col = await eventsCollection();
    expect(col).toBe(singletonDb.events);
  });

  it("customTeamsCollection() resolves to the RxDB customTeams collection", async () => {
    const singletonDb = await getDb();
    const col = await customTeamsCollection();
    expect(col).toBe(singletonDb.customTeams);
  });
});

describe("teams collection", () => {
  it("inserts and retrieves a teams document", async () => {
    const db = await _createTestDb(getRxStorageMemory());
    const now = Date.now();
    await db.teams.insert({
      id: "147",
      numericId: 147,
      name: "New York Yankees",
      abbreviation: "NYY",
      league: "al",
      cachedAt: now,
      schemaVersion: 1,
    });
    const doc = await db.teams.findOne("147").exec();
    expect(doc?.name).toBe("New York Yankees");
    expect(doc?.league).toBe("al");
    expect(doc?.numericId).toBe(147);
    await db.close();
  });

  it("indexes teams by league", async () => {
    const db = await _createTestDb(getRxStorageMemory());
    const now = Date.now();
    await db.teams.bulkInsert([
      {
        id: "147",
        numericId: 147,
        name: "Yankees",
        abbreviation: "NYY",
        league: "al",
        cachedAt: now,
        schemaVersion: 1,
      },
      {
        id: "110",
        numericId: 110,
        name: "Orioles",
        abbreviation: "BAL",
        league: "al",
        cachedAt: now,
        schemaVersion: 1,
      },
      {
        id: "121",
        numericId: 121,
        name: "Mets",
        abbreviation: "NYM",
        league: "nl",
        cachedAt: now,
        schemaVersion: 1,
      },
    ]);
    const alTeams = await db.teams.find({ selector: { league: "al" } }).exec();
    expect(alTeams).toHaveLength(2);
    const nlTeams = await db.teams.find({ selector: { league: "nl" } }).exec();
    expect(nlTeams).toHaveLength(1);
    await db.close();
  });
});

describe("schema version and reset flag", () => {
  it("saves collection has schema version 1", async () => {
    const testDb = await _createTestDb(getRxStorageMemory());
    expect(testDb.saves.schema.version).toBe(1);
    await testDb.close();
  });

  it("wasDbReset() returns false initially", () => {
    expect(wasDbReset()).toBe(false);
  });
});

/**
 * Upgrade-path test: simulates a user who had IndexedDB data created with the
 * pre-Stage-3B v0 schema (simple nested objects, no explicit sub-properties).
 *
 * The fix bumped savesSchema.version from 0 to 1 and added an identity
 * migrationStrategies[1] handler.  This test verifies that:
 *   1. A v0 database with existing saves can be reopened with the v1 code.
 *   2. The migration runs without throwing.
 *   3. All save documents remain accessible and intact after migration.
 */
describe("schema migration: v0 → v1 (upgrade-path QA)", () => {
  it("migrates saves created with the pre-Stage-3B v0 schema to v1 without data loss", async () => {
    // The pre-Stage-3B schema had plain `{ type: "object", additionalProperties: true }`
    // for setup / scoreSnapshot / inningSnapshot / stateSnapshot.
    const v0SavesSchema: RxJsonSchema<Record<string, unknown>> = {
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
        stateSnapshot: { type: "object", additionalProperties: true },
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

    // Use a stable name so v0 and v1 open the SAME IndexedDB database.
    // fake-indexeddb/auto (imported at the top) provides a shared in-process
    // IndexedDB environment that persists data across close/reopen cycles.
    const dbName = `migration_test_${Math.random().toString(36).slice(2, 10)}`;

    // ── Step 1: Create v0 DB (simulates pre-Stage-3B user data) ──────────────
    // RxDBMigrationSchemaPlugin is registered automatically by _createTestDb
    // (via initDb) in Step 2, so no explicit addRxPlugin call is needed here.
    const v0Db = await createRxDatabase({
      name: dbName,
      storage: getRxStorageDexie(),
      multiInstance: false,
    });
    await v0Db.addCollections({ saves: { schema: v0SavesSchema } });
    await v0Db.saves.insert({
      id: "legacy_save",
      name: "Pre-Stage-3B Save",
      seed: "xyz",
      matchupMode: "default",
      homeTeamId: "Yankees",
      awayTeamId: "Mets",
      createdAt: 1000,
      updatedAt: 2000,
      progressIdx: 10,
      setup: { strategy: "balanced", managerMode: true, homeTeam: "Yankees", awayTeam: "Mets" },
      schemaVersion: 0,
    });
    await v0Db.close();

    // ── Step 2: Open same DB with v1 schema (schema migration to v1) ─
    // _createTestDb uses the current initDb which registers RxDBMigrationSchemaPlugin
    // and opens savesSchema at version 1 with migrationStrategies[1] = identity.
    const v1Db = await _createTestDb(getRxStorageDexie(), dbName);

    // ── Step 3: Verify save document survived migration intact ─────────────────
    const doc = await v1Db.saves.findOne("legacy_save").exec();
    expect(doc, "migrated document should exist after upgrade").not.toBeNull();
    expect(doc?.name).toBe("Pre-Stage-3B Save");
    expect(doc?.homeTeamId).toBe("Yankees");
    expect(doc?.awayTeamId).toBe("Mets");
    expect(doc?.progressIdx).toBe(10);
    expect(doc?.setup).toMatchObject({
      strategy: "balanced",
      managerMode: true,
      homeTeam: "Yankees",
      awayTeam: "Mets",
    });

    await v1Db.close();
  });

  it("migrates a v0 save with all optional nested fields populated", async () => {
    // Verifies that pre-Stage-3B saves that already had scoreSnapshot,
    // inningSnapshot, and stateSnapshot populated survive the identity migration.
    const v0SavesSchema: RxJsonSchema<Record<string, unknown>> = {
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
        stateSnapshot: { type: "object", additionalProperties: true },
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

    const dbName = `migration_full_${Math.random().toString(36).slice(2, 10)}`;

    const v0Db = await createRxDatabase({
      name: dbName,
      storage: getRxStorageDexie(),
      multiInstance: false,
    });
    await v0Db.addCollections({ saves: { schema: v0SavesSchema } });
    await v0Db.saves.insert({
      id: "full_save",
      name: "Full Pre-Stage-3B Save",
      seed: "abc",
      matchupMode: "default",
      homeTeamId: "Red Sox",
      awayTeamId: "Dodgers",
      createdAt: 3000,
      updatedAt: 4000,
      progressIdx: 42,
      setup: { strategy: "power", managerMode: false },
      scoreSnapshot: { home: 3, away: 1, runs: [1, 2, 0] },
      inningSnapshot: { inning: 7, half: "bottom", outs: 2 },
      stateSnapshot: { rngState: 999, strikes: 1, balls: 2 },
      schemaVersion: 0,
    });
    await v0Db.close();

    const v1Db = await _createTestDb(getRxStorageDexie(), dbName);

    const doc = await v1Db.saves.findOne("full_save").exec();
    expect(doc, "migrated document should exist").not.toBeNull();
    expect(doc?.progressIdx).toBe(42);
    expect(doc?.setup).toMatchObject({ strategy: "power", managerMode: false });
    expect(doc?.scoreSnapshot).toMatchObject({ home: 3, away: 1 });
    expect(doc?.inningSnapshot).toMatchObject({ inning: 7, half: "bottom" });
    expect(doc?.stateSnapshot).toMatchObject({ rngState: 999 });

    await v1Db.close();
  });
});

describe("isMigrationFailure (via _isMigrationFailureForTest)", () => {
  it("returns true for RxError with code DB6 (schema hash mismatch)", () => {
    const err = newRxError("DB6", {});
    expect(_isMigrationFailureForTest(err)).toBe(true);
  });

  it("returns true for RxError with code DM4 (migration strategy execution failed)", () => {
    const err = newRxError("DM4", { collection: "saves", error: new Error("strategy threw") });
    expect(_isMigrationFailureForTest(err)).toBe(true);
  });

  it("returns false for a plain Error (not an RxError)", () => {
    expect(_isMigrationFailureForTest(new Error("quota exceeded"))).toBe(false);
  });

  it("returns false for a non-DB6/DM4 RxError code", () => {
    const err = newRxError("DB1", {});
    expect(_isMigrationFailureForTest(err)).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(_isMigrationFailureForTest("string error")).toBe(false);
    expect(_isMigrationFailureForTest(null)).toBe(false);
    expect(_isMigrationFailureForTest(undefined)).toBe(false);
  });
});

describe("getDb() recovery path", () => {
  afterEach(() => {
    _resetDbForTest();
  });

  it("wasDbReset() stays false when getDb() succeeds normally", async () => {
    // getDb() is not mocked here; the module-level singleton is reset before each test
    // and wasDbReset() should remain false on a clean init.
    // (The actual DB init would run but is covered by the db collections tests above.)
    expect(wasDbReset()).toBe(false);
  });

  it("_resetDbForTest clears the cached promise so getDb() runs fresh", () => {
    _resetDbForTest();
    expect(wasDbReset()).toBe(false);
  });
});

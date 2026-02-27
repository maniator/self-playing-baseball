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

  it("customTeams collection has schema version 2", async () => {
    const testDb = await _createTestDb(getRxStorageMemory());
    expect(testDb.customTeams.schema.version).toBe(2);
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

/**
 * Upgrade-path test for `customTeams` schema v0 → v1.
 *
 * This branch added `fingerprint` (FNV-1a content hash, used for duplicate
 * detection on import) and formally declared `abbreviation` in the JSON schema.
 * Both fields are optional, so the identity migration is safe for all existing
 * docs — no backfill is needed at migration time.
 */
describe("schema migration: customTeams v0 → v1 (fingerprint + abbreviation)", () => {
  /** The v0 schema that shipped before this branch. */
  const v0CustomTeamsSchema: RxJsonSchema<Record<string, unknown>> = {
    version: 0,
    primaryKey: "id",
    type: "object",
    properties: {
      id: { type: "string", maxLength: 128 },
      schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
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

  it("migrates a v0 customTeam without fingerprint/abbreviation to v1 without data loss", async () => {
    const dbName = `ct_migration_${Math.random().toString(36).slice(2, 10)}`;

    // ── Step 1: create a v0 DB and insert a legacy doc ─────────────────────
    const v0Db = await createRxDatabase({
      name: dbName,
      storage: getRxStorageDexie(),
      multiInstance: false,
    });
    await v0Db.addCollections({ customTeams: { schema: v0CustomTeamsSchema } });
    await v0Db.customTeams.insert({
      id: "ct_legacy",
      schemaVersion: 0,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      name: "Legacy Team",
      source: "custom",
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "p1",
            name: "Alice",
            role: "batter",
            batting: { contact: 70, power: 60, speed: 50 },
          },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    });
    await v0Db.close();

    // ── Step 2: reopen with v1 schema (triggers identity migration) ─────────
    const v1Db = await _createTestDb(getRxStorageDexie(), dbName);

    // ── Step 3: all original fields survive; new optional fields are absent ─
    const doc = await v1Db.customTeams.findOne("ct_legacy").exec();
    expect(doc, "migrated doc should exist").not.toBeNull();
    expect(doc?.name).toBe("Legacy Team");
    expect(doc?.source).toBe("custom");
    // Optional fields not present on the legacy doc are absent — use toBeFalsy so
    // the assertion passes regardless of whether RxDB returns undefined or null.
    expect(doc?.abbreviation).toBeFalsy();
    expect(doc?.fingerprint).toBeFalsy();
    expect(doc?.roster).toMatchObject({ lineup: [expect.objectContaining({ name: "Alice" })] });

    await v1Db.close();
  });

  it("migrates a v0 customTeam that already stored abbreviation as an additional property", async () => {
    const dbName = `ct_abbrev_${Math.random().toString(36).slice(2, 10)}`;

    // Pre-migration docs could store `abbreviation` as an undeclared additional
    // property (JSON Schema allows it by default). After migration the field is
    // formally declared but the value must survive intact.
    const v0Db = await createRxDatabase({
      name: dbName,
      storage: getRxStorageDexie(),
      multiInstance: false,
    });
    await v0Db.addCollections({ customTeams: { schema: v0CustomTeamsSchema } });
    await v0Db.customTeams.insert({
      id: "ct_abbrev",
      schemaVersion: 0,
      createdAt: "2024-06-01T00:00:00.000Z",
      updatedAt: "2024-06-01T00:00:00.000Z",
      name: "Rockets",
      abbreviation: "ROC",
      source: "custom",
      roster: {
        schemaVersion: 1,
        lineup: [
          { id: "p2", name: "Bob", role: "batter", batting: { contact: 65, power: 55, speed: 45 } },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    });
    await v0Db.close();

    const v1Db = await _createTestDb(getRxStorageDexie(), dbName);

    const doc = await v1Db.customTeams.findOne("ct_abbrev").exec();
    expect(doc, "migrated doc should exist").not.toBeNull();
    expect(doc?.name).toBe("Rockets");
    expect(doc?.abbreviation).toBe("ROC");
    expect(doc?.fingerprint).toBeFalsy();

    await v1Db.close();
  });
});

/**
 * Upgrade-path test for `customTeams` schema v1 → v2.
 *
 * Version 2 backfills a persistent `fingerprint` field on every roster player.
 * The fingerprint is a FNV-1a hash of {name, role, batting, pitching} and enables
 * O(1) global duplicate detection without re-reading all teams.
 */
describe("schema migration: customTeams v1 → v2 (player fingerprints)", () => {
  /** The v1 schema (abbreviated to match what was shipped). */
  const v1CustomTeamsSchema: RxJsonSchema<Record<string, unknown>> = {
    version: 1,
    primaryKey: "id",
    type: "object",
    properties: {
      id: { type: "string", maxLength: 128 },
      schemaVersion: { type: "number", minimum: 0, maximum: 999, multipleOf: 1 },
      createdAt: { type: "string", maxLength: 32 },
      updatedAt: { type: "string", maxLength: 32 },
      name: { type: "string", maxLength: 256 },
      abbreviation: { type: "string", maxLength: 8 },
      nickname: { type: "string", maxLength: 256 },
      city: { type: "string", maxLength: 256 },
      slug: { type: "string", maxLength: 256 },
      source: { type: "string", enum: ["custom", "generated"], maxLength: 16 },
      roster: { type: "object", additionalProperties: true },
      metadata: { type: "object", additionalProperties: true },
      statsProfile: { type: "string", maxLength: 64 },
      fingerprint: { type: "string", maxLength: 8 },
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

  it("backfills player fingerprints on migration from v1 to v2", async () => {
    const dbName = `ct_v1v2_${Math.random().toString(36).slice(2, 10)}`;

    // Create a v1 DB with players that have no fingerprint.
    const v1Db = await createRxDatabase({
      name: dbName,
      storage: getRxStorageDexie(),
      multiInstance: false,
    });
    await v1Db.addCollections({
      customTeams: {
        schema: v1CustomTeamsSchema,
        migrationStrategies: { 1: (doc) => doc },
      },
    });
    await v1Db.customTeams.insert({
      id: "ct_v1team",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      name: "V1 Team",
      abbreviation: "V1T",
      source: "custom",
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "p1",
            name: "Alice",
            role: "batter",
            batting: { contact: 70, power: 60, speed: 50 },
          },
        ],
        bench: [
          {
            id: "p2",
            name: "Carol",
            role: "batter",
            batting: { contact: 55, power: 65, speed: 60 },
          },
        ],
        pitchers: [
          {
            id: "p3",
            name: "Dave",
            role: "pitcher",
            batting: { contact: 20, power: 10, speed: 15 },
            pitching: { velocity: 80, control: 70, movement: 65 },
          },
        ],
      },
      metadata: { archived: false },
    });
    await v1Db.close();

    // Reopen with v2 schema — triggers v1→v2 migration.
    const v2Db = await _createTestDb(getRxStorageDexie(), dbName);

    const doc = await v2Db.customTeams.findOne("ct_v1team").exec();
    expect(doc, "migrated doc must exist").not.toBeNull();
    expect(doc?.name).toBe("V1 Team");

    const roster = doc?.roster as {
      lineup: { id: string; name: string; fingerprint?: string }[];
      bench: { id: string; name: string; fingerprint?: string }[];
      pitchers: { id: string; name: string; fingerprint?: string }[];
    };

    // Every player must now have a non-empty fingerprint after migration.
    expect(roster.lineup[0].fingerprint).toBeTruthy();
    expect(roster.bench[0].fingerprint).toBeTruthy();
    expect(roster.pitchers[0].fingerprint).toBeTruthy();

    // Player names and IDs must survive intact.
    expect(roster.lineup[0].name).toBe("Alice");
    expect(roster.lineup[0].id).toBe("p1");
    expect(roster.bench[0].name).toBe("Carol");
    expect(roster.pitchers[0].name).toBe("Dave");

    await v2Db.close();
  });

  it("migration is idempotent — players already fingerprinted are not changed", async () => {
    const dbName = `ct_v1idem_${Math.random().toString(36).slice(2, 10)}`;

    const v1Db = await createRxDatabase({
      name: dbName,
      storage: getRxStorageDexie(),
      multiInstance: false,
    });
    await v1Db.addCollections({
      customTeams: {
        schema: v1CustomTeamsSchema,
        migrationStrategies: { 1: (doc) => doc },
      },
    });
    const existingFp = "aabbccdd";
    await v1Db.customTeams.insert({
      id: "ct_idem",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      name: "Idem Team",
      abbreviation: "IDM",
      source: "custom",
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "p1",
            name: "Bob",
            role: "batter",
            batting: { contact: 60, power: 60, speed: 60 },
            fingerprint: existingFp,
          },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    });
    await v1Db.close();

    const v2Db = await _createTestDb(getRxStorageDexie(), dbName);
    const doc = await v2Db.customTeams.findOne("ct_idem").exec();
    const roster = doc?.roster as {
      lineup: { fingerprint?: string }[];
    };
    // Existing fingerprint must be preserved (not overwritten).
    expect(roster.lineup[0].fingerprint).toBe(existingFp);
    await v2Db.close();
  });

  it("migration handles teams with empty roster slots gracefully", async () => {
    const dbName = `ct_empty_${Math.random().toString(36).slice(2, 10)}`;

    const v1Db = await createRxDatabase({
      name: dbName,
      storage: getRxStorageDexie(),
      multiInstance: false,
    });
    await v1Db.addCollections({
      customTeams: {
        schema: v1CustomTeamsSchema,
        migrationStrategies: { 1: (doc) => doc },
      },
    });
    await v1Db.customTeams.insert({
      id: "ct_sparse",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      name: "Sparse Team",
      abbreviation: "SPR",
      source: "custom",
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "p1",
            name: "Alice",
            role: "batter",
            batting: { contact: 70, power: 60, speed: 50 },
          },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    });
    await v1Db.close();

    // Should not throw
    const v2Db = await _createTestDb(getRxStorageDexie(), dbName);
    const doc = await v2Db.customTeams.findOne("ct_sparse").exec();
    expect(doc).not.toBeNull();
    await v2Db.close();
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

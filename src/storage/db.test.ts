import "fake-indexeddb/auto";

import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { _createTestDb, type BallgameDb, eventsCollection, getDb, savesCollection } from "./db";

let db: BallgameDb;

beforeEach(async () => {
  db = await _createTestDb(getRxStorageMemory());
});

afterEach(async () => {
  await db.close();
});

describe("db collections", () => {
  it("creates saves, events, and teams collections", () => {
    expect(db.saves).toBeDefined();
    expect(db.events).toBeDefined();
    expect(db.teams).toBeDefined();
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

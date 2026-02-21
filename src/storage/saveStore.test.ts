import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { makeState } from "@test/testHelpers";

import { _createTestDb, type BallgameDb } from "./db";
import { makeSaveStore } from "./saveStore";
import type { GameSetup } from "./types";

const makeSetup = (overrides: Partial<GameSetup> = {}): GameSetup => ({
  matchupMode: "default",
  homeTeamId: "Yankees",
  awayTeamId: "Mets",
  seed: "abc123",
  setup: {
    strategy: "balanced",
    managedTeam: null,
    managerMode: false,
    homeTeam: "Yankees",
    awayTeam: "Mets",
    playerOverrides: [{}, {}],
    lineupOrder: [[], []],
  },
  ...overrides,
});

let db: BallgameDb;
let store: ReturnType<typeof makeSaveStore>;

beforeEach(async () => {
  db = await _createTestDb(getRxStorageMemory());
  store = makeSaveStore(() => Promise.resolve(db));
});

afterEach(async () => {
  await db.close();
});

describe("SaveStore.createSave", () => {
  it("returns a string saveId", async () => {
    const id = await store.createSave(makeSetup());
    expect(typeof id).toBe("string");
    expect(id).toBeTruthy();
  });

  it("persists a save header document", async () => {
    const id = await store.createSave(makeSetup({ homeTeamId: "Cubs", awayTeamId: "Sox" }));
    const doc = await db.saves.findOne(id).exec();
    expect(doc?.homeTeamId).toBe("Cubs");
    expect(doc?.awayTeamId).toBe("Sox");
    expect(doc?.progressIdx).toBe(-1);
    expect(doc?.schemaVersion).toBe(1);
  });

  it("uses provided name when given", async () => {
    const id = await store.createSave(makeSetup(), { name: "My Custom Game" });
    const doc = await db.saves.findOne(id).exec();
    expect(doc?.name).toBe("My Custom Game");
  });

  it("auto-generates a name from team ids when no name given", async () => {
    const id = await store.createSave(makeSetup({ homeTeamId: "Dodgers", awayTeamId: "Giants" }));
    const doc = await db.saves.findOne(id).exec();
    expect(doc?.name).toContain("Dodgers");
    expect(doc?.name).toContain("Giants");
  });

  it("stores seed and matchupMode", async () => {
    const id = await store.createSave(makeSetup({ seed: "xyz", matchupMode: "custom" }));
    const doc = await db.saves.findOne(id).exec();
    expect(doc?.seed).toBe("xyz");
    expect(doc?.matchupMode).toBe("custom");
  });
});

describe("SaveStore.appendEvents", () => {
  it("inserts events with deterministic ids", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.appendEvents(saveId, [
      { type: "pitch", at: 0, payload: { result: "strike" } },
      { type: "pitch", at: 1, payload: { result: "ball" } },
    ]);
    const ev0 = await db.events.findOne(`${saveId}:0`).exec();
    const ev1 = await db.events.findOne(`${saveId}:1`).exec();
    expect(ev0?.type).toBe("pitch");
    expect(ev0?.idx).toBe(0);
    expect(ev1?.idx).toBe(1);
  });

  it("appends events after existing ones (increments idx)", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.appendEvents(saveId, [{ type: "a", at: 0, payload: {} }]);
    await store.appendEvents(saveId, [{ type: "b", at: 1, payload: {} }]);
    const ev1 = await db.events.findOne(`${saveId}:1`).exec();
    expect(ev1?.type).toBe("b");
    expect(ev1?.idx).toBe(1);
  });

  it("is a no-op for empty array", async () => {
    const saveId = await store.createSave(makeSetup());
    await expect(store.appendEvents(saveId, [])).resolves.toBeUndefined();
    const count = await db.events.count({ selector: { saveId } }).exec();
    expect(count).toBe(0);
  });

  it("stores at, payload, and schemaVersion on each event", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.appendEvents(saveId, [{ type: "hit", at: 42, payload: { kind: "single" } }]);
    const ev = await db.events.findOne(`${saveId}:0`).exec();
    expect(ev?.at).toBe(42);
    expect(ev?.payload).toEqual({ kind: "single" });
    expect(ev?.schemaVersion).toBe(1);
  });

  it("bulk-inserts multiple events in one call", async () => {
    const saveId = await store.createSave(makeSetup());
    const batch = Array.from({ length: 10 }, (_, i) => ({
      type: "pitch",
      at: i,
      payload: { i },
    }));
    await store.appendEvents(saveId, batch);
    const count = await db.events.count({ selector: { saveId } }).exec();
    expect(count).toBe(10);
  });

  it("serializes concurrent appends — no index collisions", async () => {
    const saveId = await store.createSave(makeSetup());
    // Fire two appends concurrently without awaiting the first.
    const p1 = store.appendEvents(saveId, [
      { type: "a", at: 0, payload: {} },
      { type: "b", at: 0, payload: {} },
    ]);
    const p2 = store.appendEvents(saveId, [
      { type: "c", at: 1, payload: {} },
      { type: "d", at: 1, payload: {} },
    ]);
    await Promise.all([p1, p2]);
    const count = await db.events.count({ selector: { saveId } }).exec();
    // All 4 events must be stored with unique indices 0–3.
    expect(count).toBe(4);
    for (let i = 0; i < 4; i++) {
      const ev = await db.events.findOne(`${saveId}:${i}`).exec();
      expect(ev).not.toBeNull();
    }
  });
});

describe("SaveStore.updateProgress", () => {
  it("updates progressIdx and updatedAt", async () => {
    const saveId = await store.createSave(makeSetup());
    const before = Date.now();
    await store.updateProgress(saveId, 5);
    const doc = await db.saves.findOne(saveId).exec();
    expect(doc?.progressIdx).toBe(5);
    expect(doc?.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("stores scoreSnapshot when provided", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.updateProgress(saveId, 3, {
      scoreSnapshot: { home: 2, away: 1 },
    });
    const doc = await db.saves.findOne(saveId).exec();
    expect(doc?.scoreSnapshot).toEqual({ home: 2, away: 1 });
  });

  it("stores inningSnapshot when provided", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.updateProgress(saveId, 3, {
      inningSnapshot: { inning: 4, atBat: 1 },
    });
    const doc = await db.saves.findOne(saveId).exec();
    expect(doc?.inningSnapshot).toEqual({ inning: 4, atBat: 1 });
  });

  it("stores stateSnapshot when provided", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.updateProgress(saveId, 5, {
      stateSnapshot: { state: makeState({ inning: 3 }), rngState: 99 },
    });
    const doc = await db.saves.findOne(saveId).exec();
    expect(doc?.stateSnapshot?.state.inning).toBe(3);
    expect(doc?.stateSnapshot?.rngState).toBe(99);
  });

  it("throws for an unknown saveId", async () => {
    await expect(store.updateProgress("nonexistent", 0)).rejects.toThrow("Save not found");
  });
});

describe("SaveStore.deleteSave", () => {
  it("removes the save header", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.deleteSave(saveId);
    const doc = await db.saves.findOne(saveId).exec();
    expect(doc).toBeNull();
  });

  it("removes all associated events", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.appendEvents(saveId, [
      { type: "hit", at: 0, payload: {} },
      { type: "strike", at: 1, payload: {} },
    ]);
    await store.deleteSave(saveId);
    const events = await db.events.find({ selector: { saveId } }).exec();
    expect(events).toHaveLength(0);
  });

  it("is a no-op for an unknown saveId (does not throw)", async () => {
    await expect(store.deleteSave("nonexistent")).resolves.toBeUndefined();
  });
});

describe("SaveStore.listSaves", () => {
  it("returns an empty array when no saves exist", async () => {
    const saves = await store.listSaves();
    expect(saves).toEqual([]);
  });

  it("returns all created saves", async () => {
    await store.createSave(makeSetup({ homeTeamId: "A", awayTeamId: "B" }));
    await store.createSave(makeSetup({ homeTeamId: "C", awayTeamId: "D" }));
    const saves = await store.listSaves();
    expect(saves).toHaveLength(2);
  });

  it("returns saves ordered by updatedAt descending", async () => {
    const id1 = await store.createSave(makeSetup());
    await store.updateProgress(id1, 10);
    // Brief pause so id2's updatedAt is strictly later
    await new Promise((r) => setTimeout(r, 5));
    const id2 = await store.createSave(makeSetup());
    await store.updateProgress(id2, 20);
    const saves = await store.listSaves();
    expect(saves[0].id).toBe(id2);
  });

  it("returned docs include required fields", async () => {
    await store.createSave(makeSetup({ seed: "s1" }));
    const [doc] = await store.listSaves();
    expect(doc.seed).toBe("s1");
    expect(typeof doc.createdAt).toBe("number");
    expect(typeof doc.updatedAt).toBe("number");
    expect(doc.schemaVersion).toBe(1);
  });
});

describe("SaveStore.exportRxdbSave / importRxdbSave", () => {
  it("exportRxdbSave produces valid JSON with version, header, events, sig", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.appendEvents(saveId, [
      { type: "hit", at: 1, payload: { hitType: "single" } },
      { type: "strike", at: 2, payload: { swung: true } },
    ]);
    const json = await store.exportRxdbSave(saveId);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.header.id).toBe(saveId);
    expect(parsed.events).toHaveLength(2);
    expect(typeof parsed.sig).toBe("string");
    expect(parsed.sig).toHaveLength(8);
  });

  it("exportRxdbSave throws for unknown saveId", async () => {
    await expect(store.exportRxdbSave("nonexistent")).rejects.toThrow("Save not found");
  });

  it("importRxdbSave round-trips export/import correctly", async () => {
    const saveId = await store.createSave(makeSetup({ seed: "roundtrip" }));
    await store.appendEvents(saveId, [{ type: "hit", at: 0, payload: {} }]);
    const json = await store.exportRxdbSave(saveId);
    // Import into a fresh db
    const db2 = await (await import("./db"))._createTestDb(getRxStorageMemory());
    const store2 = (await import("./saveStore")).makeSaveStore(() => Promise.resolve(db2));
    const restoredId = await store2.importRxdbSave(json);
    expect(restoredId).toBe(saveId);
    const saves = await store2.listSaves();
    expect(saves).toHaveLength(1);
    expect(saves[0].seed).toBe("roundtrip");
    const events = await db2.events.find({ selector: { saveId } }).exec();
    expect(events).toHaveLength(1);
    await db2.close();
  });

  it("importRxdbSave throws on invalid JSON", async () => {
    await expect(store.importRxdbSave("not json")).rejects.toThrow("Invalid JSON");
  });

  it("importRxdbSave throws on unsupported version", async () => {
    const saveId = await store.createSave(makeSetup());
    const json = await store.exportRxdbSave(saveId);
    const envelope = JSON.parse(json);
    envelope.version = 99;
    await expect(store.importRxdbSave(JSON.stringify(envelope))).rejects.toThrow(
      "Unsupported save version",
    );
  });

  it("importRxdbSave throws on signature mismatch (tampered file)", async () => {
    const saveId = await store.createSave(makeSetup({ homeTeamId: "Original" }));
    const json = await store.exportRxdbSave(saveId);
    const envelope = JSON.parse(json);
    envelope.header.homeTeamId = "Tampered";
    await expect(store.importRxdbSave(JSON.stringify(envelope))).rejects.toThrow(
      "signature mismatch",
    );
  });

  it("importRxdbSave handles saves with no events", async () => {
    const saveId = await store.createSave(makeSetup());
    const json = await store.exportRxdbSave(saveId);
    const db2 = await (await import("./db"))._createTestDb(getRxStorageMemory());
    const store2 = (await import("./saveStore")).makeSaveStore(() => Promise.resolve(db2));
    const restoredId = await store2.importRxdbSave(json);
    expect(restoredId).toBe(saveId);
    await db2.close();
  });
});

describe("SaveStore.appendEvents — counter initialisation from existing events", () => {
  it("fresh store instance picks up existing event idx from DB and continues from there", async () => {
    // First store writes two events with idx 0 and 1.
    const saveId = await store.createSave(makeSetup());
    await store.appendEvents(saveId, [
      { type: "pitch", at: 0, payload: {} },
      { type: "pitch", at: 1, payload: {} },
    ]);

    // Create a fresh store instance pointing at the same DB.
    // Its nextIdxMap is empty, so the first appendEvents call must
    // query the DB to find the highest existing idx (1) and continue from 2.
    const freshStore = makeSaveStore(() => Promise.resolve(db));
    await freshStore.appendEvents(saveId, [{ type: "hit", at: 2, payload: { runs: 1 } }]);

    // All three events should now exist with correct sequential ids.
    const events = await db.events.find({ selector: { saveId }, sort: [{ idx: "asc" }] }).exec();
    expect(events).toHaveLength(3);
    expect(events[2].id).toBe(`${saveId}:2`);
    expect(events[2].type).toBe("hit");
    expect(events[2].idx).toBe(2);
  });

  it("fresh store with no existing events initialises counter at 0", async () => {
    const saveId = await store.createSave(makeSetup());

    // No events yet — fresh store should start at idx 0.
    const freshStore = makeSaveStore(() => Promise.resolve(db));
    await freshStore.appendEvents(saveId, [{ type: "pitch", at: 0, payload: {} }]);

    const events = await db.events.find({ selector: { saveId } }).exec();
    expect(events).toHaveLength(1);
    expect(events[0].idx).toBe(0);
  });
});

import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { _createTestDb, type BallgameDb } from "./db";
import { makeSaveStore } from "./saveStore";
import type { GameSetup } from "./types";

const makeSetup = (overrides: Partial<GameSetup> = {}): GameSetup => ({
  matchupMode: "default",
  homeTeamId: "Yankees",
  awayTeamId: "Mets",
  seed: "abc123",
  setup: { strategy: "balanced" },
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
    await store.appendEvents(saveId, [
      { type: "hit", at: { inning: 3, half: 0, pitchIndex: 5 }, payload: { kind: "single" } },
    ]);
    const ev = await db.events.findOne(`${saveId}:0`).exec();
    expect(ev?.at).toEqual({ inning: 3, half: 0, pitchIndex: 5 });
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
      inningSnapshot: { inning: 4, half: 1 },
    });
    const doc = await db.saves.findOne(saveId).exec();
    expect(doc?.inningSnapshot).toEqual({ inning: 4, half: 1 });
  });

  it("throws for an unknown saveId", async () => {
    await expect(store.updateProgress("nonexistent", 0)).rejects.toThrow("Save not found");
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

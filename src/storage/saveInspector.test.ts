import "fake-indexeddb/auto";

import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { _createTestDb, type BallgameDb } from "./db";
import { inspectSave } from "./saveInspector";
import { makeSaveStore } from "./saveStore";
import type { GameSetup } from "./types";

const makeSetup = (overrides: Partial<GameSetup> = {}): GameSetup => ({
  matchupMode: "default",
  homeTeamId: "Yankees",
  awayTeamId: "Mets",
  seed: "testseed",
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

describe("inspectSave", () => {
  it("throws for an unknown saveId", async () => {
    await expect(inspectSave(db, "nonexistent")).rejects.toThrow("save not found");
  });

  it("returns correct header fields for a new save with no events", async () => {
    const saveId = await store.createSave(makeSetup({ seed: "abc" }));
    const result = await inspectSave(db, saveId);

    expect(result.id).toBe(saveId);
    expect(result.seed).toBe("abc");
    expect(result.progressIdx).toBe(-1);
    expect(result.eventCount).toBe(0);
    expect(result.firstIdx).toBeNull();
    expect(result.lastIdx).toBeNull();
    expect(result.idxGaps).toEqual([]);
    expect(result.countByType).toEqual({});
    expect(result.progressIdxValid).toBe(true); // -1 sentinel is valid
  });

  it("counts events and reports first/last idx", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.appendEvents(saveId, [
      { type: "strike", at: 0, payload: {} },
      { type: "ball", at: 1, payload: {} },
      { type: "hit", at: 2, payload: { kind: "single" } },
    ]);
    const result = await inspectSave(db, saveId);

    expect(result.eventCount).toBe(3);
    expect(result.firstIdx).toBe(0);
    expect(result.lastIdx).toBe(2);
    expect(result.idxGaps).toEqual([]);
  });

  it("reports countByType correctly", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.appendEvents(saveId, [
      { type: "strike", at: 0, payload: {} },
      { type: "strike", at: 1, payload: {} },
      { type: "hit", at: 2, payload: {} },
    ]);
    const result = await inspectSave(db, saveId);

    expect(result.countByType).toEqual({ strike: 2, hit: 1 });
  });

  it("detects idx gaps in the event sequence", async () => {
    const saveId = await store.createSave(makeSetup());
    // Write events 0 and 1, then manually insert event 3 (skipping 2) to
    // simulate a corruption scenario that inspectSave should catch.
    await store.appendEvents(saveId, [
      { type: "a", at: 0, payload: {} },
      { type: "b", at: 1, payload: {} },
    ]);
    await db.events.insert({
      id: `${saveId}:3`,
      saveId,
      idx: 3,
      at: 3,
      type: "c",
      payload: {},
      ts: Date.now(),
      schemaVersion: 1,
    });

    const result = await inspectSave(db, saveId);
    expect(result.idxGaps).toEqual([2]);
    expect(result.eventCount).toBe(3);
    expect(result.lastIdx).toBe(3);
  });

  it("progressIdxValid is true when progressIdx <= lastIdx", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.appendEvents(saveId, [
      { type: "a", at: 0, payload: {} },
      { type: "b", at: 1, payload: {} },
    ]);
    await store.updateProgress(saveId, 1);

    const result = await inspectSave(db, saveId);
    expect(result.progressIdx).toBe(1);
    expect(result.progressIdxValid).toBe(true);
  });

  it("progressIdxValid is false when progressIdx exceeds lastIdx", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.appendEvents(saveId, [{ type: "a", at: 0, payload: {} }]);
    // Force progressIdx ahead of the event log by patching the doc directly.
    const doc = await db.saves.findOne(saveId).exec();
    await doc!.incrementalPatch({ progressIdx: 99 });

    const result = await inspectSave(db, saveId);
    expect(result.progressIdxValid).toBe(false);
  });

  it("reports multiple event types across multiple appends", async () => {
    const saveId = await store.createSave(makeSetup());
    await store.appendEvents(saveId, [
      { type: "hit", at: 0, payload: {} },
      { type: "hit", at: 1, payload: {} },
    ]);
    await store.appendEvents(saveId, [
      { type: "strike", at: 2, payload: {} },
      { type: "ball", at: 3, payload: {} },
      { type: "ball", at: 4, payload: {} },
    ]);
    const result = await inspectSave(db, saveId);

    expect(result.eventCount).toBe(5);
    expect(result.countByType.hit).toBe(2);
    expect(result.countByType.strike).toBe(1);
    expect(result.countByType.ball).toBe(2);
    expect(result.idxGaps).toEqual([]);
  });
});

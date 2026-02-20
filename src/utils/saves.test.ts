import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeState } from "@test/testHelpers";
import * as rngModule from "@utils/rng";

import {
  AUTO_SAVE_KEY,
  clearAutoSave,
  deleteSave,
  EXPORT_VERSION,
  exportSave,
  importSave,
  loadAutoSave,
  loadSaves,
  MAX_SAVES,
  restoreSaveRng,
  SAVE_SIGNING_KEY,
  saveGame,
  SAVES_KEY,
  type SaveSlot,
  writeAutoSave,
} from "./saves";

const makeSlot = (
  overrides: Partial<SaveSlot> = {},
): Omit<SaveSlot, "id" | "createdAt" | "updatedAt"> => ({
  name: "Test Game",
  seed: "abc",
  progress: 5,
  managerActions: [],
  setup: { homeTeam: "Home", awayTeam: "Away", strategy: "balanced", managedTeam: 0 },
  state: makeState(),
  ...overrides,
});

describe("saves utils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("loadSaves", () => {
    it("returns empty array when nothing stored", () => {
      expect(loadSaves()).toEqual([]);
    });

    it("returns parsed saves from localStorage", () => {
      const slot = saveGame(makeSlot());
      expect(loadSaves()).toHaveLength(1);
      expect(loadSaves()[0].id).toBe(slot.id);
    });

    it("returns empty array on corrupt localStorage", () => {
      localStorage.setItem(SAVES_KEY, "not-valid-json{{{");
      expect(loadSaves()).toEqual([]);
    });
  });

  describe("saveGame", () => {
    it("creates a new slot with id, createdAt, updatedAt", () => {
      const before = Date.now();
      const slot = saveGame(makeSlot({ name: "My Game" }));
      expect(slot.id).toBeTruthy();
      expect(slot.name).toBe("My Game");
      expect(slot.createdAt).toBeGreaterThanOrEqual(before);
      expect(slot.updatedAt).toBeGreaterThanOrEqual(before);
    });

    it("persists to localStorage", () => {
      saveGame(makeSlot());
      expect(localStorage.getItem(SAVES_KEY)).not.toBeNull();
    });

    it("updates existing slot when id matches", () => {
      const slot = saveGame(makeSlot({ name: "Original" }));
      const updated = saveGame({ ...makeSlot({ name: "Updated" }), id: slot.id });
      expect(loadSaves()).toHaveLength(1);
      expect(loadSaves()[0].name).toBe("Updated");
      expect(updated.id).toBe(slot.id);
      expect(updated.createdAt).toBe(slot.createdAt);
    });

    it("evicts the oldest slot when MAX_SAVES exceeded", () => {
      for (let i = 0; i < MAX_SAVES; i++) {
        saveGame(makeSlot({ name: `Slot ${i}` }));
      }
      expect(loadSaves()).toHaveLength(MAX_SAVES);
      saveGame(makeSlot({ name: "New slot" }));
      expect(loadSaves()).toHaveLength(MAX_SAVES);
      expect(loadSaves().some((s) => s.name === "New slot")).toBe(true);
    });

    it("saves all required fields", () => {
      const slot = saveGame(makeSlot({ seed: "xyz", progress: 10 }));
      expect(slot.seed).toBe("xyz");
      expect(slot.progress).toBe(10);
      expect(slot.state).toBeDefined();
      expect(slot.setup).toBeDefined();
    });
  });

  describe("deleteSave", () => {
    it("removes the slot with the given id", () => {
      const slot = saveGame(makeSlot());
      deleteSave(slot.id);
      expect(loadSaves()).toHaveLength(0);
    });

    it("does nothing for unknown id", () => {
      saveGame(makeSlot());
      deleteSave("nonexistent-id");
      expect(loadSaves()).toHaveLength(1);
    });
  });

  describe("exportSave", () => {
    it("wraps slot in version envelope with sig", () => {
      const slot = saveGame(makeSlot());
      const json = exportSave(slot);
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe(EXPORT_VERSION);
      expect(parsed.save.id).toBe(slot.id);
      expect(typeof parsed.sig).toBe("string");
      expect(parsed.sig).toHaveLength(8); // FNV-1a 32-bit = 8 hex chars
    });

    it("produces valid JSON", () => {
      const slot = saveGame(makeSlot());
      expect(() => JSON.parse(exportSave(slot))).not.toThrow();
    });

    it("produces a different sig for different save content", () => {
      const a = saveGame(makeSlot({ name: "Game A" }));
      const b = saveGame(makeSlot({ name: "Game B" }));
      const sigA = JSON.parse(exportSave(a)).sig;
      const sigB = JSON.parse(exportSave(b)).sig;
      expect(sigA).not.toBe(sigB);
    });
  });

  describe("importSave", () => {
    it("round-trips export/import correctly", () => {
      const slot = saveGame(makeSlot({ name: "Roundtrip" }));
      const json = exportSave(slot);
      const imported = importSave(json);
      expect(imported.id).toBe(slot.id);
      expect(imported.name).toBe("Roundtrip");
    });

    it("throws on invalid JSON", () => {
      expect(() => importSave("not json")).toThrow("Invalid JSON");
    });

    it("throws on wrong version", () => {
      const slot = saveGame(makeSlot());
      const json = JSON.stringify({ version: 99, sig: "00000000", save: slot });
      expect(() => importSave(json)).toThrow("Unsupported save version");
    });

    it("throws on missing save data", () => {
      const json = JSON.stringify({ version: EXPORT_VERSION, sig: "00000000", save: null });
      expect(() => importSave(json)).toThrow("Invalid save data");
    });

    it("throws on non-object input", () => {
      expect(() => importSave('"just a string"')).toThrow("Invalid save file");
    });

    it("throws on signature mismatch (tampered save)", () => {
      const slot = saveGame(makeSlot({ name: "Original" }));
      const envelope = JSON.parse(exportSave(slot));
      envelope.save.name = "Tampered";
      expect(() => importSave(JSON.stringify(envelope))).toThrow("signature mismatch");
    });

    it("rejects arbitrary JSON that was not produced by this app", () => {
      const foreign = JSON.stringify({
        version: EXPORT_VERSION,
        sig: "deadbeef",
        save: {
          seed: "abc",
          id: "x",
          name: "foreign",
          createdAt: 0,
          updatedAt: 0,
          progress: 0,
          managerActions: [],
          setup: {},
          state: {},
        },
      });
      expect(() => importSave(foreign)).toThrow("signature mismatch");
    });

    it("SAVE_SIGNING_KEY is the expected constant", () => {
      expect(SAVE_SIGNING_KEY).toBe("ballgame:saves:v1");
    });
  });

  describe("auto-save", () => {
    beforeEach(() => {
      vi.spyOn(rngModule, "getSeed").mockReturnValue(123456);
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("loadAutoSave returns null when nothing stored", () => {
      expect(loadAutoSave()).toBeNull();
    });

    it("writeAutoSave persists to AUTO_SAVE_KEY", () => {
      const state = makeState({
        inning: 3,
        pitchKey: 10,
        teams: ["Sox", "Cubs"] as [string, string],
      });
      writeAutoSave(state, "balanced", 0, false);
      expect(localStorage.getItem(AUTO_SAVE_KEY)).not.toBeNull();
    });

    it("loadAutoSave returns the written slot", () => {
      const state = makeState({
        inning: 4,
        pitchKey: 20,
        teams: ["Sox", "Cubs"] as [string, string],
      });
      writeAutoSave(state, "aggressive", 1, false);
      const slot = loadAutoSave();
      expect(slot?.id).toBe("autosave");
      expect(slot?.seed).toBe((123456).toString(36));
      expect(slot?.progress).toBe(20);
      expect(slot?.setup.strategy).toBe("aggressive");
      expect(slot?.setup.managedTeam).toBe(1);
    });

    it("writeAutoSave overwrites the previous auto-save", () => {
      const stateA = makeState({ inning: 2 });
      const stateB = makeState({ inning: 5 });
      writeAutoSave(stateA, "balanced", 0, false);
      writeAutoSave(stateB, "power", 1, false);
      expect(loadAutoSave()?.setup.strategy).toBe("power");
    });

    it("clearAutoSave removes the auto-save", () => {
      writeAutoSave(makeState(), "balanced", 0, false);
      clearAutoSave();
      expect(loadAutoSave()).toBeNull();
    });

    it("writeAutoSave does not affect the manual saves list", () => {
      saveGame(makeSlot({ name: "Manual" }));
      writeAutoSave(makeState(), "balanced", 0, false);
      expect(loadSaves()).toHaveLength(1);
      expect(loadSaves()[0].name).toBe("Manual");
    });

    it("writeAutoSave stores rngState from getRngState()", () => {
      vi.spyOn(rngModule, "getRngState").mockReturnValue(999888);
      writeAutoSave(makeState(), "balanced", 0, false);
      expect(loadAutoSave()?.rngState).toBe(999888);
    });

    it("writeAutoSave stores rngState as undefined when getRngState returns null", () => {
      vi.spyOn(rngModule, "getRngState").mockReturnValue(null);
      writeAutoSave(makeState(), "balanced", 0, false);
      // undefined fields are omitted from JSON, so rngState should be undefined
      expect(loadAutoSave()?.rngState).toBeUndefined();
    });

    it("auto-save name includes team names and inning", () => {
      const state = makeState({ teams: ["Red Sox", "Yankees"] as [string, string], inning: 7 });
      writeAutoSave(state, "contact", 0, false);
      expect(loadAutoSave()?.name).toContain("Red Sox");
      expect(loadAutoSave()?.name).toContain("Inning 7");
    });
  });

  describe("restoreSaveRng", () => {
    it("calls restoreRng with slot.rngState when present", () => {
      const restoreSpy = vi.spyOn(rngModule, "restoreRng");
      const slot = saveGame(makeSlot({ rngState: 42 }));
      restoreSaveRng(slot);
      expect(restoreSpy).toHaveBeenCalledWith(42);
    });

    it("does NOT call restoreRng when slot.rngState is undefined", () => {
      const restoreSpy = vi.spyOn(rngModule, "restoreRng");
      const slot = saveGame(makeSlot()); // no rngState
      restoreSaveRng(slot);
      expect(restoreSpy).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Deterministic replay — game sequence is preserved after save + load
// ---------------------------------------------------------------------------
describe("deterministic replay — save/load pitch sequence", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("same random values produced after restoreRng, regardless of manager actions taken", async () => {
    const rng = await import("./rng");
    rng.initSeedFromUrl({ writeToUrl: false });

    // Simulate 20 pitches (manager mode actions don't consume rng calls).
    for (let i = 0; i < 20; i++) rng.random();
    const rngStateAtSave = rng.getRngState()!;

    // Original game: next 8 values.
    const original8 = Array.from({ length: 8 }, () => rng.random());

    // Restore (simulates loading the save).
    rng.restoreRng(rngStateAtSave);
    const restored8 = Array.from({ length: 8 }, () => rng.random());

    expect(restored8).toEqual(original8);
  });

  it("auto-save captures rngState and restoreSaveRng reproduces identical pitch sequence", async () => {
    const rng = await import("./rng");
    const savesModule = await import("./saves");

    rng.initSeedFromUrl({ writeToUrl: false });

    // Simulate 25 pitches.
    for (let i = 0; i < 25; i++) rng.random();

    // Auto-save after a half-inning (writeAutoSave calls getRngState() internally).
    const state = makeState({ pitchKey: 25, inning: 4 });
    savesModule.writeAutoSave(state, "balanced", 0, false);

    // Continue original game for 6 more pitches.
    const originalNext6 = Array.from({ length: 6 }, () => rng.random());

    // "Page reload" — load the auto-save and restore the PRNG.
    const slot = savesModule.loadAutoSave()!;
    savesModule.restoreSaveRng(slot);

    // Next 6 values after restore must be identical.
    const restoredNext6 = Array.from({ length: 6 }, () => rng.random());
    expect(restoredNext6).toEqual(originalNext6);
  });

  it("manual save captures rngState and produces identical pitch sequence after load", async () => {
    const rng = await import("./rng");
    const savesModule = await import("./saves");

    rng.initSeedFromUrl({ writeToUrl: false });

    // Simulate 30 pitches with manager actions in the log (actions don't touch PRNG).
    for (let i = 0; i < 30; i++) rng.random();

    const savedSlot = savesModule.saveGame({
      name: "Determinism test",
      seed: (rng.getSeed() ?? 0).toString(36),
      rngState: rng.getRngState() ?? undefined,
      progress: 30,
      managerActions: ["5:steal:0:78", "12:bunt", "20:skip"], // actions don't affect PRNG
      setup: { homeTeam: "Home", awayTeam: "Away", strategy: "aggressive", managedTeam: 1 },
      state: makeState({ pitchKey: 30, decisionLog: ["5:steal:0:78", "12:bunt", "20:skip"] }),
    });

    // Original game: next 7 values.
    const originalNext7 = Array.from({ length: 7 }, () => rng.random());

    // Load save and restore PRNG.
    savesModule.restoreSaveRng(savedSlot);

    // After restore, next 7 values must be identical.
    const restoredNext7 = Array.from({ length: 7 }, () => rng.random());
    expect(restoredNext7).toEqual(originalNext7);
  });

  it("multiple save+load cycles all produce identical subsequent pitch values", async () => {
    const rng = await import("./rng");
    rng.initSeedFromUrl({ writeToUrl: false });

    // Advance to position 10 and capture.
    for (let i = 0; i < 10; i++) rng.random();
    const state10 = rng.getRngState()!;

    // Advance to position 20 and capture.
    for (let i = 0; i < 10; i++) rng.random();
    const state20 = rng.getRngState()!;

    // Record what comes next from position 20.
    const fromPos20 = Array.from({ length: 5 }, () => rng.random());

    // Restore to pos 20 and verify.
    rng.restoreRng(state20);
    expect(Array.from({ length: 5 }, () => rng.random())).toEqual(fromPos20);

    // Restore to pos 10, advance 10, verify we arrive at the same pos20 state.
    rng.restoreRng(state10);
    for (let i = 0; i < 10; i++) rng.random();
    expect(rng.getRngState()).toBe(state20);

    // And from here the next 5 should still match.
    expect(Array.from({ length: 5 }, () => rng.random())).toEqual(fromPos20);
  });
});

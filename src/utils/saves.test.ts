import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { makeState } from "@test/testHelpers";

import {
  deleteSave,
  EXPORT_VERSION,
  exportSave,
  importSave,
  loadSaves,
  MAX_SAVES,
  SAVE_SIGNING_KEY,
  saveGame,
  SAVES_KEY,
  type SaveSlot,
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
});

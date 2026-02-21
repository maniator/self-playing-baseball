import { describe, expect, it, vi } from "vitest";

import * as rngModule from "@utils/rng";

import {
  EXPORT_VERSION,
  exportSave,
  importSave,
  restoreSaveRng,
  SAVE_SIGNING_KEY,
  type SaveSlot,
} from "./saves";

/** Minimal SaveSlot for export/import tests — id/timestamps added inline. */
const makeSlot = (overrides: Partial<SaveSlot> = {}): SaveSlot => ({
  id: "slot-1",
  name: "Test Game",
  seed: "abc",
  progress: 5,
  createdAt: 1000,
  updatedAt: 2000,
  managerActions: [],
  setup: {
    homeTeam: "Home",
    awayTeam: "Away",
    strategy: "balanced",
    managedTeam: 0,
    managerMode: false,
  },
  state: {
    inning: 1,
    score: [0, 0],
    teams: ["Away", "Home"],
    baseLayout: [0, 0, 0],
    outs: 0,
    strikes: 0,
    balls: 0,
    atBat: 0,
    gameOver: false,
    pendingDecision: null,
    onePitchModifier: null,
    pitchKey: 0,
    decisionLog: [],
    suppressNextDecision: false,
    pinchHitterStrategy: null,
    defensiveShift: false,
    defensiveShiftOffered: false,
    batterIndex: [0, 0],
    inningRuns: [[], []],
    playLog: [],
    playerOverrides: [{}, {}],
    lineupOrder: [[], []],
  },
  ...overrides,
});

describe("exportSave / importSave (saves.signing)", () => {
  it("wraps slot in version envelope with sig", () => {
    const slot = makeSlot();
    const json = exportSave(slot);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(EXPORT_VERSION);
    expect(parsed.save.id).toBe(slot.id);
    expect(typeof parsed.sig).toBe("string");
    expect(parsed.sig).toHaveLength(8); // FNV-1a 32-bit = 8 hex chars
  });

  it("produces valid JSON", () => {
    expect(() => JSON.parse(exportSave(makeSlot()))).not.toThrow();
  });

  it("produces a different sig for different save content", () => {
    const sigA = JSON.parse(exportSave(makeSlot({ name: "Game A" }))).sig;
    const sigB = JSON.parse(exportSave(makeSlot({ name: "Game B" }))).sig;
    expect(sigA).not.toBe(sigB);
  });

  it("round-trips export/import correctly", () => {
    const slot = makeSlot({ name: "Roundtrip" });
    const imported = importSave(exportSave(slot));
    expect(imported.id).toBe(slot.id);
    expect(imported.name).toBe("Roundtrip");
  });

  it("throws on invalid JSON", () => {
    expect(() => importSave("not json")).toThrow("Invalid JSON");
  });

  it("throws on wrong version", () => {
    const json = JSON.stringify({ version: 99, sig: "00000000", save: makeSlot() });
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
    const envelope = JSON.parse(exportSave(makeSlot({ name: "Original" })));
    envelope.save.name = "Tampered";
    expect(() => importSave(JSON.stringify(envelope))).toThrow("signature mismatch");
  });

  it("SAVE_SIGNING_KEY is the expected constant", () => {
    expect(SAVE_SIGNING_KEY).toBe("ballgame:saves:v1");
  });
});

describe("restoreSaveRng", () => {
  it("calls restoreRng with slot.rngState when present", () => {
    const restoreSpy = vi.spyOn(rngModule, "restoreRng");
    restoreSaveRng({ rngState: 42 });
    expect(restoreSpy).toHaveBeenCalledWith(42);
    restoreSpy.mockRestore();
  });

  it("does NOT call restoreRng when slot.rngState is undefined", () => {
    const restoreSpy = vi.spyOn(rngModule, "restoreRng");
    restoreSaveRng({});
    expect(restoreSpy).not.toHaveBeenCalled();
    restoreSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Deterministic RNG — restoreRng reproduces identical values
// ---------------------------------------------------------------------------
describe("deterministic replay — RNG restore", () => {
  it("same random values produced after restoreRng", async () => {
    const rng = await import("./rng");
    rng.initSeedFromUrl({ writeToUrl: false });

    for (let i = 0; i < 20; i++) rng.random();
    const rngStateAtSave = rng.getRngState()!;

    const original8 = Array.from({ length: 8 }, () => rng.random());
    rng.restoreRng(rngStateAtSave);
    const restored8 = Array.from({ length: 8 }, () => rng.random());

    expect(restored8).toEqual(original8);
  });

  it("multiple restore cycles all produce identical subsequent values", async () => {
    const rng = await import("./rng");
    rng.initSeedFromUrl({ writeToUrl: false });

    for (let i = 0; i < 10; i++) rng.random();
    const state10 = rng.getRngState()!;
    for (let i = 0; i < 10; i++) rng.random();
    const state20 = rng.getRngState()!;
    const fromPos20 = Array.from({ length: 5 }, () => rng.random());

    rng.restoreRng(state20);
    expect(Array.from({ length: 5 }, () => rng.random())).toEqual(fromPos20);

    rng.restoreRng(state10);
    for (let i = 0; i < 10; i++) rng.random();
    expect(rng.getRngState()).toBe(state20);
    expect(Array.from({ length: 5 }, () => rng.random())).toEqual(fromPos20);
  });
});

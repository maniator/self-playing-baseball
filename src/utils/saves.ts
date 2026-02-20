import type { State, Strategy } from "@context/index";
import { getRngState, getSeed, restoreRng } from "@utils/rng";

export const SAVES_KEY = "ballgame:saves:v1";
export const MAX_SAVES = 3;
export const EXPORT_VERSION = 1 as const;

/**
 * A fixed key mixed into the FNV-1a hash of every exported save.
 * Not a cryptographic secret — the key is public — but it reliably rejects
 * JSON blobs that were not produced by this app, and catches accidental corruption.
 */
export const SAVE_SIGNING_KEY = "ballgame:saves:v1";

// FNV-1a 32-bit: fast, deterministic, no dependencies.
const fnv1a = (str: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
};

const signSave = (save: SaveSlot): string => fnv1a(SAVE_SIGNING_KEY + JSON.stringify(save));

/** Returns the current seed as a base-36 string, falling back to "0". */
export const currentSeedStr = (): string => (getSeed() ?? 0).toString(36);

export interface SaveSetup {
  homeTeam: string;
  awayTeam: string;
  strategy: Strategy;
  managedTeam: 0 | 1;
}

export interface SaveSlot {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  seed: string;
  /** PRNG internal state at save time — restores identical pitch sequences on load. */
  rngState?: number;
  progress: number;
  managerActions: string[];
  setup: SaveSetup;
  state: State;
}

export interface ExportedSave {
  version: typeof EXPORT_VERSION;
  /** FNV-1a signature of SAVE_SIGNING_KEY + JSON.stringify(save) */
  sig: string;
  save: SaveSlot;
}

/** Minimal structural check — ensures a parsed object is safe to use as SaveSlot. */
const isValidSaveSlot = (slot: unknown): slot is SaveSlot => {
  if (!slot || typeof slot !== "object") return false;
  const s = slot as Record<string, unknown>;
  return typeof s.id === "string" && typeof s.seed === "string" && s.state != null;
};

/** localStorage.setItem wrapper that silently drops QuotaExceededError. */
const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage full or unavailable — ignore
  }
};

export const loadSaves = (): SaveSlot[] => {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSaveSlot);
  } catch {
    return [];
  }
};

const persistSaves = (saves: SaveSlot[]): void => {
  safeSetItem(SAVES_KEY, JSON.stringify(saves));
};

export const saveGame = (
  slot: Omit<SaveSlot, "id" | "createdAt" | "updatedAt"> & { id?: string },
): SaveSlot => {
  const saves = loadSaves();
  const now = Date.now();

  if (slot.id) {
    const idx = saves.findIndex((s) => s.id === slot.id);
    if (idx !== -1) {
      const updated: SaveSlot = { ...saves[idx], ...slot, id: slot.id, updatedAt: now };
      saves[idx] = updated;
      persistSaves(saves);
      return updated;
    }
  }

  const newSlot: SaveSlot = {
    ...slot,
    id: slot.id ?? `save_${now}`,
    createdAt: now,
    updatedAt: now,
  };

  if (saves.length >= MAX_SAVES) {
    const oldest = saves.reduce((a, b) => (a.updatedAt < b.updatedAt ? a : b));
    saves.splice(
      saves.findIndex((s) => s.id === oldest.id),
      1,
    );
  }

  saves.push(newSlot);
  persistSaves(saves);
  return newSlot;
};

export const deleteSave = (id: string): void => {
  persistSaves(loadSaves().filter((s) => s.id !== id));
};

// ─── Auto-save (separate from the 3-slot manual saves) ──────────────────────

export const AUTO_SAVE_KEY = "ballgame:autosave:v1";

export const loadAutoSave = (): SaveSlot | null => {
  try {
    const raw = localStorage.getItem(AUTO_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidSaveSlot(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeAutoSave = (state: State, strategy: Strategy, managedTeam: 0 | 1): void => {
  const slot: SaveSlot = {
    id: "autosave",
    name: `Auto-save — ${state.teams[0]} vs ${state.teams[1]} · Inning ${state.inning}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    seed: currentSeedStr(),
    rngState: getRngState() ?? undefined,
    progress: state.pitchKey,
    managerActions: state.decisionLog,
    setup: { homeTeam: state.teams[1], awayTeam: state.teams[0], strategy, managedTeam },
    state,
  };
  localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(slot));
};

export const clearAutoSave = (): void => {
  localStorage.removeItem(AUTO_SAVE_KEY);
};

/**
 * Restores the PRNG to the position it was at when `slot` was saved, so that
 * pitches after loading are identical to what they would have been in the
 * original game. No-op if the slot has no stored `rngState`.
 */
export const restoreSaveRng = (slot: SaveSlot): void => {
  if (slot.rngState != null) restoreRng(slot.rngState);
};

export const exportSave = (slot: SaveSlot): string => {
  const exported: ExportedSave = { version: EXPORT_VERSION, sig: signSave(slot), save: slot };
  return JSON.stringify(exported, null, 2);
};

export const importSave = (json: string): SaveSlot => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid save file");
  const { version, sig, save } = parsed as ExportedSave;
  if (version !== EXPORT_VERSION) throw new Error(`Unsupported save version: ${version}`);
  if (!save || typeof save.seed !== "string") throw new Error("Invalid save data");
  if (sig !== signSave(save))
    throw new Error("Save signature mismatch — file may be corrupted or from a different app");
  return save;
};

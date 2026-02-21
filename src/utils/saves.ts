import type { State, Strategy } from "@context/index";
import { getRngState, getSeed, restoreRng } from "@utils/rng";

import { isValidSaveSlot } from "./saves.signing";
// Re-export types and signing utilities so callers can import from a single place.
export type { ExportedSave, SaveSetup, SaveSlot } from "./saves.signing";
export { EXPORT_VERSION, exportSave, importSave, SAVE_SIGNING_KEY } from "./saves.signing";
import type { SaveSetup, SaveSlot } from "./saves.signing";

export const SAVES_KEY = "ballgame:saves:v1";
export const MAX_SAVES = 3;

/** Returns the current seed as a base-36 string, falling back to "0". */
export const currentSeedStr = (): string => (getSeed() ?? 0).toString(36);

/** localStorage.setItem wrapper that silently drops QuotaExceededError. */
const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage full or unavailable — ignore
  }
};

/** Parses a raw localStorage string into an array of valid SaveSlots. */
const parseSlotArray = (raw: string | null): SaveSlot[] => {
  try {
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSaveSlot);
  } catch {
    return [];
  }
};

/** Parses a raw localStorage string into a single valid SaveSlot or null. */
const parseSlot = (raw: string | null): SaveSlot | null => {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidSaveSlot(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Builds the variable fields shared by manual saves and auto-saves:
 * seed, rngState, progress, managerActions, setup, and state.
 * Both `saveGame` callers and `writeAutoSave` use this so the fields
 * are always assembled in one place.
 */
export const buildSlotFields = (
  state: State,
  setup: SaveSetup,
): Pick<SaveSlot, "seed" | "rngState" | "progress" | "managerActions" | "setup" | "state"> => ({
  seed: currentSeedStr(),
  rngState: getRngState() ?? undefined,
  progress: state.pitchKey,
  managerActions: state.decisionLog,
  setup,
  state,
});

export const loadSaves = (): SaveSlot[] => parseSlotArray(localStorage.getItem(SAVES_KEY));

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

export const loadAutoSave = (): SaveSlot | null => parseSlot(localStorage.getItem(AUTO_SAVE_KEY));

export const writeAutoSave = (
  state: State,
  strategy: Strategy,
  managedTeam: 0 | 1,
  managerMode: boolean,
): void => {
  const now = Date.now();
  const setup: SaveSetup = {
    homeTeam: state.teams[1],
    awayTeam: state.teams[0],
    strategy,
    managedTeam,
    managerMode,
  };
  const slot: SaveSlot = {
    id: "autosave",
    name: `Auto-save — ${state.teams[0]} vs ${state.teams[1]} · Inning ${state.inning}`,
    createdAt: now,
    updatedAt: now,
    ...buildSlotFields(state, setup),
  };
  safeSetItem(AUTO_SAVE_KEY, JSON.stringify(slot));
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

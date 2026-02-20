import type { State } from "@context/index";
import type { Strategy } from "@context/index";

export const SAVE_SIGNING_KEY = "ballgame:saves:v1";
export const EXPORT_VERSION = 1 as const;

export interface SaveSetup {
  homeTeam: string;
  awayTeam: string;
  strategy: Strategy;
  managedTeam: 0 | 1;
  managerMode: boolean;
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

/** Structural check — ensures a parsed object is safe to use as SaveSlot. */
export const isValidSaveSlot = (slot: unknown): slot is SaveSlot => {
  if (!slot || typeof slot !== "object") return false;
  const s = slot as Record<string, unknown>;
  if (typeof s.id !== "string" || typeof s.seed !== "string") return false;
  if (!s.state || typeof s.state !== "object") return false;
  if (!s.setup || typeof s.setup !== "object") return false;
  const setup = s.setup as Record<string, unknown>;
  if (typeof setup.homeTeam !== "string" || typeof setup.awayTeam !== "string") return false;
  if (typeof setup.strategy !== "string") return false;
  return true;
};

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
  if (!isValidSaveSlot(save)) throw new Error("Invalid save data");
  if (typeof sig !== "string" || sig !== signSave(save))
    throw new Error("Save signature mismatch — file may be corrupted or from a different app");
  return save;
};

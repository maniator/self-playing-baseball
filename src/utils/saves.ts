import { getSeed, restoreRng } from "@utils/rng";

export type { ExportedSave, SaveSetup, SaveSlot } from "./saves.signing";
export { EXPORT_VERSION, exportSave, importSave, SAVE_SIGNING_KEY } from "./saves.signing";

/** Returns the current seed as a base-36 string, falling back to "0". */
export const currentSeedStr = (): string => (getSeed() ?? 0).toString(36);

/**
 * Restores the PRNG to the position it was at when `slot` was saved, so that
 * pitches after loading are identical to what they would have been in the
 * original game. No-op if the slot has no stored `rngState`.
 */
export const restoreSaveRng = (slot: { rngState?: number }): void => {
  if (slot.rngState != null) restoreRng(slot.rngState);
};

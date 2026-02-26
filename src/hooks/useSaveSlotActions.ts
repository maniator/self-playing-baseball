import { downloadJson, saveFilename } from "@storage/saveIO";
import type { SaveDoc } from "@storage/types";
import { appLog } from "@utils/logger";

interface Params {
  /** Async function that deletes a save by ID. */
  deleteSave: (id: string) => Promise<void>;
  /** Async function that exports a save and returns the JSON string. */
  exportSave: (id: string) => Promise<string>;
  /** Called after a successful delete. */
  onDeleted?: (id: string) => void;
  /** Called when delete or export throws. Defaults to appLog.error. */
  onError?: (msg: string, err: unknown) => void;
}

export interface SaveSlotActionsResult {
  handleDelete: (id: string) => void;
  handleExport: (slot: SaveDoc) => void;
}

/**
 * Shared save-slot actions used by both SavesPage and useSavesModal.
 * Encapsulates the delete and export patterns so each consumer only
 * needs to provide its own storage implementation and callbacks.
 */
export const useSaveSlotActions = ({
  deleteSave,
  exportSave,
  onDeleted,
  onError,
}: Params): SaveSlotActionsResult => {
  const reportError = onError ?? ((msg, err) => appLog.error(`${msg}:`, err));

  const handleDelete = (id: string) => {
    deleteSave(id)
      .then(() => onDeleted?.(id))
      .catch((err: unknown) => reportError("Failed to delete save", err));
  };

  const handleExport = (slot: SaveDoc) => {
    exportSave(slot.id)
      .then((json) => downloadJson(json, saveFilename(slot.name)))
      .catch((err: unknown) => reportError("Failed to export save", err));
  };

  return { handleDelete, handleExport };
};

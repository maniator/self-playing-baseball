import * as React from "react";

import type {
  ImportCustomTeamsOptions,
  ImportCustomTeamsResult,
} from "@storage/customTeamExportImport";
import { readFileAsText } from "@storage/saveIO";

interface UseImportCustomTeamsOptions {
  /**
   * Called to perform the actual import; receives raw JSON string and optional options.
   * Pass `{ allowDuplicatePlayers: true }` when the user has confirmed they want to
   * proceed despite duplicate players.
   */
  importFn: (json: string, options?: ImportCustomTeamsOptions) => Promise<ImportCustomTeamsResult>;
  /** Called with the import result on success. */
  onSuccess: (result: ImportCustomTeamsResult) => void;
}

export interface UseImportCustomTeamsReturn {
  /** Current value of the paste-JSON textarea. */
  pasteJson: string;
  setPasteJson: (v: string) => void;
  /** Non-null when the last import attempt failed. */
  importError: string | null;
  /** True while an import is in-flight. */
  importing: boolean;
  /**
   * Non-null when the import was blocked because duplicate players were found.
   * Contains the raw JSON and the duplicate warning messages so the UI can prompt
   * the user.  Call `confirmDuplicateImport()` to proceed or `cancelDuplicateImport()`
   * to abort.
   */
  pendingDuplicateImport: { json: string; warnings: string[] } | null;
  /** Proceed with the blocked import — imports despite duplicate players. */
  confirmDuplicateImport: () => void;
  /** Cancel the blocked import — clears the pending state. */
  cancelDuplicateImport: () => void;
  /** Handle a file-input change event — reads the selected file and imports it. */
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Validate the paste textarea and trigger an import. */
  handlePasteImport: () => void;
  /** Read text from the system clipboard and put it in the textarea. */
  handlePasteFromClipboard: () => Promise<void>;
}

/**
 * Shared import logic for the custom teams import flow.
 * Handles file upload, paste JSON, clipboard paste, in-flight state, errors, and
 * the duplicate-player confirmation flow.
 */
export const useImportCustomTeams = ({
  importFn,
  onSuccess,
}: UseImportCustomTeamsOptions): UseImportCustomTeamsReturn => {
  const [pasteJson, setPasteJson] = React.useState("");
  const [importError, setImportError] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [pendingDuplicateImport, setPendingDuplicateImport] = React.useState<{
    json: string;
    warnings: string[];
  } | null>(null);

  const applyImport = (json: string, options?: ImportCustomTeamsOptions) => {
    setImportError(null);
    setImporting(true);
    importFn(json, options)
      .then((result) => {
        setImporting(false);
        if (result.requiresDuplicateConfirmation) {
          // Block the import and surface the duplicate warnings for user confirmation.
          setPendingDuplicateImport({ json, warnings: result.duplicatePlayerWarnings });
          return;
        }
        setPasteJson("");
        setPendingDuplicateImport(null);
        onSuccess(result);
      })
      .catch((err: unknown) => {
        setImporting(false);
        const raw = err instanceof Error ? err.message : String(err);
        setImportError(raw);
      });
  };

  const confirmDuplicateImport = () => {
    if (!pendingDuplicateImport) return;
    const { json } = pendingDuplicateImport;
    setPendingDuplicateImport(null);
    applyImport(json, { allowDuplicatePlayers: true });
  };

  const cancelDuplicateImport = () => {
    setPendingDuplicateImport(null);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsText(file)
      .then((json) => applyImport(json))
      .catch(() => setImportError("Failed to read file"));
    e.target.value = "";
  };

  const handlePasteImport = () => {
    const trimmed = pasteJson.trim();
    if (!trimmed) {
      setImportError("Please paste team JSON before importing.");
      return;
    }
    applyImport(trimmed);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPasteJson(text);
    } catch {
      setImportError("Could not read clipboard. Please paste manually.");
    }
  };

  return {
    pasteJson,
    setPasteJson,
    importError,
    importing,
    pendingDuplicateImport,
    confirmDuplicateImport,
    cancelDuplicateImport,
    handleFileImport,
    handlePasteImport,
    handlePasteFromClipboard,
  };
};

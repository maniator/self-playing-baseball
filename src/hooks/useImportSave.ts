import * as React from "react";

import { readFileAsText } from "@storage/saveIO";
import type { SaveDoc } from "@storage/types";

const SIGNATURE_RE = /signature|invalid|corrupt/i;

/** Default user-friendly error formatter used by SavesPage. */
export const friendlyImportError = (raw: string): string =>
  SIGNATURE_RE.test(raw)
    ? "The file you selected is not a valid Ballgame save file."
    : "Import failed. Please check the file and try again.";

interface UseImportSaveOptions {
  /** Called to perform the actual import; receives raw JSON string. */
  importFn: (json: string) => Promise<SaveDoc>;
  /** Called with the imported SaveDoc on success. */
  onSuccess: (save: SaveDoc) => void;
  /**
   * Optional error message formatter.
   * Defaults to {@link friendlyImportError} (user-facing friendly messages).
   * Pass `(raw) => raw` to preserve the original error message (e.g. in SavesModal).
   */
  formatError?: (raw: string) => string;
}

export interface UseImportSaveReturn {
  /** Current value of the paste-JSON textarea. */
  pasteJson: string;
  setPasteJson: (v: string) => void;
  /** Non-null when the last import attempt failed. */
  importError: string | null;
  /**
   * True while an import is in-flight.
   * Use to disable import buttons and prevent accidental duplicate submissions.
   */
  importing: boolean;
  /** Handle a file-input change event — reads the selected file and imports it. */
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Validate the paste textarea and trigger an import. */
  handlePasteImport: () => void;
  /** Read text from the system clipboard and put it in the textarea. */
  handlePasteFromClipboard: () => Promise<void>;
}

/**
 * Shared import logic used by both SavesPage (full-page) and SavesModal (in-game dialog).
 *
 * Handles paste-JSON input, file upload, clipboard paste, in-flight loading state,
 * and error formatting. The caller supplies the actual import function and a success
 * callback so each consumer can react appropriately (navigate vs close dialog).
 */
export const useImportSave = ({
  importFn,
  onSuccess,
  formatError = friendlyImportError,
}: UseImportSaveOptions): UseImportSaveReturn => {
  const [pasteJson, setPasteJson] = React.useState("");
  const [importError, setImportError] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState(false);

  const applyImport = (json: string) => {
    setImportError(null);
    setImporting(true);
    importFn(json)
      .then((importedSave) => {
        setPasteJson("");
        setImporting(false);
        onSuccess(importedSave);
      })
      .catch((err: unknown) => {
        setImporting(false);
        const raw = err instanceof Error ? err.message : String(err);
        setImportError(formatError(raw));
      });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsText(file)
      .then(applyImport)
      .catch(() => setImportError("Failed to read file"));
    e.target.value = "";
  };

  const handlePasteImport = () => {
    const trimmed = pasteJson.trim();
    if (!trimmed) {
      setImportError("Please paste save JSON before importing.");
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
    handleFileImport,
    handlePasteImport,
    handlePasteFromClipboard,
  };
};

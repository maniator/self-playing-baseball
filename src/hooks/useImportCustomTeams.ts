import * as React from "react";

import type { ImportCustomTeamsResult } from "@storage/customTeamExportImport";
import { readFileAsText } from "@storage/saveIO";

interface UseImportCustomTeamsOptions {
  /** Called to perform the actual import; receives raw JSON string. */
  importFn: (json: string) => Promise<ImportCustomTeamsResult>;
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
  /** Handle a file-input change event — reads the selected file and imports it. */
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Validate the paste textarea and trigger an import. */
  handlePasteImport: () => void;
  /** Read text from the system clipboard and put it in the textarea. */
  handlePasteFromClipboard: () => Promise<void>;
}

/**
 * Shared import logic for the custom teams import flow.
 * Handles file upload, paste JSON, clipboard paste, in-flight state, and errors.
 */
export const useImportCustomTeams = ({
  importFn,
  onSuccess,
}: UseImportCustomTeamsOptions): UseImportCustomTeamsReturn => {
  const [pasteJson, setPasteJson] = React.useState("");
  const [importError, setImportError] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState(false);

  const applyImport = (json: string) => {
    setImportError(null);
    setImporting(true);
    importFn(json)
      .then((result) => {
        setPasteJson("");
        setImporting(false);
        onSuccess(result);
      })
      .catch((err: unknown) => {
        setImporting(false);
        const raw = err instanceof Error ? err.message : String(err);
        setImportError(raw);
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
    handleFileImport,
    handlePasteImport,
    handlePasteFromClipboard,
  };
};

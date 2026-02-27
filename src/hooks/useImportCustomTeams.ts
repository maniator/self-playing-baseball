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
  /** Non-null when the last import attempt failed. */
  importError: string | null;
  /** True while an import is in-flight. */
  importing: boolean;
  /** Handle a file-input change event — reads the selected file and imports it. */
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Shared import-from-file logic for the custom teams import flow.
 * Handles file upload, in-flight loading state, and error display.
 */
export const useImportCustomTeams = ({
  importFn,
  onSuccess,
}: UseImportCustomTeamsOptions): UseImportCustomTeamsReturn => {
  const [importError, setImportError] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState(false);

  const applyImport = (json: string) => {
    setImportError(null);
    setImporting(true);
    importFn(json)
      .then((result) => {
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

  return { importError, importing, handleFileImport };
};

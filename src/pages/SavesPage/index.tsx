import * as React from "react";

import { useNavigate, useOutletContext } from "react-router-dom";

import type { AppShellOutletContext } from "@components/AppShell";
import SaveSlotList from "@components/SaveSlotList";
import { useImportSave } from "@hooks/useImportSave";
import { downloadJson, saveFilename } from "@storage/saveIO";
import { SaveStore } from "@storage/saveStore";
import type { SaveDoc } from "@storage/types";
import { appLog } from "@utils/logger";

import {
  ActionBtn,
  BackBtn,
  EmptyState,
  ErrorMessage,
  FileInput,
  ImportSection,
  ImportSectionTitle,
  LoadingState,
  PageContainer,
  PageHeader,
  PageTitle,
  PasteActions,
  PasteTextarea,
} from "./styles";

/**
 * Standalone Exhibition Saves page.
 *
 * Loads saves directly from SaveStore (non-reactive) rather than via the
 * reactive RxDB hook so it can live outside the <RxDatabaseProvider> tree.
 * The "Load" action is routed through AppShell outlet context so AppShell
 * can store the pending save, mount the Game, and navigate to /game.
 */
const SavesPage: React.FunctionComponent = () => {
  const navigate = useNavigate();
  const { onLoadSave } = useOutletContext<AppShellOutletContext>();
  const [saves, setSaves] = React.useState<SaveDoc[]>([]);
  const [loading, setLoading] = React.useState(true);

  const {
    pasteJson,
    setPasteJson,
    importError,
    importing,
    handleFileImport,
    handlePasteImport,
    handlePasteFromClipboard,
  } = useImportSave({
    importFn: SaveStore.importRxdbSave.bind(SaveStore),
    onSuccess: onLoadSave,
  });

  const loadSaves = React.useCallback(() => {
    setLoading(true);
    SaveStore.listSaves()
      .then(setSaves)
      .catch(() => setSaves([]))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadSaves();
  }, [loadSaves]);

  const handleDelete = (id: string) => {
    SaveStore.deleteSave(id)
      .then(() => setSaves((prev) => prev.filter((s) => s.id !== id)))
      .catch((err: unknown) => appLog.error("Failed to delete save:", err));
  };

  const handleExport = (slot: SaveDoc) => {
    SaveStore.exportRxdbSave(slot.id)
      .then((json) => downloadJson(json, saveFilename(slot.name)))
      .catch((err: unknown) => appLog.error("Failed to export save:", err));
  };

  return (
    <PageContainer data-testid="saves-page">
      <PageHeader>
        <BackBtn
          type="button"
          onClick={() => navigate("/")}
          data-testid="saves-page-back-button"
          aria-label="Back to Home"
        >
          ← Back to Home
        </BackBtn>
      </PageHeader>

      <PageTitle>💾 Exhibition Saves</PageTitle>

      {loading ? (
        <LoadingState>Loading saves…</LoadingState>
      ) : saves.length === 0 ? (
        <EmptyState data-testid="saves-page-empty">No saves yet.</EmptyState>
      ) : (
        <SaveSlotList
          saves={saves}
          onLoad={onLoadSave}
          onExport={handleExport}
          onDelete={handleDelete}
        />
      )}

      <ImportSection>
        <div>
          <ImportSectionTitle>Import from file</ImportSectionTitle>
          <FileInput
            type="file"
            accept=".json,application/json"
            onChange={handleFileImport}
            disabled={importing}
            data-testid="import-save-file-input"
          />
        </div>
        <div>
          <ImportSectionTitle>Paste save JSON</ImportSectionTitle>
          <PasteTextarea
            value={pasteJson}
            onChange={(e) => setPasteJson(e.target.value)}
            placeholder='{"version":1,"header":{…},"events":[…],"sig":"…"}'
            data-testid="paste-save-textarea"
            aria-label="Paste save JSON"
          />
          <PasteActions>
            <ActionBtn
              type="button"
              $variant="primary"
              onClick={handlePasteImport}
              disabled={importing}
              data-testid="paste-save-button"
            >
              {importing ? "Importing…" : "Import from text"}
            </ActionBtn>
            {typeof navigator !== "undefined" && navigator.clipboard && (
              <ActionBtn
                type="button"
                onClick={handlePasteFromClipboard}
                data-testid="paste-from-clipboard-button"
              >
                Paste from clipboard
              </ActionBtn>
            )}
          </PasteActions>
        </div>
      </ImportSection>

      {importError && <ErrorMessage data-testid="import-error">{importError}</ErrorMessage>}
    </PageContainer>
  );
};

export default SavesPage;

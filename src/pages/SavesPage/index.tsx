import * as React from "react";

import { resolveCustomIdsInString } from "@features/customTeams/adapters/customTeamAdapter";
import { useNavigate, useOutletContext } from "react-router";

import type { AppShellOutletContext } from "@components/AppShell";
import SaveSlotList from "@components/SaveSlotList";
import { useImportSave } from "@hooks/useImportSave";
import { useSaveSlotActions } from "@hooks/useSaveSlotActions";
import { customTeamsCollection } from "@storage/db";
import { SaveStore } from "@storage/saveStore";
import type { CustomTeamDoc, SaveDoc } from "@storage/types";

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
  const [customTeams, setCustomTeams] = React.useState<CustomTeamDoc[]>([]);

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
    Promise.all([SaveStore.listSaves(), customTeamsCollection().then((col) => col.find().exec())])
      .then(([saveDocs, teamDocs]) => {
        setSaves(saveDocs);
        setCustomTeams(teamDocs);
      })
      .catch(() => {
        setSaves([]);
        setCustomTeams([]);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadSaves();
  }, [loadSaves]);

  const { handleDelete, handleExport } = useSaveSlotActions({
    deleteSave: (id) => SaveStore.deleteSave(id),
    exportSave: (id) => SaveStore.exportRxdbSave(id),
    onDeleted: (id) => setSaves((prev) => prev.filter((s) => s.id !== id)),
  });

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
          resolveName={(name) => resolveCustomIdsInString(name, customTeams)}
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

import * as React from "react";

import { useNavigate, useOutletContext } from "react-router-dom";

import type { AppShellOutletContext } from "@components/AppShell";
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
  LoadingState,
  PageContainer,
  PageHeader,
  PageTitle,
  SaveActions,
  SaveCard,
  SaveDate,
  SaveInfo,
  SaveList,
  SaveName,
} from "./styles";

const formatDate = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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
  const [importError, setImportError] = React.useState<string | null>(null);

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
      .then((json) => {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ballgame-${slot.name
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-|-$/g, "")
          .toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err: unknown) => appLog.error("Failed to export save:", err));
  };

  const applyImport = (json: string) => {
    setImportError(null);
    SaveStore.importRxdbSave(json)
      .then((importedSave) => {
        onLoadSave(importedSave);
      })
      .catch((err: unknown) => {
        const raw = err instanceof Error ? err.message : String(err);
        const isSignature = /signature|invalid|corrupt/i.test(raw);
        setImportError(
          isSignature
            ? "The file you selected is not a valid Ballgame save file."
            : "Import failed. Please check the file and try again.",
        );
      });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") applyImport(result);
    };
    reader.onerror = () => setImportError("Failed to read file");
    reader.readAsText(file);
    e.target.value = "";
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
        <SaveList data-testid="saves-list">
          {saves.map((s) => (
            <SaveCard key={s.id} data-testid="saves-list-item">
              <SaveInfo>
                <SaveName>{s.name}</SaveName>
                <SaveDate data-testid="slot-date">{formatDate(s.updatedAt)}</SaveDate>
              </SaveInfo>
              <SaveActions>
                <ActionBtn
                  type="button"
                  $variant="primary"
                  onClick={() => onLoadSave(s)}
                  data-testid="load-save-button"
                >
                  Load
                </ActionBtn>
                <ActionBtn
                  type="button"
                  onClick={() => handleExport(s)}
                  data-testid="export-save-button"
                >
                  Export
                </ActionBtn>
                <ActionBtn
                  type="button"
                  $variant="danger"
                  onClick={() => handleDelete(s.id)}
                  aria-label="Delete save"
                  data-testid="delete-save-button"
                >
                  ✕
                </ActionBtn>
              </SaveActions>
            </SaveCard>
          ))}
        </SaveList>
      )}

      <ImportSection>
        <FileInput
          type="file"
          accept=".json,application/json"
          onChange={handleFileImport}
          data-testid="import-save-file-input"
        />
      </ImportSection>

      {importError && <ErrorMessage data-testid="import-error">{importError}</ErrorMessage>}
    </PageContainer>
  );
};

export default SavesPage;

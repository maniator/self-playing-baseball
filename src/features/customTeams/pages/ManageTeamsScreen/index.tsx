import * as React from "react";

import type { ImportCustomTeamsResult } from "@feat/customTeams/storage/customTeamExportImport";
import { CustomTeamStore } from "@feat/customTeams/storage/customTeamStore";
import { useCustomTeams } from "@shared/hooks/useCustomTeams";
import { useLocation, useNavigate, useParams } from "react-router";

import { downloadJson, teamsFilename } from "@storage/saveIO";

import CustomTeamEditor from "../../components/CustomTeamEditor";
import { useImportCustomTeams } from "../../hooks/useImportCustomTeams";
import {
  BackBtn,
  CreateBtn,
  DuplicateConfirmActions,
  DuplicateConfirmBanner,
  DuplicateConfirmList,
  DuplicateConfirmNote,
  DuplicateConfirmTitle,
  EditorLoading,
  EditorShell,
  EditorShellHeader,
  EmptyState,
  ErrorMessage,
  FileInput,
  HeaderActions,
  ImportExportBtn,
  ImportExportRow,
  ImportExportSection,
  ImportExportTitle,
  InfoBanner,
  NotFoundMsg,
  PasteActions,
  PasteTextarea,
  ScreenContainer,
  ScreenHeader,
  ScreenTitle,
  SuccessMessage,
  TeamList,
  TeamListLink,
} from "./styles";
import TeamListItem from "./TeamListItem";

type Props = {
  onBack: () => void;
  /** When true, shows a non-blocking info banner that edits won't affect the current game. */
  hasActiveGame?: boolean;
};

const formatImportSuccessMessage = (result: ImportCustomTeamsResult): string => {
  const count = result.created + result.remapped;
  if (count === 0) {
    if (result.skipped > 0) {
      return `${result.skipped} team(s) already exist — nothing new was imported.`;
    }
    return "No teams imported.";
  }
  const remapNote = result.remapped > 0 ? ` (${result.remapped} ID(s) remapped)` : "";
  const skippedNote = result.skipped > 0 ? ` (${result.skipped} already existed, skipped)` : "";
  const playerDupNote =
    result.duplicatePlayerWarnings.length > 0
      ? ` Player duplicate: ${result.duplicatePlayerWarnings[0]}`
      : "";
  return `Imported ${count} team(s).${remapNote}${skippedNote}${playerDupNote}`;
};

const ManageTeamsScreen: React.FunctionComponent<Props> = ({ onBack, hasActiveGame }) => {
  const { teams, loading, deleteTeam, refresh } = useCustomTeams();
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();
  const location = useLocation();
  const importFileRef = React.useRef<HTMLInputElement>(null);
  const [importSuccess, setImportSuccess] = React.useState<string | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);

  const {
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
  } = useImportCustomTeams({
    importFn: (json, options) => CustomTeamStore.importCustomTeams(json, options),
    onSuccess: (result) => {
      refresh();
      setImportSuccess(formatImportSuccessMessage(result));
    },
  });

  const handleExportTeam = async (id: string) => {
    try {
      setExportError(null);
      const json = await CustomTeamStore.exportCustomTeams([id]);
      downloadJson(json, teamsFilename());
    } catch {
      setExportError("Failed to export team. Please try again.");
    }
  };

  const handleExportAll = async () => {
    try {
      setExportError(null);
      const json = await CustomTeamStore.exportCustomTeams();
      downloadJson(json, teamsFilename());
    } catch {
      setExportError("Failed to export teams. Please try again.");
    }
  };

  const isCreating = location.pathname === "/teams/new";
  const isEditing = Boolean(teamId);
  const editingTeam = isEditing ? teams.find((t) => t.id === teamId) : undefined;
  const navigateToTeamCareerStats = (id: string) =>
    navigate(`/stats?team=${encodeURIComponent(id)}`);

  const editorHeader = (
    <EditorShellHeader>
      <BackBtn
        onClick={() => navigate("/teams")}
        data-testid="manage-teams-editor-back-button"
        aria-label="Back to team list"
      >
        ← Team List
      </BackBtn>
      {editingTeam && (
        <HeaderActions>
          <ImportExportBtn
            type="button"
            onClick={() => navigateToTeamCareerStats(editingTeam.id)}
            data-testid="manage-teams-editor-career-stats-button"
          >
            Career Stats
          </ImportExportBtn>
        </HeaderActions>
      )}
    </EditorShellHeader>
  );

  if (isCreating) {
    return (
      <EditorShell data-testid="manage-teams-editor-shell">
        {editorHeader}
        <CustomTeamEditor
          onSave={() => {
            refresh();
            navigate("/teams");
          }}
          onCancel={() => navigate("/teams")}
        />
      </EditorShell>
    );
  }

  if (isEditing) {
    if (loading) {
      return (
        <EditorShell data-testid="manage-teams-editor-shell">
          {editorHeader}
          <EditorLoading>Loading team…</EditorLoading>
        </EditorShell>
      );
    }
    if (!editingTeam) {
      return (
        <EditorShell data-testid="manage-teams-editor-shell">
          {editorHeader}
          <NotFoundMsg>
            Team not found.{" "}
            <TeamListLink onClick={() => navigate("/teams")}>Back to Team List</TeamListLink>
          </NotFoundMsg>
        </EditorShell>
      );
    }
    return (
      <EditorShell data-testid="manage-teams-editor-shell">
        {editorHeader}
        <CustomTeamEditor
          team={editingTeam}
          onSave={() => {
            refresh();
            navigate("/teams");
          }}
          onCancel={() => navigate("/teams")}
        />
      </EditorShell>
    );
  }

  return (
    <ScreenContainer data-testid="manage-teams-screen">
      <ScreenHeader>
        <BackBtn onClick={onBack} data-testid="manage-teams-back-button" aria-label="Back to Home">
          ← Back to Home
        </BackBtn>
      </ScreenHeader>

      <ScreenTitle>🏟️ Manage Teams</ScreenTitle>

      {hasActiveGame && (
        <InfoBanner>
          Changes to saved teams apply to future games only and will not affect your current game.
        </InfoBanner>
      )}

      <CreateBtn
        type="button"
        onClick={() => navigate("/teams/new")}
        data-testid="manage-teams-create-button"
      >
        + Create New Team
      </CreateBtn>

      {loading ? (
        <EmptyState>Loading teams…</EmptyState>
      ) : teams.length === 0 ? (
        <EmptyState>No custom teams yet. Create your first team!</EmptyState>
      ) : (
        <TeamList data-testid="custom-team-list">
          {teams.map((team) => (
            <TeamListItem
              key={team.id}
              team={team}
              onCareerStats={navigateToTeamCareerStats}
              onEdit={(id) => navigate(`/teams/${id}/edit`)}
              onDelete={deleteTeam}
              onExport={handleExportTeam}
            />
          ))}
        </TeamList>
      )}

      <ImportExportSection data-testid="teams-import-export-section">
        <ImportExportTitle>Import / Export Teams</ImportExportTitle>
        <ImportExportRow>
          {teams.length > 0 && (
            <ImportExportBtn
              type="button"
              onClick={handleExportAll}
              data-testid="export-all-teams-button"
            >
              ↓ Export All Teams
            </ImportExportBtn>
          )}
          <ImportExportBtn
            type="button"
            onClick={() => {
              setImportSuccess(null);
              importFileRef.current?.click();
            }}
            disabled={importing}
            data-testid="import-teams-button"
          >
            {importing ? "Importing…" : "↑ Import from File"}
          </ImportExportBtn>
          <FileInput
            ref={importFileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileImport}
            data-testid="import-teams-file-input"
            aria-label="Import teams file"
          />
        </ImportExportRow>
        <PasteTextarea
          value={pasteJson}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPasteJson(e.target.value)}
          placeholder='{"type":"customTeams","formatVersion":1,"payload":{"teams":[…]}}'
          data-testid="import-teams-paste-textarea"
          aria-label="Paste teams JSON"
        />
        <PasteActions>
          <ImportExportBtn
            type="button"
            onClick={() => {
              setImportSuccess(null);
              handlePasteImport();
            }}
            disabled={importing}
            data-testid="import-teams-paste-button"
          >
            {importing ? "Importing…" : "↑ Import from Text"}
          </ImportExportBtn>
          {typeof navigator !== "undefined" && navigator.clipboard && (
            <ImportExportBtn
              type="button"
              onClick={handlePasteFromClipboard}
              data-testid="import-teams-clipboard-button"
            >
              Paste from Clipboard
            </ImportExportBtn>
          )}
        </PasteActions>
        {exportError && <ErrorMessage data-testid="export-teams-error">{exportError}</ErrorMessage>}
        {importError && <ErrorMessage data-testid="import-teams-error">{importError}</ErrorMessage>}
        {pendingDuplicateImport && (
          <DuplicateConfirmBanner data-testid="teams-duplicate-banner" role="alert">
            <DuplicateConfirmTitle>⚠ Duplicate players detected</DuplicateConfirmTitle>
            <DuplicateConfirmList>
              {pendingDuplicateImport.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </DuplicateConfirmList>
            <DuplicateConfirmNote>
              These players may already be in your collection and will be duplicated if you
              continue.
            </DuplicateConfirmNote>
            <DuplicateConfirmActions>
              <ImportExportBtn
                type="button"
                onClick={confirmDuplicateImport}
                data-testid="teams-duplicate-confirm-button"
              >
                Import Anyway
              </ImportExportBtn>
              <ImportExportBtn
                type="button"
                onClick={cancelDuplicateImport}
                data-testid="teams-duplicate-cancel-button"
              >
                Cancel
              </ImportExportBtn>
            </DuplicateConfirmActions>
          </DuplicateConfirmBanner>
        )}
        {importSuccess && !importError && !pendingDuplicateImport && (
          <SuccessMessage data-testid="import-teams-success">{importSuccess}</SuccessMessage>
        )}
      </ImportExportSection>
    </ScreenContainer>
  );
};

export default ManageTeamsScreen;

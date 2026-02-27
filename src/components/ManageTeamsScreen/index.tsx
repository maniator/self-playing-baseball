import * as React from "react";

import { useLocation, useNavigate, useParams } from "react-router";

import CustomTeamEditor from "@components/CustomTeamEditor";
import { useCustomTeams } from "@hooks/useCustomTeams";
import { useImportCustomTeams } from "@hooks/useImportCustomTeams";
import type { ImportCustomTeamsResult } from "@storage/customTeamExportImport";
import { CustomTeamStore } from "@storage/customTeamStore";
import { downloadJson, teamsFilename } from "@storage/saveIO";

import {
  BackBtn,
  CreateBtn,
  EditorLoading,
  EditorShell,
  EditorShellHeader,
  EmptyState,
  ErrorMessage,
  FileInput,
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
  if (result.teams.length === 0) return "No teams imported.";
  const count = result.created + result.remapped;
  const remapNote = result.remapped > 0 ? ` (${result.remapped} ID(s) remapped)` : "";
  const dupNote =
    result.duplicateWarnings.length > 0 ? ` Note: ${result.duplicateWarnings[0]}` : "";
  const playerDupNote =
    result.duplicatePlayerWarnings.length > 0
      ? ` Player duplicate: ${result.duplicatePlayerWarnings[0]}`
      : "";
  return `Imported ${count} team(s).${remapNote}${dupNote}${playerDupNote}`;
};

const ManageTeamsScreen: React.FunctionComponent<Props> = ({ onBack, hasActiveGame }) => {
  const { teams, loading, deleteTeam, refresh } = useCustomTeams();
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();
  const location = useLocation();
  const importFileRef = React.useRef<HTMLInputElement>(null);
  const [importSuccess, setImportSuccess] = React.useState<string | null>(null);

  const {
    pasteJson,
    setPasteJson,
    importError,
    importing,
    handleFileImport,
    handlePasteImport,
    handlePasteFromClipboard,
  } = useImportCustomTeams({
    importFn: (json) => CustomTeamStore.importCustomTeams(json),
    onSuccess: (result) => {
      refresh();
      setImportSuccess(formatImportSuccessMessage(result));
    },
  });

  const handleExportTeam = async (id: string) => {
    const json = await CustomTeamStore.exportCustomTeams([id]);
    downloadJson(json, teamsFilename());
  };

  const handleExportAll = async () => {
    const json = await CustomTeamStore.exportCustomTeams();
    downloadJson(json, teamsFilename());
  };

  const isCreating = location.pathname === "/teams/new";
  const isEditing = Boolean(teamId);
  const editingTeam = isEditing ? teams.find((t) => t.id === teamId) : undefined;

  const editorHeader = (
    <EditorShellHeader>
      <BackBtn
        onClick={() => navigate("/teams")}
        data-testid="manage-teams-editor-back-button"
        aria-label="Back to team list"
      >
        ← Team List
      </BackBtn>
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
          onChange={(e) => setPasteJson(e.target.value)}
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
        {importError && <ErrorMessage data-testid="import-teams-error">{importError}</ErrorMessage>}
        {importSuccess && !importError && (
          <SuccessMessage data-testid="import-teams-success">{importSuccess}</SuccessMessage>
        )}
      </ImportExportSection>
    </ScreenContainer>
  );
};

export default ManageTeamsScreen;

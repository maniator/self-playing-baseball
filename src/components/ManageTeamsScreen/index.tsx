import * as React from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import CustomTeamEditor from "@components/CustomTeamEditor";
import { useCustomTeams } from "@hooks/useCustomTeams";

import {
  BackBtn,
  CreateBtn,
  EditorLoading,
  EditorShell,
  EditorShellHeader,
  EmptyState,
  InfoBanner,
  NotFoundMsg,
  ScreenContainer,
  ScreenHeader,
  ScreenTitle,
  TeamList,
  TeamListLink,
} from "./styles";
import TeamListItem from "./TeamListItem";

type Props = {
  onBack: () => void;
  /** When true, shows a non-blocking info banner that edits won't affect the current game. */
  hasActiveGame?: boolean;
};

const ManageTeamsScreen: React.FunctionComponent<Props> = ({ onBack, hasActiveGame }) => {
  const { teams, loading, deleteTeam, refresh } = useCustomTeams();
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();
  const location = useLocation();

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
            />
          ))}
        </TeamList>
      )}
    </ScreenContainer>
  );
};

export default ManageTeamsScreen;

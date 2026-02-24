import * as React from "react";

import CustomTeamEditor from "@components/CustomTeamEditor";
import { useCustomTeams } from "@hooks/useCustomTeams";

import {
  BackBtn,
  CreateBtn,
  EditorShell,
  EditorShellHeader,
  EmptyState,
  InfoBanner,
  ScreenContainer,
  ScreenHeader,
  ScreenTitle,
  TeamList,
} from "./styles";
import TeamListItem from "./TeamListItem";

type Props = {
  onBack: () => void;
  /** When true, shows a non-blocking info banner that edits won't affect the current game. */
  hasActiveGame?: boolean;
};

type View = "list" | "create" | { edit: string };

const ManageTeamsScreen: React.FunctionComponent<Props> = ({ onBack, hasActiveGame }) => {
  const { teams, loading, deleteTeam, refresh } = useCustomTeams();
  const [view, setView] = React.useState<View>("list");

  const editingTeam = typeof view === "object" ? teams.find((t) => t.id === view.edit) : undefined;

  if (view === "create" || typeof view === "object") {
    return (
      <EditorShell data-testid="manage-teams-editor-shell">
        <EditorShellHeader>
          <BackBtn
            onClick={() => setView("list")}
            data-testid="manage-teams-editor-back-button"
            aria-label="Back to team list"
          >
            ← Team List
          </BackBtn>
        </EditorShellHeader>
        <CustomTeamEditor
          team={editingTeam}
          onSave={() => {
            refresh();
            setView("list");
          }}
          onCancel={() => setView("list")}
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
        onClick={() => setView("create")}
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
              onEdit={(id) => setView({ edit: id })}
              onDelete={deleteTeam}
            />
          ))}
        </TeamList>
      )}
    </ScreenContainer>
  );
};

export default ManageTeamsScreen;

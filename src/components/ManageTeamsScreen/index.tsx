import * as React from "react";

import { useCustomTeams } from "@hooks/useCustomTeams";

import {
  BackBtn,
  CreateBtn,
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
  /** Called when the user wants to create or edit a team (editor rendered by parent). */
  onCreateTeam?: () => void;
  onEditTeam?: (id: string) => void;
};

const ManageTeamsScreen: React.FunctionComponent<Props> = ({
  onBack,
  hasActiveGame,
  onCreateTeam,
  onEditTeam,
}) => {
  const { teams, loading, deleteTeam } = useCustomTeams();

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

      <CreateBtn type="button" onClick={onCreateTeam} data-testid="manage-teams-create-button">
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
              onEdit={onEditTeam ?? (() => {})}
              onDelete={deleteTeam}
            />
          ))}
        </TeamList>
      )}
    </ScreenContainer>
  );
};

export default ManageTeamsScreen;

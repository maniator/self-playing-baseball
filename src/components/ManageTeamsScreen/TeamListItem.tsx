import * as React from "react";

import { customTeamToDisplayName } from "@features/customTeams/adapters/customTeamAdapter";

import type { CustomTeamDoc } from "@storage/types";

import { ActionBtn, TeamActions, TeamInfo, TeamListItemCard, TeamMeta, TeamName } from "./styles";

type Props = {
  team: CustomTeamDoc;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

const TeamListItem: React.FunctionComponent<Props> = ({ team, onEdit, onDelete }) => {
  const displayName = customTeamToDisplayName(team);
  const lineupCount = team.roster.lineup.length;
  const pitcherCount = team.roster.pitchers.length;
  const benchCount = team.roster.bench.length;

  const handleDelete = () => {
    if (window.confirm(`Delete "${displayName}"? This cannot be undone.`)) {
      onDelete(team.id);
    }
  };

  return (
    <TeamListItemCard data-testid="custom-team-list-item">
      <TeamInfo>
        <TeamName>{displayName}</TeamName>
        <TeamMeta>
          {lineupCount} batters · {pitcherCount} pitchers · {benchCount} bench
        </TeamMeta>
      </TeamInfo>
      <TeamActions>
        <ActionBtn
          type="button"
          onClick={() => onEdit(team.id)}
          data-testid="custom-team-edit-button"
        >
          Edit
        </ActionBtn>
        <ActionBtn
          type="button"
          $danger
          onClick={handleDelete}
          data-testid="custom-team-delete-button"
        >
          Delete
        </ActionBtn>
      </TeamActions>
    </TeamListItemCard>
  );
};

export default TeamListItem;

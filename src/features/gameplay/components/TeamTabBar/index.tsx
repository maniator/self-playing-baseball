import * as React from "react";

import { resolveTeamLabel } from "@feat/customTeams/adapters/customTeamAdapter";
import { useCustomTeams } from "@shared/hooks/useCustomTeams";

import { TabBtn, Tabs } from "./styles";

interface Props {
  teams: [string, string];
  activeTeam: 0 | 1;
  onSelect: (team: 0 | 1) => void;
}

const TeamTabBar: React.FunctionComponent<Props> = ({ teams, activeTeam, onSelect }) => {
  const { teams: customTeams } = useCustomTeams();
  const label = (t: string) => resolveTeamLabel(t, customTeams);

  return (
    <Tabs role="tablist" data-testid="team-tab-bar">
      <TabBtn
        $active={activeTeam === 0}
        type="button"
        role="tab"
        data-testid="team-tab-away"
        aria-selected={activeTeam === 0}
        onClick={() => onSelect(0)}
      >
        ▲ {label(teams[0])}
      </TabBtn>
      <TabBtn
        $active={activeTeam === 1}
        type="button"
        role="tab"
        data-testid="team-tab-home"
        aria-selected={activeTeam === 1}
        onClick={() => onSelect(1)}
      >
        ▼ {label(teams[1])}
      </TabBtn>
    </Tabs>
  );
};

export default TeamTabBar;

import * as React from "react";

import styled from "styled-components";

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
`;

const TabBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  background: ${({ $active }) => ($active ? "#1a3a5a" : "transparent")};
  border: 1px solid ${({ $active }) => ($active ? "#4a8abe" : "#333")};
  color: ${({ $active }) => ($active ? "#cce8ff" : "#666")};
  border-radius: 4px;
  padding: 3px 6px;
  font-family: inherit;
  font-size: 10px;
  cursor: pointer;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

interface Props {
  teams: [string, string];
  activeTeam: 0 | 1;
  onSelect: (team: 0 | 1) => void;
}

const TeamTabBar: React.FunctionComponent<Props> = ({ teams, activeTeam, onSelect }) => (
  <Tabs role="tablist">
    <TabBtn
      $active={activeTeam === 0}
      type="button"
      role="tab"
      data-testid="team-tab-away"
      aria-selected={activeTeam === 0}
      onClick={() => onSelect(0)}
    >
      ▲ {teams[0]}
    </TabBtn>
    <TabBtn
      $active={activeTeam === 1}
      type="button"
      role="tab"
      data-testid="team-tab-home"
      aria-selected={activeTeam === 1}
      onClick={() => onSelect(1)}
    >
      ▼ {teams[1]}
    </TabBtn>
  </Tabs>
);

export default TeamTabBar;

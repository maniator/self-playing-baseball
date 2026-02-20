import * as React from "react";

import styled from "styled-components";

import { useGameContext } from "@context/index";

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #888;
  margin-top: 12px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #333;
`;

const Toggle = styled.button`
  background: none;
  border: none;
  color: #555;
  font-size: 11px;
  cursor: pointer;
  padding: 0 2px;
  &:hover {
    color: #aaa;
  }
`;

const AnnouncementsArea = styled.div`
  overflow-y: auto;
  padding-right: 8px;
  max-height: 300px;
  min-height: 60px;
  @media (max-width: 800px) {
    min-height: auto;
    max-height: 25vh;
  }
`;

const EmptyState = styled.div`
  color: #555;
  font-size: 13px;
  padding: 12px 5px;
`;

const Log = styled.div`
  padding: 5px;
`;

const Announcements: React.FunctionComponent = () => {
  const { log } = useGameContext();
  const [expanded, setExpanded] = React.useState(false);

  return (
    <>
      <HeadingRow>
        <span>Play-by-play</span>
        <Toggle
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Collapse play-by-play" : "Expand play-by-play"}
        >
          {expanded ? "▼ hide" : "▶ show"}
        </Toggle>
      </HeadingRow>
      {expanded && (
        <AnnouncementsArea aria-live="polite" aria-atomic="false">
          {log.length === 0 ? (
            <EmptyState>Press &quot;Batter Up!&quot; to start the game.</EmptyState>
          ) : (
            log.map((announcement, idx) => <Log key={idx}>{announcement}</Log>)
          )}
        </AnnouncementsArea>
      )}
    </>
  );
};

export default Announcements;

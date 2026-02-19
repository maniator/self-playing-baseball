import * as React from "react";
import { GameContext } from "../Context";

import styled from "styled-components";

const AnnouncementsArea = styled.div`
  overflow-y: auto;
  padding-right: 8px;
  max-height: 500px;
  min-height: 100px;

  @media (max-width: 800px) {
    min-height: auto;
    max-height: 35vh;
  }
`;

const Heading = styled.div`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #888;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #333;
`;

const EmptyState = styled.div`
  color: #555;
  font-size: 13px;
  padding: 12px 5px;
`;

const Log = styled.div`
  padding: 5px;
`;

const Announcements: React.FunctionComponent<{}> = () => {
  const { log }: { log: string[] } = React.useContext(GameContext);

  return (
    <>
      <Heading>Play-by-play</Heading>
      <AnnouncementsArea>
        {log.length === 0
          ? <EmptyState>Press "Batter Up!" to start the game.</EmptyState>
          : log.map((announcement, idx) => <Log key={idx}>{announcement}</Log>)
        }
      </AnnouncementsArea>
    </>
  );
};

export default Announcements;

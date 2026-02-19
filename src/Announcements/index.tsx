import * as React from "react";
import { GameContext } from "../Context";

import styled from "styled-components";

const AnnouncementsArea = styled.div`
  height: calc(100% - 190px);
  overflow-y: auto;
  padding-right: 8px;

  @media (max-width: 800px) {
    height: auto;
    max-height: 35vh;
  }
`;

const Log = styled.div`
  padding: 5px;
`;

const Announcements: React.FunctionComponent<{}> = () => {
  const { log }: { log: string[] } = React.useContext(GameContext);

  return (
    <AnnouncementsArea>
      {log.map((announcement, idx) => <Log key={idx}>{announcement}</Log>)}
    </AnnouncementsArea>
  );
};

export default Announcements;

import * as React  from "react";
import { GameContext, State } from "../Context";

import { styled } from "styled-components";

const AnnouncementsArea = styled.div`
  height: calc(100% - 150px);
  overflow: scroll;
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
}

export default Announcements;

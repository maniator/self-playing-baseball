import * as React  from "react";
import { GameContext, State } from "../Context";

import styled from "styled-components";

const AnnouncementsArea = styled.div`
  padding: 20px;
`;

const Announcements: React.FunctionComponent<{}> = () => {
  const { log }: { log: string[] } = React.useContext(GameContext);

  return (
    <AnnouncementsArea>
      {log.map((announcement, idx) => <div key={idx}>{announcement}</div>)}
    </AnnouncementsArea>
  );
}

export default Announcements;

import * as React from "react";

import BatterButton from "../BatterButton";
import ScoreBoard from "../ScoreBoard";
import Diamond from "../Diamond";
import Announcements from "../Announcements";
import InstructionsModal from "../InstructionsModal";
import { GameContext } from "../Context";
import { GameDiv, GameInfo, Input, GameBody, LeftPanel, RightPanel } from "./styles";

type Props = {
  homeTeam: string;
  awayTeam: string;
};

const GameInner: React.FunctionComponent<Props> = ({ homeTeam, awayTeam }) => {
  const { dispatch, teams } = React.useContext(GameContext);

  React.useEffect(() => {
    dispatch({
      type: "setTeams",
      payload: [homeTeam, awayTeam]
    });
  }, []);

  const handleChangeTeam = (teamIdx) => (e) => {
    e.stopPropagation();
    const { target: { value } } = e;
    const newTeamNames = [...teams];
    newTeamNames[teamIdx] = value;
    dispatch({
      type: "setTeams",
      payload: newTeamNames
    });
  };

  return (
    <GameDiv>
      <GameInfo>
        <div>Welcome to the game!</div>
        <div>I hope you have a great time!</div>
        <div>
          The match-up is between <br />
          <label><Input value={teams[0]} onChange={handleChangeTeam(0)} /></label> and
          <label><Input value={teams[1]} onChange={handleChangeTeam(1)} /></label>!
        </div>

        <BatterButton />
        <InstructionsModal />
      </GameInfo>
      <GameBody>
        <LeftPanel>
          <Announcements />
        </LeftPanel>
        <RightPanel>
          <ScoreBoard />
          <Diamond />
        </RightPanel>
      </GameBody>
    </GameDiv>
  );
};

export default GameInner;

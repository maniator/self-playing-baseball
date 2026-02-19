import * as React from "react";

import GameControls from "../GameControls";
import ScoreBoard from "../ScoreBoard";
import Diamond from "../Diamond";
import Announcements from "../Announcements";
import HitLog from "../HitLog";
import LineScore from "../LineScore";
import InstructionsModal from "../InstructionsModal";
import { GameContext, useGameContext } from "../Context";
import { GameDiv, GameInfo, Input, GameBody, LeftPanel, RightPanel } from "./styles";

type Props = {
  homeTeam: string;
  awayTeam: string;
};

const GameInner: React.FunctionComponent<Props> = ({ homeTeam, awayTeam }) => {
  const { dispatch, teams } = useGameContext();

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

        <GameControls />
        <InstructionsModal />
      </GameInfo>
      <LineScore />
      <GameBody>
        <LeftPanel>
          <Announcements />
          <HitLog />
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

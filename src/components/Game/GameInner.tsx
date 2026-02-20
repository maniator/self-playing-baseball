import * as React from "react";

import Announcements from "@components/Announcements";
import Diamond from "@components/Diamond";
import GameControls from "@components/GameControls";
import HitLog from "@components/HitLog";
import InstructionsModal from "@components/InstructionsModal";
import LineScore from "@components/LineScore";
import { useGameContext } from "@context/index";

import { GameBody, GameDiv, GameInfo, Input, LeftPanel, RightPanel } from "./styles";

type Props = {
  homeTeam: string;
  awayTeam: string;
};

const GameInner: React.FunctionComponent<Props> = ({ homeTeam, awayTeam }) => {
  const { dispatch, teams } = useGameContext();

  React.useEffect(() => {
    dispatch({ type: "setTeams", payload: [homeTeam, awayTeam] });
  }, [dispatch, homeTeam, awayTeam]);

  const handleChangeTeam = (teamIdx) => (e) => {
    e.stopPropagation();
    const newTeamNames = [...teams];
    newTeamNames[teamIdx] = e.target.value;
    dispatch({ type: "setTeams", payload: newTeamNames });
  };

  return (
    <GameDiv>
      <GameInfo>
        <div>Welcome to the game!</div>
        <div>I hope you have a great time!</div>
        <div>
          The match-up is between <br />
          <label>
            <Input value={teams[0]} onChange={handleChangeTeam(0)} />
          </label>{" "}
          and
          <label>
            <Input value={teams[1]} onChange={handleChangeTeam(1)} />
          </label>
          !
        </div>
        <GameControls />
        <InstructionsModal />
      </GameInfo>
      <LineScore />
      <GameBody>
        <LeftPanel>
          <HitLog />
          <Announcements />
        </LeftPanel>
        <RightPanel>
          <Diamond />
        </RightPanel>
      </GameBody>
    </GameDiv>
  );
};

export default GameInner;

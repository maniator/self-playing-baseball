import * as React from "react";

import BatterButton from "../BatterButton";
import ScoreBoard from "../ScoreBoard";
import Diamond from "../Diamond";
import Announcements from "../Announcements";
import styled from "styled-components";
import { GameContext } from "../Context";

type Props = {
  homeTeam: string;
  awayTeam: string;
};

const GameDiv = styled.main`
  color: white;
  position: relative;
  min-height: 75vh;
  width: min(960px, 94vw);
  border: 1px solid #884e4e;
  padding: 20px;
  margin: 0 auto;
  overflow: hidden;

  @media (max-width: 800px) {
    min-height: auto;
    height: 100dvh;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px;
  }
`;

const GameInfo = styled.div`
  min-height: 150px;
  padding: 15px 0;

  & > div {
    padding: 5px 0;
  }

  @media (max-width: 800px) {
    min-height: auto;
    margin-bottom: 8px;
  }
`;

const Input = styled.input`
  background: #000;
  color: #fff;
  width: 120px;
  margin: 0 5px;
  border: 1px solid #555;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: inherit;
`;

const SidePanel = styled.div`
  @media (max-width: 800px) {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 8px 0;
  }
`;

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
      </GameInfo>
      <SidePanel>
        <ScoreBoard />
        <Diamond />
      </SidePanel>
      <Announcements />
    </GameDiv>
  );
};

export default GameInner;

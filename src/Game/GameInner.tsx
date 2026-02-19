import * as React from "react";

import BatterButton from "../BatterButton";
import ScoreBoard from "../ScoreBoard";
import Diamond from "../Diamond";
import Announcements from "../Announcements";
import InstructionsModal from "../InstructionsModal";
import styled from "styled-components";
import { GameContext } from "../Context";

type Props = {
  homeTeam: string;
  awayTeam: string;
};

const GameDiv = styled.main`
  color: white;
  display: flex;
  flex-direction: column;
  width: min(960px, 94vw);
  border: 1px solid #884e4e;
  padding: 20px;
  margin: 0 auto;

  @media (max-width: 800px) {
    min-height: auto;
    height: 100dvh;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px;
  }
`;

const GameInfo = styled.div`
  padding: 15px 0;

  & > div {
    padding: 5px 0;
  }

  @media (max-width: 800px) {
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

const GameBody = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-start;
  margin-top: 8px;

  @media (max-width: 800px) {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
`;

const LeftPanel = styled.div`
  flex: 1;
  min-width: 0;
  padding-right: 16px;
  border-right: 1px solid #2a2a2a;

  @media (max-width: 800px) {
    min-width: auto;
    padding-right: 0;
    border-right: none;
    border-bottom: 1px solid #2a2a2a;
    padding-bottom: 8px;
  }
`;

const RightPanel = styled.div`
  width: 310px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 800px) {
    width: 100%;
    flex-direction: row;
    align-items: flex-start;
    gap: 8px;
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

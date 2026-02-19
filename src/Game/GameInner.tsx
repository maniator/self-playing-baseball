import * as React  from "react";

import BatterButton from "../BatterButton";
import ScoreBoard from "../ScoreBoard";
import Diamond from "../Diamond";
import Announcements from "../Announcements";
import styled from "styled-components";
import { GameContext } from "../Context";

type Props = {
  homeTeam: string,
  awayTeam: string
}

const GameDiv = styled.main`
  color: white;
  position: relative;
  height: 75vh;
  width: 75vw;
  border: 1px solid #884e4e;
  padding: 30px;
  margin: 0 auto;
  overflow: hidden;

  @media (max-width: 600px) {
    width: 100vw;
    height: 100dvh;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 10px;
    box-sizing: border-box;
    margin: 0;
  }
`;

const GameInfo = styled.div`
  height: 150px;
  padding: 15px 0;
  
  & > div {
    padding: 5px 0;
  }

  @media (max-width: 600px) {
    height: auto;
    margin-bottom: 10px;
  }
`;

const Input = styled.input`
  background: #000;
  color: #fff;
`;

const GameInner: React.FunctionComponent<Props> = ({ homeTeam, awayTeam }) => {
  const { dispatch, teams } = React.useContext(GameContext);

  React.useEffect(() => {
    dispatch({
      type: "setTeams",
      payload: [
        homeTeam, awayTeam
      ]
    })
  }, []);

  const handleChangeTeam = (teamIdx) => (e) => {
    e.stopPropagation();
    const { target: { value } } = e;
    const newTeamNames = [ ...teams ];

    newTeamNames[teamIdx] = value;
    dispatch({
      type: "setTeams",
      payload: newTeamNames
    })
  }

  return (
    <GameDiv>
      <GameInfo>
        <div>Welcome to the game!</div>
        <div>I hope you have a great time!</div>
        <div>
          The match-up is between <br/>
          <label><Input value={teams[0]} onChange={handleChangeTeam(0)} /></label> and
          <label><Input value={teams[1]} onChange={handleChangeTeam(1)} /></label>!
        </div>

        <BatterButton/>
      </GameInfo>
      <ScoreBoard/>
      <Diamond/>
      <Announcements/>
    </GameDiv>
  );
}


export default GameInner;

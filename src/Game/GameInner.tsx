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

const GameDiv = styled.div`
  color: white;
  position: relative;
  height: 75vh;
  width: 75vw;
  border: 1px solid #884e4e;
  padding: 30px;
  margin: 0 auto;
  overflow: hidden;
`;

const GameInfo = styled.div`
  height: 150px;
  padding: 15px 0;
  
  & > div {
    padding: 5px 0;
  }
`;

const GameInner: React.FunctionComponent<Props> = ({ homeTeam, awayTeam }) => {
  const { dispatch } = React.useContext(GameContext);

  React.useEffect(() => {
    dispatch({
      type: "startGame",
      payload: [
        homeTeam, awayTeam
      ]
    })
  }, [])

  return (
    <GameDiv>
      <GameInfo>
        <div>Welcome to the game!</div>
        <div>I hope you have a great time!</div>
        <div>
          The match-up is between {homeTeam} and {awayTeam}!
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

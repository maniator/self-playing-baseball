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
      <div>Welcome to the game!</div>
      <div>I hope you have a great time!</div>
      <p>
        The match-up is between {homeTeam} and {awayTeam}!
      </p>

      <BatterButton/>
      <ScoreBoard/>
      <Diamond/>
      <Announcements/>
    </GameDiv>
  );
}


export default GameInner;

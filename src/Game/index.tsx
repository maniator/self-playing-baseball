import * as React  from "react";

import styled from "styled-components";
import Diamond from "../Diamond";
import BatterButton from "../BatterButton";
import { GameProviderWrapper } from "../Context";

const GameDiv = styled.div`
  color: white;
  position: relative;
  height: 75vh;
  width: 75vw;
  border: 1px solid #884e4e;
  padding: 30px;
  margin: 0 auto;
`;

type Props = {
  homeTeam: string,
  awayTeam: string
}

const Game: React.FunctionComponent<Props> = ({ homeTeam, awayTeam }) => (
  <GameProviderWrapper>
    <GameDiv>
      <div>Welcome to the game!</div>
      <div>I hope you have a great time!</div>
      <p>
        The match-up is between {homeTeam} and {awayTeam}!
      </p>

      <BatterButton />

      <Diamond />
    </GameDiv>
  </GameProviderWrapper>
);

export default Game;

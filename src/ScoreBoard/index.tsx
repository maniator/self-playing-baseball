import * as React  from "react";

import styled from "styled-components";
import { ContextValue, GameContext } from "../Context";

const textColor = "#0F4880";

const ScoreBoardDiv = styled.div`
  background: #fff;
  height: 190px;
  width: 120px;
  padding: 0 10px;
  position: absolute;
  right: 55px;
  top: 55px;
`;

const Score = styled.div`
  height: 25px;
  line-height: 25px;
  font-size: 15px;
  color: ${textColor};
`

const BatterStats = styled.div`
  height: 25px;
  line-height: 25px;
  font-size: 15px;
  color: ${textColor};
`;

const Team = styled.div`
  font-weight: ${({ teamAtBat }) => teamAtBat ? "bold" : "normal"};
  color: ${({ teamAtBat }) => teamAtBat ? "#b381b3" : textColor};
`;

const ScoreBoard: React.FunctionComponent<{}> = () => {
  const { teams, score, strikes, balls, outs, atBat, inning }: ContextValue = React.useContext(GameContext);

  return (
    <ScoreBoardDiv>
      {score.map((s, idx) => (
        <Score key={idx}>
          <Team teamAtBat={atBat === idx}>{teams[idx]}: {s}</Team>
        </Score>
      ))}
      <hr/>
      <BatterStats>Strikes: {strikes}</BatterStats>
      <BatterStats>Balls: {balls}</BatterStats>
      <BatterStats>Outs: {outs}</BatterStats>
      <hr/>
      <BatterStats>Inning: {inning}</BatterStats>
    </ScoreBoardDiv>
  );
}

export default ScoreBoard;

import * as React  from "react";

import styled from "styled-components";
import { ContextValue, GameContext } from "../Context";

const ScoreBoardDiv = styled.div`
  background: #fff;
  height: 140px;
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
  color: #000;
`

const BatterStats = styled.div`
  height: 25px;
  line-height: 25px;
  font-size: 15px;
  color: #302929;
`;

const Team = styled.div`
  font-weight: ${({ teamAtBat }) => teamAtBat ? "bold" : "normal"};
  color: ${({ teamAtBat }) => teamAtBat ? "#f00" : "#000"};
`;

const ScoreBoard: React.FunctionComponent<{}> = () => {
  const { teams, score, strikes, balls, outs, atBat }: ContextValue = React.useContext(GameContext);

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
    </ScoreBoardDiv>
  );
}

export default ScoreBoard;

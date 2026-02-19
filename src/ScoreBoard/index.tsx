import * as React from "react";

import styled from "styled-components";
import { ContextValue, GameContext } from "../Context";

const textColor = "#0F4880";

const ScoreBoardDiv = styled.div`
  background: #fff;
  min-height: 190px;
  width: 140px;
  padding: 6px 10px;
  position: absolute;
  right: 30px;
  top: 40px;

  @media (max-width: 800px) {
    position: static;
    width: auto;
    flex: 1;
    min-height: auto;
    margin: 0;
  }
`;

const Score = styled.div`
  min-height: 25px;
  line-height: 25px;
  font-size: 15px;
  color: ${textColor};
`;

const BatterStats = styled.div`
  min-height: 25px;
  line-height: 25px;
  font-size: 15px;
  color: ${textColor};
`;

const Team = styled.div<{ teamAtBat: boolean }>`
  font-weight: ${({ teamAtBat }) => teamAtBat ? "bold" : "normal"};
  color: ${({ teamAtBat }) => teamAtBat ? "#b381b3" : textColor};
`;

const GameOverBanner = styled.div`
  background: #b30000;
  color: #fff;
  text-align: center;
  font-weight: bold;
  font-size: 13px;
  padding: 4px 2px;
  border-radius: 4px;
  margin-top: 6px;
`;

const ScoreBoard: React.FunctionComponent<{}> = () => {
  const { teams, score, strikes, balls, outs, atBat, inning, gameOver }: ContextValue = React.useContext(GameContext);

  return (
    <ScoreBoardDiv>
      {score.map((s, idx) => (
        <Score key={idx}>
          <Team teamAtBat={atBat === idx}>{teams[idx]}: {s}</Team>
        </Score>
      ))}
      <hr />
      <BatterStats>Strikes: {strikes}</BatterStats>
      <BatterStats>Balls: {balls}</BatterStats>
      <BatterStats>Outs: {outs}</BatterStats>
      <hr />
      <BatterStats>Inning: {inning}</BatterStats>
      {gameOver && <GameOverBanner>FINAL</GameOverBanner>}
    </ScoreBoardDiv>
  );
};

export default ScoreBoard;

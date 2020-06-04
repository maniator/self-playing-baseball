import * as React  from "react";

import styled from "styled-components";
import { GameContext, State } from "../Context";

const ScoreBoardDiv = styled.div`
  background: #fff;
  height: 50px;
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

const ScoreBoard: React.FunctionComponent<{}> = () => {
  const { teams, score }: State = React.useContext(GameContext);

  return (
    <ScoreBoardDiv>
      {score.map((s, idx) => (
        <Score key={idx}>
          {teams[idx]}: {s}
        </Score>
      ))}
    </ScoreBoardDiv>
  );
}

export default ScoreBoard;

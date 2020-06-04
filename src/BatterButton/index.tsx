import * as React  from "react";

import styled from "styled-components";
import { GameContext } from "../Context";
import { Hit } from "../constants/hitTypes";

const Button = styled.button`
  background: aquamarine;
  color: darkblue;
  padding: 20px;
  border-radius: 30px;
  cursor: pointer;
`;

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

const BatterButton: React.FunctionComponent<{}> = () => {
  const { dispatch } = React.useContext(GameContext);

  const handleClickButton = () => {
    const base = getRandomInt(4);
    console.log(`Player hit a ${Hit[base]}!`)
    dispatch({ type: "hit", payload: base });
  };

  return (
    <Button onClick={handleClickButton}>Batter Up!</Button>
  );
}

export default BatterButton;

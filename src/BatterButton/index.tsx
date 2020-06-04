import * as React  from "react";

import styled from "styled-components";
import { ContextValue, GameContext, State } from "../Context";
import { Hit } from "../constants/hitTypes";
import getRandomInt from "../utilities/getRandomInt";

const Button = styled.button`
  background: aquamarine;
  color: darkblue;
  padding: 20px;
  border-radius: 30px;
  cursor: pointer;
`;

const BatterButton: React.FunctionComponent<{}> = () => {
  const { dispatch, dispatchLog, strikes }: ContextValue = React.useContext(GameContext);
  const log = (message) =>
    dispatchLog({ type: "log", payload: message });

  const handleClickButton = () => {
    const random = getRandomInt(1000);
    const swingRate = 500 - (75 * strikes);
    if (random < swingRate) {
      dispatch({ type: "strike" });
    } else if (random < 880) {
      dispatch({ type: "wait" });
    } else {
      const base = getRandomInt(4);
      log(`Player hit a ${Hit[base]}!`);
      dispatch({ type: "hit", payload: base });
    }
  };

  return (
    <Button onClick={handleClickButton}>Batter Up!</Button>
  );
}

export default BatterButton;

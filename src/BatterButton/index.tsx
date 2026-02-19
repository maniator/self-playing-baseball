import * as React  from "react";

import styled from "styled-components";
import { ContextValue, GameContext, State } from "../Context";
import { Hit } from "../constants/hitTypes";
import getRandomInt from "../utilities/getRandomInt";
import { cancelAnnouncements } from "../utilities/announce";

type BatterButtonHandle = {
  trigger: () => void
}

const Button = styled.button`
  background: aquamarine;
  color: darkblue;
  padding: 20px;
  border-radius: 30px;
  cursor: pointer;
`;

const outfield = {
  [Hit.Homerun]: "over the fence!",
  [Hit.Triple]: "to the back wall",
  [Hit.Double]: "to center",
  [Hit.Single]: "to an empty area of the field"
}

const BatterButton = React.forwardRef<BatterButtonHandle, {}>((_, ref) => {
  const { dispatch, dispatchLog, strikes }: ContextValue = React.useContext(GameContext);
  const log = (message) =>
    dispatchLog({ type: "log", payload: message });

  const handleClickButton = () => {
    const random = getRandomInt(1000);
    const swingRate = 500 - (75 * strikes);

    // cancel previous announcements
    cancelAnnouncements();

    if (random < swingRate) {
      dispatch({ type: "strike" });
    } else if (random < 880) {
      dispatch({ type: "wait" });
    } else {
      const base = getRandomInt(4);
      log(`Player hit the ball ${outfield[base]}!`);
      dispatch({ type: "hit", payload: base });
    }
  };

  const handlePitch = (event) => {
    if (event.target.type !== "text") {
      handleClickButton();
    }
  }

  React.useEffect(() => {
    window.addEventListener("keyup", handlePitch, false);
  }, [])

  React.useImperativeHandle(ref, () => ({
    trigger: handleClickButton
  }));

  return (
    <Button onClick={handleClickButton}>Batter Up!</Button>
  );
});

export default BatterButton;

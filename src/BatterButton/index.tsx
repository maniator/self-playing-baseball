import * as React from "react";

import styled from "styled-components";
import { ContextValue, GameContext } from "../Context";
import { Hit } from "../constants/hitTypes";
import getRandomInt from "../utilities/getRandomInt";
import { cancelAnnouncements } from "../utilities/announce";
import { buildReplayUrl } from "../utilities/rng";

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

const Button = styled.button`
  background: aquamarine;
  color: darkblue;
  padding: 12px 18px;
  border-radius: 30px;
  cursor: pointer;
  border: none;
`;

const SubtleButton = styled(Button)`
  background: #2f3f69;
  color: #fff;
  border-radius: 16px;
  padding: 8px 12px;
`;

const ToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
`;

const Select = styled.select`
  background: #000;
  border: 1px solid #666;
  color: #fff;
`;

const STORAGE_KEYS = {
  autoPlay: "baseball.autoPlay",
  speed: "baseball.autoPlaySpeed",
  mute: "baseball.mute"
};

const outfield = {
  [Hit.Homerun]: "over the fence!",
  [Hit.Triple]: "to the back wall",
  [Hit.Double]: "to center",
  [Hit.Single]: "to an empty area of the field"
};

const BatterButton: React.FunctionComponent<{}> = () => {
  const { dispatch, dispatchLog, strikes }: ContextValue = React.useContext(GameContext);
  const [autoPlayEnabled, setAutoPlayEnabled] = React.useState(localStorage.getItem(STORAGE_KEYS.autoPlay) === "true");
  const [speed, setSpeed] = React.useState(localStorage.getItem(STORAGE_KEYS.speed) || "1200");
  const [mute, setMute] = React.useState(localStorage.getItem(STORAGE_KEYS.mute) === "true");

  const log = (message) => dispatchLog({ type: "log", payload: message });

  const handleClickButton = React.useCallback(() => {
    const random = getRandomInt(1000);
    const swingRate = 500 - (75 * strikes);

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
  }, [dispatch, strikes]);

  const handleShareReplay = async () => {
    const replayUrl = buildReplayUrl();

    try {
      await navigator.clipboard.writeText(replayUrl);
      if (dispatchLog) {
        log("Replay link copied!");
      }
    } catch (error) {
      window.prompt("Copy your replay URL", replayUrl);
    }
  };

  const handlePitch = (event) => {
    if (event.target.type !== "text") {
      handleClickButton();
    }
  };

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.autoPlay, String(autoPlayEnabled));
  }, [autoPlayEnabled]);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.speed, speed);
  }, [speed]);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.mute, String(mute));
  }, [mute]);

  React.useEffect(() => {
    window.addEventListener("keyup", handlePitch, false);
    return () => window.removeEventListener("keyup", handlePitch, false);
  }, [handleClickButton]);

  React.useEffect(() => {
    if (!autoPlayEnabled) {
      return;
    }

    const interval = window.setInterval(() => {
      handleClickButton();
    }, Number(speed));

    return () => window.clearInterval(interval);
  }, [autoPlayEnabled, speed, handleClickButton]);

  React.useEffect(() => {
    if (autoPlayEnabled && !mute) {
      setMute(true);
    }
  }, [autoPlayEnabled]);

  return (
    <Controls>
      <Button onClick={handleClickButton}>Batter Up!</Button>
      <SubtleButton onClick={handleShareReplay}>Share replay</SubtleButton>
      <ToggleLabel>
        <input type="checkbox" checked={autoPlayEnabled} onChange={() => setAutoPlayEnabled(!autoPlayEnabled)} />
        Auto-play
      </ToggleLabel>
      <ToggleLabel>
        Speed
        <Select value={speed} onChange={(event) => setSpeed(event.target.value)}>
          <option value="1200">Slow</option>
          <option value="700">Normal</option>
          <option value="350">Fast</option>
        </Select>
      </ToggleLabel>
      <ToggleLabel>
        <input type="checkbox" checked={mute} onChange={() => setMute(!mute)} />
        Mute
      </ToggleLabel>
    </Controls>
  );
};

export default BatterButton;

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
  font-family: inherit;
  font-size: 14px;
`;

const SubtleButton = styled(Button)`
  background: #2f3f69;
  color: #fff;
`;

const AutoPlayGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  background: rgba(47, 63, 105, 0.5);
  border-radius: 10px;
  padding: 5px 10px;
`;

const ToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;

  & input[type="checkbox"] {
    accent-color: aquamarine;
    cursor: pointer;
    width: 14px;
    height: 14px;
  }
`;

const Select = styled.select`
  background: #1a2440;
  border: 1px solid #4a6090;
  color: #fff;
  border-radius: 8px;
  padding: 3px 6px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
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
  const [autoPlayEnabled, setAutoPlayEnabled] = React.useState(() => {
    try { return localStorage.getItem(STORAGE_KEYS.autoPlay) === "true"; } catch { return false; }
  });
  const [speed, setSpeed] = React.useState(() => {
    try { return localStorage.getItem(STORAGE_KEYS.speed) || "1200"; } catch { return "1200"; }
  });
  const [mute, setMute] = React.useState(() => {
    try { return localStorage.getItem(STORAGE_KEYS.mute) === "true"; } catch { return false; }
  });

  const previousMuteRef = React.useRef<boolean | null>(null);
  const muteRef = React.useRef(mute);
  React.useEffect(() => { muteRef.current = mute; }, [mute]);

  const log = React.useCallback((message: string) => {
    if (!dispatchLog) return;
    dispatchLog({ type: "log", payload: message });
  }, [dispatchLog]);

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
  }, [dispatch, log, strikes]);

  const handleShareReplay = async () => {
    const replayUrl = buildReplayUrl();

    try {
      await navigator.clipboard.writeText(replayUrl);
      log("Replay link copied!");
    } catch (error) {
      window.prompt("Copy your replay URL", replayUrl);
    }
  };

  const handlePitch = React.useCallback((event) => {
    if (event.target.type !== "text") {
      handleClickButton();
    }
  }, [handleClickButton]);

  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.autoPlay, String(autoPlayEnabled)); } catch {}
  }, [autoPlayEnabled]);

  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.speed, speed); } catch {}
  }, [speed]);

  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.mute, String(mute)); } catch {}
  }, [mute]);

  React.useEffect(() => {
    window.addEventListener("keyup", handlePitch, false);
    return () => window.removeEventListener("keyup", handlePitch, false);
  }, [handlePitch]);

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
    if (autoPlayEnabled) {
      if (!muteRef.current) {
        previousMuteRef.current = muteRef.current;
        setMute(true);
      }
    } else if (previousMuteRef.current !== null) {
      setMute(previousMuteRef.current);
      previousMuteRef.current = null;
    }
  }, [autoPlayEnabled]);

  return (
    <Controls>
      <Button onClick={handleClickButton}>Batter Up!</Button>
      <SubtleButton onClick={handleShareReplay}>Share replay</SubtleButton>
      <AutoPlayGroup>
        <ToggleLabel>
          <input type="checkbox" checked={autoPlayEnabled} onChange={() => setAutoPlayEnabled(!autoPlayEnabled)} />
          Auto-play
        </ToggleLabel>
        <ToggleLabel htmlFor="speed-select">
          Speed
          <Select id="speed-select" value={speed} onChange={(event) => setSpeed(event.target.value)}>
            <option value="1200">Slow</option>
            <option value="700">Normal</option>
            <option value="350">Fast</option>
          </Select>
        </ToggleLabel>
        <ToggleLabel>
          <input type="checkbox" checked={mute} onChange={() => setMute(!mute)} />
          Mute
        </ToggleLabel>
      </AutoPlayGroup>
    </Controls>
  );
};

export default BatterButton;

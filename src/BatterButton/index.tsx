import * as React from "react";

import styled from "styled-components";
import { ContextValue, GameContext } from "../Context";
import { Hit } from "../constants/hitTypes";
import getRandomInt from "../utilities/getRandomInt";
import { cancelAnnouncements, setMuted } from "../utilities/announce";
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

const ShareButton = styled.button`
  background: transparent;
  color: aquamarine;
  padding: 12px 18px;
  border-radius: 30px;
  border: 1px solid aquamarine;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
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

const SPEED_SLOW = 1200;
const SPEED_NORMAL = 700;
const SPEED_FAST = 350;

function loadBool(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === "true";
}

function loadInt(key: string, fallback: number): number {
  const v = localStorage.getItem(key);
  return v === null ? fallback : parseInt(v, 10);
}

const outfield = {
  [Hit.Homerun]: "over the fence!",
  [Hit.Triple]: "to the back wall",
  [Hit.Double]: "to center",
  [Hit.Single]: "to an empty area of the field"
};

const BatterButton: React.FunctionComponent<{}> = () => {
  const { dispatch, dispatchLog, strikes }: ContextValue = React.useContext(GameContext);
  const [autoPlay, setAutoPlay] = React.useState(() => loadBool("autoPlay", false));
  const [speed, setSpeed] = React.useState(() => loadInt("speed", SPEED_NORMAL));
  const [muted, setMutedState] = React.useState(() => loadBool("muted", false));

  const log = (message: string) => dispatchLog({ type: "log", payload: message });

  // Keep a ref so the autoplay interval always uses the latest strikes value
  const strikesRef = React.useRef(strikes);
  strikesRef.current = strikes;

  const handleClickButton = React.useCallback(() => {
    const random = getRandomInt(1000);
    const swingRate = 500 - (75 * strikesRef.current);

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
  }, [dispatch, dispatchLog]);

  // Stable ref so the interval always calls the latest handler without stale closures
  const handleClickRef = React.useRef(handleClickButton);
  handleClickRef.current = handleClickButton;

  // Auto-play interval — restarts when enabled or speed changes
  React.useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => handleClickRef.current(), speed);
    return () => clearInterval(id);
  }, [autoPlay, speed]);

  // Persist settings to localStorage
  React.useEffect(() => { localStorage.setItem("autoPlay", String(autoPlay)); }, [autoPlay]);
  React.useEffect(() => { localStorage.setItem("speed", String(speed)); }, [speed]);
  React.useEffect(() => { localStorage.setItem("muted", String(muted)); }, [muted]);

  // Sync mute state into the announce module
  React.useEffect(() => { setMuted(muted); }, [muted]);

  const handlePitch = React.useCallback((event: KeyboardEvent) => {
    if ((event.target as HTMLInputElement).type !== "text") {
      handleClickRef.current();
    }
  }, []);

  React.useEffect(() => {
    window.addEventListener("keyup", handlePitch, false);
    return () => window.removeEventListener("keyup", handlePitch, false);
  }, [handlePitch]);

  const handleAutoPlayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setAutoPlay(enabled);
    if (enabled && !muted) {
      setMutedState(true);
    }
  };

  const handleMuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMutedState(e.target.checked);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSpeed(parseInt(e.target.value, 10));
  };

  const handleShareReplay = () => {
    const url = buildReplayUrl();
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => log("Replay link copied!"))
        .catch(() => window.prompt("Copy this replay link:", url));
    } else {
      window.prompt("Copy this replay link:", url);
    }
  };

  return (
    <Controls>
      <Button onClick={handleClickButton}>Batter Up!</Button>
      <ShareButton onClick={handleShareReplay}>Share replay</ShareButton>
      <AutoPlayGroup>
        <ToggleLabel>
          <input type="checkbox" checked={autoPlay} onChange={handleAutoPlayChange} />
          Auto-play
        </ToggleLabel>
        <ToggleLabel>
          Speed
          <Select value={speed} onChange={handleSpeedChange}>
            <option value={SPEED_SLOW}>Slow</option>
            <option value={SPEED_NORMAL}>Normal</option>
            <option value={SPEED_FAST}>Fast</option>
          </Select>
        </ToggleLabel>
        <ToggleLabel>
          <input type="checkbox" checked={muted} onChange={handleMuteChange} />
          Mute
        </ToggleLabel>
      </AutoPlayGroup>
    </Controls>
  );
};

export default BatterButton;

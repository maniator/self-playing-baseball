import * as React  from "react";

import styled from "styled-components";
import { ContextValue, GameContext } from "../Context";
import { Hit } from "../constants/hitTypes";
import getRandomInt from "../utilities/getRandomInt";
import { cancelAnnouncements, setMuted } from "../utilities/announce";
import { buildReplayUrl } from "../utilities/rng";

const Button = styled.button`
  background: aquamarine;
  color: darkblue;
  padding: 20px;
  border-radius: 30px;
  cursor: pointer;
`;

const ShareButton = styled.button`
  background: #2e8b57;
  color: #fff;
  padding: 10px 16px;
  border-radius: 20px;
  cursor: pointer;
  margin-left: 10px;
  font-size: 0.85em;
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`;

const ControlLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85em;
  cursor: pointer;
`;

const Select = styled.select`
  background: #111;
  color: #fff;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 2px 4px;
`;

const outfield = {
  [Hit.Homerun]: "over the fence!",
  [Hit.Triple]: "to the back wall",
  [Hit.Double]: "to center",
  [Hit.Single]: "to an empty area of the field"
}

const SPEED_SLOW = 1200;
const SPEED_NORMAL = 700;
const SPEED_FAST = 350;

function loadBool(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === 'true';
}

function loadInt(key: string, fallback: number): number {
  const v = localStorage.getItem(key);
  return v === null ? fallback : parseInt(v, 10);
}

const BatterButton: React.FunctionComponent<{}> = () => {
  const { dispatch, dispatchLog, strikes }: ContextValue = React.useContext(GameContext);
  const log = (message: string) =>
    dispatchLog({ type: "log", payload: message });

  const [autoPlay, setAutoPlay] = React.useState(() => loadBool('autoPlay', false));
  const [speed, setSpeed] = React.useState(() => loadInt('speed', SPEED_NORMAL));
  const [muted, setMutedState] = React.useState(() => loadBool('muted', false));

  const strikesRef = React.useRef(strikes);
  strikesRef.current = strikes;

  const handleClickButton = React.useCallback(() => {
    const random = getRandomInt(1000);
    const swingRate = 500 - (75 * strikesRef.current);

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
  }, [dispatch, dispatchLog]);

  // Stable ref so interval always calls latest version
  const handleClickRef = React.useRef(handleClickButton);
  handleClickRef.current = handleClickButton;

  // Auto-play interval — only one runs at a time
  React.useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => handleClickRef.current(), speed);
    return () => clearInterval(id);
  }, [autoPlay, speed]);

  // Persist settings
  React.useEffect(() => { localStorage.setItem('autoPlay', String(autoPlay)); }, [autoPlay]);
  React.useEffect(() => { localStorage.setItem('speed', String(speed)); }, [speed]);
  React.useEffect(() => { localStorage.setItem('muted', String(muted)); }, [muted]);

  // Sync mute state into announce module
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
      navigator.clipboard.writeText(url)
        .then(() => log("Replay link copied!"))
        .catch(() => window.prompt("Copy this replay link:", url));
    } else {
      window.prompt("Copy this replay link:", url);
    }
  };

  return (
    <div>
      <Button onClick={handleClickButton}>Batter Up!</Button>
      <ShareButton onClick={handleShareReplay}>Share replay</ShareButton>
      <Controls>
        <ControlLabel>
          <input type="checkbox" checked={autoPlay} onChange={handleAutoPlayChange} />
          Auto-play
        </ControlLabel>
        <ControlLabel>
          Speed:
          <Select value={speed} onChange={handleSpeedChange}>
            <option value={SPEED_SLOW}>Slow</option>
            <option value={SPEED_NORMAL}>Normal</option>
            <option value={SPEED_FAST}>Fast</option>
          </Select>
        </ControlLabel>
        <ControlLabel>
          <input type="checkbox" checked={muted} onChange={handleMuteChange} />
          Mute
        </ControlLabel>
      </Controls>
    </div>
  );
}

export default BatterButton;


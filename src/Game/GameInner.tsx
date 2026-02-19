import * as React  from "react";

import BatterButton, { runBatterUp } from "../BatterButton";
import ScoreBoard from "../ScoreBoard";
import Diamond from "../Diamond";
import Announcements from "../Announcements";
import styled from "styled-components";
import { GameContext } from "../Context";
import { buildReplayUrl } from "../utilities/rng";
import { cancelAnnouncements, setAnnouncementsMuted } from "../utilities/announce";

type Props = {
  homeTeam: string,
  awayTeam: string
}

const AUTOPLAY_STORAGE_KEY = "spb-autoplay-enabled";
const AUTOPLAY_SPEED_STORAGE_KEY = "spb-autoplay-speed";
const AUTOPLAY_SPEEDS = {
  slow: 1200,
  normal: 700,
  fast: 350
};

type AutoPlaySpeed = keyof typeof AUTOPLAY_SPEEDS;

const GameDiv = styled.main`
  color: white;
  position: relative;
  height: 75vh;
  width: 75vw;
  border: 1px solid #884e4e;
  padding: 30px;
  margin: 0 auto;
  overflow: hidden;
`;

const GameInfo = styled.div`
  height: 150px;
  padding: 15px 0;
  
  & > div {
    padding: 5px 0;
  }
`;

const Input = styled.input`
  background: #000;
  color: #fff;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const ShareButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  background: #f5f5f5;
  color: #000;
`;

const AutoPlayLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const SpeedSelect = styled.select`
  background: #000;
  color: #fff;
`;

const getStoredAutoPlay = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(AUTOPLAY_STORAGE_KEY) === "true";
};

const getStoredAutoPlaySpeed = (): AutoPlaySpeed => {
  if (typeof window === "undefined") {
    return "normal";
  }

  const speed = window.localStorage.getItem(AUTOPLAY_SPEED_STORAGE_KEY) as AutoPlaySpeed;
  if (speed && AUTOPLAY_SPEEDS[speed]) {
    return speed;
  }

  return "normal";
};

const GameInner: React.FunctionComponent<Props> = ({ homeTeam, awayTeam }) => {
  const { dispatch, dispatchLog, teams, strikes } = React.useContext(GameContext);
  const [isAutoPlayEnabled, setAutoPlayEnabled] = React.useState<boolean>(getStoredAutoPlay);
  const [autoPlaySpeed, setAutoPlaySpeed] = React.useState<AutoPlaySpeed>(getStoredAutoPlaySpeed);

  React.useEffect(() => {
    dispatch({
      type: "setTeams",
      payload: [
        homeTeam, awayTeam
      ]
    })
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(AUTOPLAY_STORAGE_KEY, `${isAutoPlayEnabled}`);

    setAnnouncementsMuted(isAutoPlayEnabled);
    cancelAnnouncements();
  }, [isAutoPlayEnabled]);

  React.useEffect(() => {
    window.localStorage.setItem(AUTOPLAY_SPEED_STORAGE_KEY, autoPlaySpeed);
  }, [autoPlaySpeed]);

  const strikesRef = React.useRef(strikes);

  React.useEffect(() => {
    strikesRef.current = strikes;
  }, [strikes]);

  React.useEffect(() => {
    if (!isAutoPlayEnabled) {
      return;
    }

    const intervalMs = AUTOPLAY_SPEEDS[autoPlaySpeed];
    const intervalId = window.setInterval(() => {
      runBatterUp(dispatch, dispatchLog, strikesRef.current);
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAutoPlayEnabled, autoPlaySpeed, dispatch, dispatchLog]);

  React.useEffect(() => {
    return () => {
      setAnnouncementsMuted(false);
      cancelAnnouncements();
    };
  }, []);

  const handleChangeTeam = (teamIdx) => (e) => {
    e.stopPropagation();
    const { target: { value } } = e;
    const newTeamNames = [ ...teams ];

    newTeamNames[teamIdx] = value;
    dispatch({
      type: "setTeams",
      payload: newTeamNames
    })
  }

  const handleShareReplay = async () => {
    const replayUrl = buildReplayUrl();

    try {
      await navigator.clipboard.writeText(replayUrl);

      if (dispatchLog) {
        dispatchLog({ type: "log", payload: "Replay link copied!" });
      }
    } catch (error) {
      window.prompt("Copy this replay link", replayUrl);

      if (dispatchLog) {
        dispatchLog({ type: "log", payload: "Replay link copied!" });
      }
    }
  }

  return (
    <GameDiv>
      <GameInfo>
        <div>Welcome to the game!</div>
        <div>I hope you have a great time!</div>
        <div>
          The match-up is between <br/>
          <label><Input value={teams[0]} onChange={handleChangeTeam(0)} /></label> and
          <label><Input value={teams[1]} onChange={handleChangeTeam(1)} /></label>!
        </div>

        <Controls>
          <BatterButton/>
          <AutoPlayLabel>
            <input type="checkbox" checked={isAutoPlayEnabled} onChange={() => setAutoPlayEnabled(!isAutoPlayEnabled)} />
            Auto-play
          </AutoPlayLabel>
          <label>
            Speed
            <SpeedSelect value={autoPlaySpeed} onChange={(event) => setAutoPlaySpeed(event.target.value as AutoPlaySpeed)}>
              <option value="slow">Slow</option>
              <option value="normal">Normal</option>
              <option value="fast">Fast</option>
            </SpeedSelect>
          </label>
          <ShareButton onClick={handleShareReplay}>Share replay</ShareButton>
        </Controls>
      </GameInfo>
      <ScoreBoard/>
      <Diamond/>
      <Announcements/>
    </GameDiv>
  );
}


export default GameInner;

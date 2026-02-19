import * as React  from "react";

import BatterButton from "../BatterButton";
import ScoreBoard from "../ScoreBoard";
import Diamond from "../Diamond";
import Announcements from "../Announcements";
import styled from "styled-components";
import { GameContext } from "../Context";
import { buildReplayUrl } from "../utilities/rng";
import { setAnnouncementsMuted, cancelAnnouncements } from "../utilities/announce";

type Props = {
  homeTeam: string,
  awayTeam: string
}

const GameDiv = styled.main`
  color: white;
  position: relative;
  min-height: 75vh;
  width: 100%;
  max-width: 1100px;
  border: 1px solid #884e4e;
  padding: 30px;
  margin: 0 auto;
  overflow: visible;

  @media (max-width: 768px) {
    min-height: auto;
    height: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
`;

const GameInfo = styled.div`
  min-height: 150px;
  padding: 15px 0;
  
  & > div {
    padding: 5px 0;
  }

  @media (max-width: 768px) {
    min-height: auto;
  }
`;

const Input = styled.input`
  background: #000;
  color: #fff;
  max-width: 160px;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-start;
`;

const ShareButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  background: #f5f5f5;
  color: #000;
`;

const GameInner: React.FunctionComponent<Props> = ({ homeTeam, awayTeam }) => {
  const { dispatch, dispatchLog, teams } = React.useContext(GameContext);
  const batterRef = React.useRef<{ trigger: () => void } | null>(null);
  const [autoPlay, setAutoPlay] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("autoPlayEnabled");
    return stored ? stored === "true" : false;
  });
  const [autoPlaySpeed, setAutoPlaySpeed] = React.useState<"slow" | "normal" | "fast">(() => {
    if (typeof window === "undefined") return "normal";
    const stored = window.localStorage.getItem("autoPlaySpeed");
    return stored === "slow" || stored === "fast" ? stored : "normal";
  });
  const [muted, setMuted] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("announcementsMuted");
    return stored ? stored === "true" : false;
  });

  React.useEffect(() => {
    dispatch({
      type: "setTeams",
      payload: [
        homeTeam, awayTeam
      ]
    })
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

  React.useEffect(() => {
    window.localStorage.setItem("autoPlayEnabled", autoPlay ? "true" : "false");
    window.localStorage.setItem("autoPlaySpeed", autoPlaySpeed);
    window.localStorage.setItem("announcementsMuted", muted ? "true" : "false");
    setAnnouncementsMuted(muted);
  }, [autoPlay, autoPlaySpeed, muted]);

  React.useEffect(() => {
    if (!autoPlay) {
      return;
    }

    const speedMap = {
      slow: 1200,
      normal: 700,
      fast: 350
    };

    const interval = window.setInterval(() => {
      batterRef.current?.trigger();
    }, speedMap[autoPlaySpeed]);

    return () => window.clearInterval(interval);
  }, [autoPlay, autoPlaySpeed]);

  const handleToggleAutoPlay = () => {
    const next = !autoPlay;
    setAutoPlay(next);
    cancelAnnouncements();

    if (next) {
      setMuted(true);
    }
  }

  const handleMutedToggle = () => {
    const next = !muted;
    setMuted(next);
    cancelAnnouncements();
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
          <BatterButton ref={batterRef}/>
          <label>
            <input type="checkbox" checked={autoPlay} onChange={handleToggleAutoPlay} /> Auto-play
          </label>
          <label>
            Speed{" "}
            <select value={autoPlaySpeed} onChange={(e) => setAutoPlaySpeed(e.target.value as "slow" | "normal" | "fast")}>
              <option value="slow">Slow (1200ms)</option>
              <option value="normal">Normal (700ms)</option>
              <option value="fast">Fast (350ms)</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={muted} onChange={handleMutedToggle} /> Mute
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

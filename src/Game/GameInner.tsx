import * as React  from "react";

import BatterButton from "../BatterButton";
import ScoreBoard from "../ScoreBoard";
import Diamond from "../Diamond";
import Announcements from "../Announcements";
import styled from "styled-components";
import { GameContext } from "../Context";
import { buildReplayUrl } from "../utilities/rng";

type Props = {
  homeTeam: string,
  awayTeam: string
}

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

const GameInner: React.FunctionComponent<Props> = ({ homeTeam, awayTeam }) => {
  const { dispatch, dispatchLog, teams } = React.useContext(GameContext);

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

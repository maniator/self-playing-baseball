import * as React from "react";

import Announcements from "@components/Announcements";
import Diamond from "@components/Diamond";
import GameControls from "@components/GameControls";
import HitLog from "@components/HitLog";
import LineScore from "@components/LineScore";
import NewGameDialog, { DEFAULT_AWAY_TEAM, DEFAULT_HOME_TEAM } from "@components/NewGameDialog";
import { useGameContext } from "@context/index";

import { GameBody, GameDiv, LeftPanel, RightPanel } from "./styles";

const GameInner: React.FunctionComponent = () => {
  const { dispatch, teams } = useGameContext();
  const [dialogOpen, setDialogOpen] = React.useState(true);
  const [controlsKey, setControlsKey] = React.useState(0);

  const handleStart = (homeTeam: string, awayTeam: string, managedTeam: 0 | 1 | null) => {
    localStorage.setItem("managerMode", JSON.stringify(managedTeam !== null));
    if (managedTeam !== null) {
      localStorage.setItem("managedTeam", JSON.stringify(managedTeam));
      localStorage.setItem("autoPlay", JSON.stringify(true));
    }
    dispatch({ type: "reset" });
    dispatch({ type: "setTeams", payload: [homeTeam, awayTeam] });
    setDialogOpen(false);
    setControlsKey((k) => k + 1);
  };

  const handleNewGame = () => {
    dispatch({ type: "reset" });
    setDialogOpen(true);
  };

  return (
    <GameDiv>
      {dialogOpen && (
        <NewGameDialog
          initialHome={teams[0] || DEFAULT_HOME_TEAM}
          initialAway={teams[1] || DEFAULT_AWAY_TEAM}
          onStart={handleStart}
        />
      )}
      <LineScore />
      <GameControls key={controlsKey} onNewGame={handleNewGame} />
      <GameBody>
        <LeftPanel>
          <HitLog />
          <Announcements />
        </LeftPanel>
        <RightPanel>
          <Diamond />
        </RightPanel>
      </GameBody>
    </GameDiv>
  );
};

export default GameInner;

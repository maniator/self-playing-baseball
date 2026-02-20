import * as React from "react";

import { useLocalStorage } from "usehooks-ts";

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
  const [gameKey, setGameKey] = React.useState(0);
  const [, setManagerMode] = useLocalStorage("managerMode", false);
  const [, setManagedTeam] = useLocalStorage<0 | 1>("managedTeam", 0);

  const handleStart = (homeTeam: string, awayTeam: string, managedTeam: 0 | 1 | null) => {
    setManagerMode(managedTeam !== null);
    if (managedTeam !== null) {
      setManagedTeam(managedTeam);
    }
    dispatch({ type: "reset" });
    dispatch({ type: "setTeams", payload: [awayTeam, homeTeam] });
    setGameKey((k) => k + 1);
    setDialogOpen(false);
  };

  const handleNewGame = () => {
    dispatch({ type: "reset" });
    setGameKey((k) => k + 1);
    setDialogOpen(true);
  };

  return (
    <GameDiv>
      {dialogOpen && (
        <NewGameDialog
          initialHome={teams[1] || DEFAULT_HOME_TEAM}
          initialAway={teams[0] || DEFAULT_AWAY_TEAM}
          onStart={handleStart}
        />
      )}
      <LineScore />
      <GameControls key={gameKey} onNewGame={handleNewGame} />
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

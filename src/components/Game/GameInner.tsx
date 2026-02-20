import * as React from "react";

import { useLocalStorage } from "usehooks-ts";

import Announcements from "@components/Announcements";
import Diamond from "@components/Diamond";
import GameControls from "@components/GameControls";
import HitLog from "@components/HitLog";
import LineScore from "@components/LineScore";
import NewGameDialog, { type PlayerOverrides } from "@components/NewGameDialog";
import { type Strategy, useGameContext } from "@context/index";
import { getSeed } from "@utils/rng";
import { clearAutoSave, loadAutoSave, restoreSaveRng } from "@utils/saves";

import { GameBody, GameDiv, LeftPanel, RightPanel } from "./styles";

/** Loads an auto-save only if its seed matches the current URL seed. */
const getMatchedAutoSave = () => {
  const saved = loadAutoSave();
  if (!saved) return null;
  const currentSeed = getSeed()?.toString(36);
  return currentSeed === saved.seed ? saved : null;
};

const GameInner: React.FunctionComponent = () => {
  const { dispatch } = useGameContext();
  const [, setManagerMode] = useLocalStorage("managerMode", false);
  const [, setManagedTeam] = useLocalStorage<0 | 1>("managedTeam", 0);

  const [dialogOpen, setDialogOpen] = React.useState(true);
  const [gameKey, setGameKey] = React.useState(0);
  const [gameActive, setGameActive] = React.useState(false);
  const [, setStrategy] = useLocalStorage<Strategy>("strategy", "balanced");

  // Check for a resumable auto-save once on mount.
  const [autoSave] = React.useState(getMatchedAutoSave);

  // Restore auto-save state as soon as the context is ready.
  React.useEffect(() => {
    if (autoSave) {
      restoreSaveRng(autoSave);
      dispatch({ type: "restore_game", payload: autoSave.state });
      setStrategy(autoSave.setup.strategy);
      setManagedTeam(autoSave.setup.managedTeam);
      setManagerMode(autoSave.setup.managerMode ?? false);
    }
  }, [dispatch, autoSave, setStrategy, setManagedTeam, setManagerMode]);

  const handleResume = () => {
    // State is already restored by the effect above; start the game and close.
    setGameActive(true);
    setDialogOpen(false);
  };

  const handleStart = (
    homeTeam: string,
    awayTeam: string,
    managedTeam: 0 | 1 | null,
    playerOverrides: PlayerOverrides,
  ) => {
    setManagerMode(managedTeam !== null);
    if (managedTeam !== null) {
      setManagedTeam(managedTeam);
    }
    clearAutoSave();
    dispatch({ type: "reset" });
    dispatch({
      type: "setTeams",
      payload: {
        teams: [awayTeam, homeTeam],
        playerOverrides: [playerOverrides.away, playerOverrides.home],
        lineupOrder: [playerOverrides.awayOrder, playerOverrides.homeOrder],
      },
    });
    setGameActive(true);
    setGameKey((k) => k + 1);
    setDialogOpen(false);
  };

  const handleNewGame = () => {
    clearAutoSave();
    dispatch({ type: "reset" });
    setGameActive(false);
    setGameKey((k) => k + 1);
    setDialogOpen(true);
  };

  return (
    <GameDiv>
      {dialogOpen && (
        <NewGameDialog
          onStart={handleStart}
          autoSaveName={autoSave?.name}
          onResume={autoSave ? handleResume : undefined}
        />
      )}
      <LineScore />
      <GameControls key={gameKey} onNewGame={handleNewGame} gameStarted={gameActive} />
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

import * as React from "react";

import { useLocalStorage } from "usehooks-ts";

import Announcements from "@components/Announcements";
import Diamond from "@components/Diamond";
import GameControls from "@components/GameControls";
import HitLog from "@components/HitLog";
import LineScore from "@components/LineScore";
import NewGameDialog, { type PlayerOverrides } from "@components/NewGameDialog";
import type { GameAction, Strategy } from "@context/index";
import { useGameContext } from "@context/index";
import { useRxdbGameSync } from "@hooks/useRxdbGameSync";
import { SaveStore } from "@storage/saveStore";
import { getSeed } from "@utils/rng";
import { clearAutoSave, currentSeedStr, loadAutoSave, restoreSaveRng } from "@utils/saves";

import { GameBody, GameDiv, LeftPanel, RightPanel } from "./styles";

/** Loads an auto-save only if its seed matches the current URL seed. */
const getMatchedAutoSave = () => {
  const saved = loadAutoSave();
  if (!saved) return null;
  const currentSeed = getSeed()?.toString(36);
  return currentSeed === saved.seed ? saved : null;
};

interface Props {
  /** Shared buffer populated by GameProviderWrapper's onDispatch callback. */
  actionBufferRef?: React.MutableRefObject<GameAction[]>;
}

const GameInner: React.FunctionComponent<Props> = ({ actionBufferRef: externalBufferRef }) => {
  const { dispatch, pitchKey, inning, atBat, score, gameOver } = useGameContext();
  const [, setManagerMode] = useLocalStorage("managerMode", false);
  const [, setManagedTeam] = useLocalStorage<0 | 1>("managedTeam", 0);

  const [dialogOpen, setDialogOpen] = React.useState(true);
  const [gameKey, setGameKey] = React.useState(0);
  const [gameActive, setGameActive] = React.useState(false);
  const [, setStrategy] = useLocalStorage<Strategy>("strategy", "balanced");

  // Fallback buffer when rendered without the Game wrapper (e.g. in tests).
  const localBufferRef = React.useRef<GameAction[]>([]);
  const actionBufferRef = externalBufferRef ?? localBufferRef;

  // Tracks the RxDB save ID for the current game session.
  const rxSaveIdRef = React.useRef<string | null>(null);

  useRxdbGameSync(rxSaveIdRef, actionBufferRef, pitchKey, inning, atBat, score, gameOver);

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
    if (autoSave) {
      SaveStore.createSave(
        {
          matchupMode: "default",
          homeTeamId: autoSave.setup.homeTeam,
          awayTeamId: autoSave.setup.awayTeam,
          seed: autoSave.seed,
          setup: autoSave.setup as unknown as Record<string, unknown>,
        },
        { name: autoSave.name },
      )
        .then((id) => {
          rxSaveIdRef.current = id;
        })
        .catch(() => {});
    }
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

    // Create a new RxDB save for this session (fire-and-forget).
    // currentSeedStr() returns the seed that was already initialised for this
    // page load — it does NOT generate a new one.
    SaveStore.createSave(
      {
        matchupMode: "default",
        homeTeamId: homeTeam,
        awayTeamId: awayTeam,
        seed: currentSeedStr(),
        setup: {
          managedTeam,
          managerMode: managedTeam !== null,
          playerOverrides,
        },
      },
      { name: `${awayTeam} vs ${homeTeam}` },
    )
      .then((id) => {
        rxSaveIdRef.current = id;
      })
      .catch(() => {});

    setGameActive(true);
    setGameKey((k) => k + 1);
    setDialogOpen(false);
  };

  const handleNewGame = () => {
    rxSaveIdRef.current = null;
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

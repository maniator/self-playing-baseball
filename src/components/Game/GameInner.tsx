import * as React from "react";

import { SaveStore } from "@storage/saveStore";
import type { GameSaveSetup, SaveDoc } from "@storage/types";
import { useLocalStorage } from "usehooks-ts";

import Announcements from "@components/Announcements";
import Diamond from "@components/Diamond";
import GameControls from "@components/GameControls";
import HitLog from "@components/HitLog";
import LineScore from "@components/LineScore";
import NewGameDialog, { type PlayerOverrides } from "@components/NewGameDialog";
import PlayerStatsPanel from "@components/PlayerStatsPanel";
import type { GameAction, Strategy } from "@context/index";
import { useGameContext } from "@context/index";
import { useRxdbGameSync } from "@hooks/useRxdbGameSync";
import { getSeed, restoreRng } from "@utils/rng";
import { currentSeedStr } from "@utils/saves";

import { GameBody, GameDiv, LeftPanel, RightPanel } from "./styles";

/** Loads the most recent RxDB save whose seed matches the current URL seed. */
const loadMatchedRxSave = async (): Promise<SaveDoc | null> => {
  try {
    const saves = await SaveStore.listSaves();
    const currentSeed = getSeed()?.toString(36);
    return saves.find((s) => s.seed === currentSeed) ?? null;
  } catch {
    return null;
  }
};

interface Props {
  /** Shared buffer populated by GameProviderWrapper's onDispatch callback. */
  actionBufferRef?: React.MutableRefObject<GameAction[]>;
}

const GameInner: React.FunctionComponent<Props> = ({ actionBufferRef: externalBufferRef }) => {
  const { dispatch } = useGameContext();
  const [, setManagerMode] = useLocalStorage("managerMode", false);
  const [, setManagedTeam] = useLocalStorage<0 | 1>("managedTeam", 0);
  const [strategy, setStrategy] = useLocalStorage<Strategy>("strategy", "balanced");

  const [dialogOpen, setDialogOpen] = React.useState(true);
  const [gameKey, setGameKey] = React.useState(0);
  const [gameActive, setGameActive] = React.useState(false);

  // Fallback buffer when rendered without the Game wrapper (e.g. in tests).
  const localBufferRef = React.useRef<GameAction[]>([]);
  const actionBufferRef = externalBufferRef ?? localBufferRef;

  // Tracks the RxDB save ID for the current game session.
  const rxSaveIdRef = React.useRef<string | null>(null);

  useRxdbGameSync(rxSaveIdRef, actionBufferRef);

  // Async load of the most recently updated RxDB save that matches the URL seed.
  const [rxAutoSave, setRxAutoSave] = React.useState<SaveDoc | null>(null);
  React.useEffect(() => {
    loadMatchedRxSave()
      .then(setRxAutoSave)
      .catch(() => {});
  }, []);

  // Restore state from the RxDB save as soon as it is loaded.
  React.useEffect(() => {
    if (!rxAutoSave) return;
    const { stateSnapshot: snap, setup } = rxAutoSave;
    if (!snap) return;
    if (snap.rngState !== null) restoreRng(snap.rngState);
    dispatch({ type: "restore_game", payload: snap.state });
    setStrategy(setup.strategy);
    if (setup.managedTeam !== null) setManagedTeam(setup.managedTeam);
    setManagerMode(setup.managerMode);
  }, [dispatch, rxAutoSave, setStrategy, setManagedTeam, setManagerMode]);

  const handleResume = () => {
    // State is already restored by the effect above; wire up the save ID.
    if (rxAutoSave) {
      rxSaveIdRef.current = rxAutoSave.id;
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
    const setup: GameSaveSetup = {
      strategy,
      managedTeam,
      managerMode: managedTeam !== null,
      homeTeam,
      awayTeam,
      playerOverrides: [playerOverrides.away, playerOverrides.home],
      lineupOrder: [playerOverrides.awayOrder, playerOverrides.homeOrder],
    };
    SaveStore.createSave(
      {
        matchupMode: "default",
        homeTeamId: homeTeam,
        awayTeamId: awayTeam,
        seed: currentSeedStr(),
        setup,
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
          autoSaveName={rxAutoSave?.name}
          onResume={rxAutoSave?.stateSnapshot ? handleResume : undefined}
        />
      )}
      <LineScore />
      <GameControls key={gameKey} onNewGame={handleNewGame} gameStarted={gameActive} />
      <GameBody>
        <LeftPanel>
          <HitLog />
          <PlayerStatsPanel />
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

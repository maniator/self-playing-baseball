import * as React from "react";

import { resolveCustomIdsInString } from "@features/customTeams/adapters/customTeamAdapter";
import { useLocalStorage } from "usehooks-ts";

import Announcements from "@components/Announcements";
import type { ExhibitionGameSetup } from "@components/AppShell";
import Diamond from "@components/Diamond";
import GameControls from "@components/GameControls";
import HitLog from "@components/HitLog";
import LineScore from "@components/LineScore";
import NewGameDialog, { type PlayerOverrides } from "@components/NewGameDialog";
import PlayerStatsPanel from "@components/PlayerStatsPanel";
import TeamTabBar from "@components/TeamTabBar";
import type { GameAction, Strategy } from "@context/index";
import { useGameContext } from "@context/index";
import { useCustomTeams } from "@hooks/useCustomTeams";
import { useRxdbGameSync } from "@hooks/useRxdbGameSync";
import { useSaveStore } from "@hooks/useSaveStore";
import type { GameSaveSetup, SaveDoc } from "@storage/types";
import { getSeed, restoreRng } from "@utils/rng";
import { currentSeedStr } from "@utils/saves";

import { FieldPanel, GameBody, GameDiv, LogPanel } from "./styles";

/** Finds the best save to auto-resume: prefer seed+snapshot match, fallback to any snapshot. */
const findMatchedSave = (saves: SaveDoc[]): SaveDoc | null => {
  const currentSeed = getSeed()?.toString(36);
  let anySnapshot: SaveDoc | null = null;
  for (const s of saves) {
    if (s.stateSnapshot == null) continue;
    if (currentSeed != null && s.seed === currentSeed) return s; // best match
    if (anySnapshot == null) anySnapshot = s; // first snapshot fallback
  }
  return anySnapshot;
};

interface Props {
  /** Shared buffer populated by GameProviderWrapper's onDispatch callback. */
  actionBufferRef?: React.MutableRefObject<GameAction[]>;
  /** Routes back to the Home screen in AppShell. */
  onBackToHome?: () => void;
  /** Routes to the Manage Teams screen from the New Game dialog custom-team CTA. */
  onManageTeams?: () => void;
  /** Called when the in-game New Game button is clicked; navigates to /exhibition/new. */
  onNewGame?: () => void;
  /** Called the first time a real game session starts or a save is loaded. */
  onGameSessionStarted?: () => void;
  /** Setup from /exhibition/new; auto-starts a game when it arrives. */
  pendingGameSetup?: ExhibitionGameSetup | null;
  /** Called after pendingGameSetup is consumed so GamePage can clear it. */
  onConsumeGameSetup?: () => void;
  /** Save loaded from /saves page; auto-restores game state when it arrives. */
  pendingLoadSave?: SaveDoc | null;
  /** Called after pendingLoadSave is consumed so GamePage can clear it. */
  onConsumePendingLoad?: () => void;
}

const GameInner: React.FunctionComponent<Props> = ({
  actionBufferRef: externalBufferRef,
  onBackToHome,
  onManageTeams,
  onNewGame,
  onGameSessionStarted,
  pendingGameSetup,
  onConsumeGameSetup,
  pendingLoadSave,
  onConsumePendingLoad,
}) => {
  const { dispatch, dispatchLog, teams } = useGameContext();
  const [, setManagerMode] = useLocalStorage("managerMode", false);
  const [, setManagedTeam] = useLocalStorage<0 | 1>("managedTeam", 0);
  const [strategy, setStrategy] = useLocalStorage<Strategy>("strategy", "balanced");

  const [dialogOpen, setDialogOpen] = React.useState(true);
  const [gameKey, setGameKey] = React.useState(0);
  const [gameActive, setGameActive] = React.useState(false);
  const [activeTeam, setActiveTeam] = React.useState<0 | 1>(0);

  // Dialogs opened via showModal() live in the browser's top layer and are NOT
  // affected by display:none on their parent container.  Close them explicitly
  // before routing Home so the backdrop never blocks the HomeScreen buttons.
  // Also reset dialogOpen so the NewGameDialog is unmounted — this prevents
  // residual top-layer state in WebKit when the Game div is later re-shown.
  const handleSafeBackToHome = React.useCallback(() => {
    if (typeof document !== "undefined") {
      document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach((d) => d.close());
    }
    setDialogOpen(false);
    onBackToHome?.();
  }, [onBackToHome]);

  // Same top-layer cleanup needed when navigating to Manage Teams from the
  // New Game dialog's Custom Teams empty-state link.  Without this, the
  // showModal() backdrop remains active and makes ManageTeams buttons inert.
  const handleSafeManageTeams = React.useCallback(() => {
    if (typeof document !== "undefined") {
      document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach((d) => d.close());
    }
    setDialogOpen(false);
    onManageTeams?.();
  }, [onManageTeams]);

  // Fallback buffer when rendered without the Game wrapper (e.g. in tests).
  const localBufferRef = React.useRef<GameAction[]>([]);
  const actionBufferRef = externalBufferRef ?? localBufferRef;

  // Tracks the RxDB save ID for the current game session.
  const rxSaveIdRef = React.useRef<string | null>(null);

  useRxdbGameSync(rxSaveIdRef, actionBufferRef);

  // Reactive saves list — used for auto-resume detection on initial load.
  const { saves, createSave } = useSaveStore();

  // Custom teams for resolving human-readable names in the resume banner (autoSaveName).
  const { teams: customTeams } = useCustomTeams();

  // Set rxAutoSave once when the first seed-matched save appears in the reactive list.
  // Skip auto-restore when navigating via "Load Saved Game" — the user will pick from the modal.
  const restoredRef = React.useRef(false);
  const [rxAutoSave, setRxAutoSave] = React.useState<SaveDoc | null>(null);
  React.useEffect(() => {
    if (restoredRef.current) return;
    const matched = findMatchedSave(saves);
    if (!matched) return;
    restoredRef.current = true;
    setRxAutoSave(matched);
  }, [saves]);

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
    onGameSessionStarted?.();
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
    dispatchLog({ type: "reset" });
    dispatch({
      type: "setTeams",
      payload: {
        teams: [awayTeam, homeTeam],
        playerOverrides: [playerOverrides.away, playerOverrides.home],
        lineupOrder: [playerOverrides.awayOrder, playerOverrides.homeOrder],
        ...(playerOverrides.awayBench !== undefined &&
          playerOverrides.homeBench !== undefined && {
            rosterBench: [playerOverrides.awayBench, playerOverrides.homeBench],
          }),
        ...(playerOverrides.awayPitchers !== undefined &&
          playerOverrides.homePitchers !== undefined && {
            rosterPitchers: [playerOverrides.awayPitchers, playerOverrides.homePitchers],
          }),
        ...(playerOverrides.startingPitcherIdx !== undefined && {
          startingPitcherIdx: playerOverrides.startingPitcherIdx,
        }),
      },
    });

    // Create a new RxDB save for this session (fire-and-forget).
    // currentSeedStr() returns the seed that was already initialized for this
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
    createSave(
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
    onGameSessionStarted?.();
    setGameKey((k) => k + 1);
    setDialogOpen(false);
  };

  const handleNewGame = () => {
    rxSaveIdRef.current = null;
    dispatch({ type: "reset" });
    dispatchLog({ type: "reset" });
    setGameActive(false);
    setGameKey((k) => k + 1);
    // Navigate to /exhibition/new to start a fresh game.
    // onNewGame is optional only to support isolated unit tests; in production
    // GamePage always provides it.
    if (onNewGame) {
      onNewGame();
    } else if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "GameInner: onNewGame was not provided. " +
          "In production this prop must always be supplied by GamePage.",
      );
    }
  };

  // Keep a stable ref to handleStart so the pendingGameSetup effect can call
  // it without including it in the dependency array (it captures many setters).
  const handleStartRef = React.useRef(handleStart);
  handleStartRef.current = handleStart;

  // Auto-start the game when AppShell delivers a setup from /exhibition/new.
  const prevPendingSetup = React.useRef<ExhibitionGameSetup | null>(null);
  React.useEffect(() => {
    if (!pendingGameSetup) return;
    if (pendingGameSetup === prevPendingSetup.current) return;
    prevPendingSetup.current = pendingGameSetup;
    handleStartRef.current(
      pendingGameSetup.homeTeam,
      pendingGameSetup.awayTeam,
      pendingGameSetup.managedTeam,
      pendingGameSetup.playerOverrides,
    );
    onConsumeGameSetup?.();
  }, [pendingGameSetup, onConsumeGameSetup]);

  // Restore game state when AppShell delivers a save loaded from the /saves page.
  const prevPendingLoad = React.useRef<SaveDoc | null>(null);
  React.useEffect(() => {
    if (!pendingLoadSave) return;
    if (pendingLoadSave === prevPendingLoad.current) return;
    prevPendingLoad.current = pendingLoadSave;

    const snap = pendingLoadSave.stateSnapshot;
    if (!snap) {
      // No snapshot available — clear the pending state but don't restore.
      onConsumePendingLoad?.();
      return;
    }

    if (snap.rngState !== null) restoreRng(snap.rngState);
    dispatch({ type: "restore_game", payload: snap.state });

    const { setup } = pendingLoadSave;
    setManagerMode(setup.managerMode);
    setManagedTeam(setup.managedTeam ?? 0);
    setStrategy(setup.strategy);

    rxSaveIdRef.current = pendingLoadSave.id;
    setGameActive(true);
    setDialogOpen(false);
    onGameSessionStarted?.();
    onConsumePendingLoad?.();
    return () => {
      prevPendingLoad.current = null;
    };
  }, [
    pendingLoadSave,
    dispatch,
    setManagerMode,
    setManagedTeam,
    setStrategy,
    onGameSessionStarted,
    onConsumePendingLoad,
  ]);

  const handleLoadActivate = React.useCallback(
    (saveId: string) => {
      rxSaveIdRef.current = saveId;
      setGameActive(true);
      onGameSessionStarted?.();
      setDialogOpen(false);
    },
    [onGameSessionStarted],
  );

  // Resolve custom team IDs in the auto-save name to human-readable labels.
  const autoSaveName = React.useMemo(() => {
    const name = rxAutoSave?.name;
    if (!name) return undefined;
    return resolveCustomIdsInString(name, customTeams);
  }, [rxAutoSave?.name, customTeams]);

  return (
    <GameDiv>
      {dialogOpen && (
        <NewGameDialog
          onStart={handleStart}
          autoSaveName={autoSaveName}
          onResume={rxAutoSave?.stateSnapshot ? handleResume : undefined}
          onBackToHome={handleSafeBackToHome}
          onManageTeams={handleSafeManageTeams}
        />
      )}
      <LineScore />
      <GameControls
        key={gameKey}
        onNewGame={handleNewGame}
        gameStarted={gameActive}
        onLoadActivate={handleLoadActivate}
        onBackToHome={handleSafeBackToHome}
      />
      <GameBody>
        <FieldPanel>
          <Diamond />
        </FieldPanel>
        <LogPanel data-testid="log-panel">
          <TeamTabBar teams={teams} activeTeam={activeTeam} onSelect={setActiveTeam} />
          <PlayerStatsPanel activeTeam={activeTeam} />
          <HitLog activeTeam={activeTeam} />
          <Announcements />
        </LogPanel>
      </GameBody>
    </GameDiv>
  );
};

export default GameInner;

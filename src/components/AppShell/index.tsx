import * as React from "react";

import { Outlet, useLocation, useNavigate } from "react-router";

import Game from "@components/Game";
import type { PlayerOverrides } from "@components/NewGameDialog";
import type { SaveDoc } from "@storage/types";

export type AppShellOutletContext = {
  onStartGame: (setup: ExhibitionGameSetup) => void;
  /** Called from the saves page when the user picks a save to load. */
  onLoadSave: (slot: SaveDoc) => void;
  // Navigation callbacks consumed by route-level page components
  onNewGame: () => void;
  onLoadSaves: () => void;
  onManageTeams: () => void;
  onResumeCurrent: () => void;
  onHelp: () => void;
  onBackToHome: () => void;
  hasActiveSession: boolean;
};

/** Shape for a game setup originating from the /exhibition/new page. */
export type ExhibitionGameSetup = {
  homeTeam: string;
  awayTeam: string;
  managedTeam: 0 | 1 | null;
  playerOverrides: PlayerOverrides;
};

/** Returns true when the current pathname is exactly the /game route. */
function isGameRoute(pathname: string): boolean {
  return pathname === "/game";
}

const AppShell: React.FunctionComponent = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const onGameRoute = isGameRoute(location.pathname);

  // True only once a real game session has been started or loaded — gates Resume.
  const [hasActiveSession, setHasActiveSession] = React.useState(false);
  // Whether Game has ever been mounted (controls CSS visibility wrapper).
  const [gameEverMounted, setGameEverMounted] = React.useState(false);
  // Incremented each time the user requests a new game from within the game screen.
  const [newGameRequestCount, setNewGameRequestCount] = React.useState(0);
  // Pending setup from /exhibition/new — consumed by GameInner to auto-start a game.
  const [pendingGameSetup, setPendingGameSetup] = React.useState<ExhibitionGameSetup | null>(null);
  // Pending save loaded from /saves page — consumed by GameInner to restore game state.
  const [pendingLoadSave, setPendingLoadSave] = React.useState<SaveDoc | null>(null);

  // Keep Game mounted once we visit /game.
  React.useEffect(() => {
    if (onGameRoute) {
      setGameEverMounted(true);
    }
  }, [onGameRoute]);

  const handleGameSessionStarted = React.useCallback(() => {
    setHasActiveSession(true);
  }, []);

  const handleResumeCurrent = React.useCallback(() => {
    navigate("/game");
  }, [navigate]);

  const handleNewGame = React.useCallback(() => {
    // Primary "New Game" path from Home: navigate to the Exhibition Setup page.
    navigate("/exhibition/new");
  }, [navigate]);

  const handleNewGameFromGame = React.useCallback(() => {
    // In-game "New Game" button: re-open the New Game dialog within /game.
    setNewGameRequestCount((c) => c + 1);
  }, []);

  const handleLoadSaves = React.useCallback(() => {
    navigate("/saves");
  }, [navigate]);

  /** Called from the saves page — stores the pending save and navigates to /game. */
  const handleLoadSave = React.useCallback(
    (slot: SaveDoc) => {
      setPendingLoadSave(slot);
      setGameEverMounted(true);
      navigate("/game");
    },
    [navigate],
  );

  const handleConsumePendingLoad = React.useCallback(() => {
    setPendingLoadSave(null);
  }, []);

  const handleBackToHome = React.useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleManageTeams = React.useCallback(() => {
    navigate("/teams");
  }, [navigate]);

  const handleHelp = React.useCallback(() => {
    navigate("/help");
  }, [navigate]);

  /** Called from /exhibition/new — stores setup and navigates to /game. */
  const handleStartFromExhibition = React.useCallback(
    (setup: ExhibitionGameSetup) => {
      setPendingGameSetup(setup);
      setGameEverMounted(true);
      navigate("/game");
    },
    [navigate],
  );

  const handleConsumeGameSetup = React.useCallback(() => {
    setPendingGameSetup(null);
  }, []);

  const outletContext: AppShellOutletContext = React.useMemo(
    () => ({
      onStartGame: handleStartFromExhibition,
      onLoadSave: handleLoadSave,
      onNewGame: handleNewGame,
      onLoadSaves: handleLoadSaves,
      onManageTeams: handleManageTeams,
      onResumeCurrent: handleResumeCurrent,
      onHelp: handleHelp,
      onBackToHome: handleBackToHome,
      hasActiveSession,
    }),
    [
      handleStartFromExhibition,
      handleLoadSave,
      handleNewGame,
      handleLoadSaves,
      handleManageTeams,
      handleResumeCurrent,
      handleHelp,
      handleBackToHome,
      hasActiveSession,
    ],
  );

  return (
    <>
      {/* Game is kept mounted once entered so in-memory state survives navigation. */}
      <div style={{ display: onGameRoute ? undefined : "none" }}>
        {gameEverMounted && (
          <Game
            newGameRequestCount={newGameRequestCount}
            onBackToHome={handleBackToHome}
            onManageTeams={handleManageTeams}
            onGameSessionStarted={handleGameSessionStarted}
            onNewGame={handleNewGameFromGame}
            pendingGameSetup={pendingGameSetup}
            onConsumeGameSetup={handleConsumeGameSetup}
            pendingLoadSave={pendingLoadSave}
            onConsumePendingLoad={handleConsumePendingLoad}
            isOnGameRoute={onGameRoute}
          />
        )}
      </div>

      {/* Every route has an explicit element defined in router.tsx. */}
      <Outlet context={outletContext} />
    </>
  );
};

export default AppShell;

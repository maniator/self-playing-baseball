import * as React from "react";

import { Outlet, useLocation, useNavigate } from "react-router-dom";

import Game from "@components/Game";
import HomeScreen from "@components/HomeScreen";
import ManageTeamsScreen from "@components/ManageTeamsScreen";
import type { PlayerOverrides } from "@components/NewGameDialog";

export type InitialGameView = "new-game" | "load-saves";

/** Passed via <Outlet context> to child routes like /exhibition/new. */
export type AppShellOutletContext = {
  onStartGame: (setup: ExhibitionGameSetup) => void;
};

/** Shape for a game setup originating from the /exhibition/new page. */
export type ExhibitionGameSetup = {
  homeTeam: string;
  awayTeam: string;
  managedTeam: 0 | 1 | null;
  playerOverrides: PlayerOverrides;
};

type Screen = "home" | "game" | "manage-teams" | "other";

function pathnameToScreen(pathname: string): Screen {
  if (pathname === "/" || pathname === "") return "home";
  if (pathname === "/game") return "game";
  if (pathname.startsWith("/teams")) return "manage-teams";
  return "other";
}

const AppShell: React.FunctionComponent = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const screen = pathnameToScreen(location.pathname);

  const [initialGameView, setInitialGameView] = React.useState<InitialGameView>("new-game");
  // True only once a real game session has been started or loaded — gates Resume.
  const [hasActiveSession, setHasActiveSession] = React.useState(false);
  // Whether Game has ever been mounted (controls CSS visibility wrapper).
  const [gameEverMounted, setGameEverMounted] = React.useState(false);
  // Incremented each time the user requests a new game from within the game screen.
  const [newGameRequestCount, setNewGameRequestCount] = React.useState(0);
  // Incremented each time the user navigates via "Load Saved Game"; GameInner watches this.
  const [loadSavesRequestCount, setLoadSavesRequestCount] = React.useState(0);
  // Pending setup from /exhibition/new — consumed by GameInner to auto-start a game.
  const [pendingGameSetup, setPendingGameSetup] = React.useState<ExhibitionGameSetup | null>(null);

  // Keep Game mounted once we visit /game.
  React.useEffect(() => {
    if (screen === "game") {
      setGameEverMounted(true);
    }
  }, [screen]);

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
    setInitialGameView("load-saves");
    setGameEverMounted(true);
    setLoadSavesRequestCount((c) => c + 1);
    navigate("/game");
  }, [navigate]);

  const handleBackToHome = React.useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleManageTeams = React.useCallback(() => {
    navigate("/teams");
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
    () => ({ onStartGame: handleStartFromExhibition }),
    [handleStartFromExhibition],
  );

  return (
    <>
      {/* Game is kept mounted once entered so in-memory state survives navigation. */}
      <div style={{ display: screen === "game" ? undefined : "none" }}>
        {gameEverMounted && (
          <Game
            initialView={initialGameView}
            newGameRequestCount={newGameRequestCount}
            loadSavesRequestCount={loadSavesRequestCount}
            onBackToHome={handleBackToHome}
            onManageTeams={handleManageTeams}
            onGameSessionStarted={handleGameSessionStarted}
            onNewGame={handleNewGameFromGame}
            pendingGameSetup={pendingGameSetup}
            onConsumeGameSetup={handleConsumeGameSetup}
            isOnGameRoute={screen === "game"}
          />
        )}
      </div>

      {screen === "home" && (
        <HomeScreen
          onNewGame={handleNewGame}
          onLoadSaves={handleLoadSaves}
          onManageTeams={handleManageTeams}
          onResumeCurrent={hasActiveSession ? handleResumeCurrent : undefined}
        />
      )}

      {screen === "manage-teams" && (
        <ManageTeamsScreen onBack={handleBackToHome} hasActiveGame={hasActiveSession} />
      )}

      {screen === "other" && <Outlet context={outletContext} />}
    </>
  );
};

export default AppShell;

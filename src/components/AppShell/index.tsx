import * as React from "react";

import Game from "@components/Game";
import HomeScreen from "@components/HomeScreen";
import ManageTeamsScreen from "@components/ManageTeamsScreen";

type Screen = "home" | "game" | "manage-teams";
export type InitialGameView = "new-game" | "load-saves";

const AppShell: React.FunctionComponent = () => {
  const [screen, setScreen] = React.useState<Screen>("home");
  const [initialGameView, setInitialGameView] = React.useState<InitialGameView>("new-game");
  // True only once a real game session has been started or loaded — gates Resume.
  const [hasActiveSession, setHasActiveSession] = React.useState(false);
  // Whether Game has ever been mounted (controls CSS visibility wrapper).
  const [gameEverMounted, setGameEverMounted] = React.useState(false);
  // Incremented each time the user requests a new game; GameInner watches this.
  const [newGameRequestCount, setNewGameRequestCount] = React.useState(0);

  const goHome = React.useCallback(() => setScreen("home"), []);
  const goManageTeams = React.useCallback(() => setScreen("manage-teams"), []);

  const handleBackToHome = React.useCallback(() => setScreen("home"), []);

  // Called by Game/GameInner when setGameActive(true) fires.
  const handleGameSessionStarted = React.useCallback(() => {
    setHasActiveSession(true);
  }, []);

  const handleResumeCurrent = React.useCallback(() => setScreen("game"), []);

  const handleNewGame = React.useCallback(() => {
    setInitialGameView("new-game");
    setGameEverMounted(true);
    setNewGameRequestCount((c) => c + 1);
    setScreen("game");
  }, []);

  const handleLoadSaves = React.useCallback(() => {
    setInitialGameView("load-saves");
    setGameEverMounted(true);
    setScreen("game");
  }, []);

  return (
    <>
      {/* Game is kept mounted once entered so in-memory state survives navigation. */}
      <div style={{ display: screen === "game" ? undefined : "none" }}>
        {gameEverMounted && (
          <Game
            initialView={initialGameView}
            newGameRequestCount={newGameRequestCount}
            onBackToHome={handleBackToHome}
            onManageTeams={goManageTeams}
            onGameSessionStarted={handleGameSessionStarted}
          />
        )}
      </div>

      {screen === "home" && (
        <HomeScreen
          onNewGame={handleNewGame}
          onLoadSaves={handleLoadSaves}
          onManageTeams={goManageTeams}
          onResumeCurrent={hasActiveSession ? handleResumeCurrent : undefined}
        />
      )}

      {screen === "manage-teams" && (
        <ManageTeamsScreen onBack={goHome} hasActiveGame={hasActiveSession} />
      )}
    </>
  );
};

export default AppShell;

import * as React from "react";

import Game from "@components/Game";
import HomeScreen from "@components/HomeScreen";
import ManageTeamsScreen from "@components/ManageTeamsScreen";

type Screen = "home" | "game" | "manage-teams";
export type InitialGameView = "new-game" | "load-saves";

const AppShell: React.FunctionComponent = () => {
  const [screen, setScreen] = React.useState<Screen>("home");
  const [initialGameView, setInitialGameView] = React.useState<InitialGameView>("new-game");
  // True once a game session has been started — enables the Resume button.
  const [gameEverStarted, setGameEverStarted] = React.useState(false);

  const goHome = React.useCallback(() => setScreen("home"), []);
  const goManageTeams = React.useCallback(() => setScreen("manage-teams"), []);

  const handleBackToHome = React.useCallback(() => {
    setGameEverStarted(true);
    setScreen("home");
  }, []);

  const handleResumeCurrent = React.useCallback(() => setScreen("game"), []);

  const handleNewGame = React.useCallback(() => {
    setInitialGameView("new-game");
    setGameEverStarted(true);
    setScreen("game");
  }, []);

  const handleLoadSaves = React.useCallback(() => {
    setInitialGameView("load-saves");
    setGameEverStarted(true);
    setScreen("game");
  }, []);

  return (
    <>
      {/* Game is kept mounted once started so in-memory state survives navigation. */}
      <div style={{ display: screen === "game" ? undefined : "none" }}>
        {gameEverStarted && (
          <Game
            initialView={initialGameView}
            onBackToHome={handleBackToHome}
            onManageTeams={goManageTeams}
          />
        )}
      </div>

      {screen === "home" && (
        <HomeScreen
          onNewGame={handleNewGame}
          onLoadSaves={handleLoadSaves}
          onManageTeams={goManageTeams}
          onResumeCurrent={gameEverStarted ? handleResumeCurrent : undefined}
        />
      )}

      {screen === "manage-teams" && (
        <ManageTeamsScreen onBack={goHome} hasActiveGame={gameEverStarted} />
      )}
    </>
  );
};

export default AppShell;

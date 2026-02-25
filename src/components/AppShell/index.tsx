import * as React from "react";

import Game from "@components/Game";
import HomeScreen from "@components/HomeScreen";
import ManageTeamsScreen from "@components/ManageTeamsScreen";

type Screen = "home" | "game" | "manage-teams";
export type InitialGameView = "new-game" | "load-saves";

/** Shape stored in the History API state object. */
interface HistoryState {
  screen: Screen;
}

/** Push a new browser history entry for the given screen. */
function pushScreenState(s: Screen): void {
  if (typeof window !== "undefined" && typeof window.history?.pushState === "function") {
    window.history.pushState({ screen: s } satisfies HistoryState, "");
  }
}

const AppShell: React.FunctionComponent = () => {
  const [screen, setScreen] = React.useState<Screen>("home");
  const [initialGameView, setInitialGameView] = React.useState<InitialGameView>("new-game");
  // True only once a real game session has been started or loaded — gates Resume.
  const [hasActiveSession, setHasActiveSession] = React.useState(false);
  // Whether Game has ever been mounted (controls CSS visibility wrapper).
  const [gameEverMounted, setGameEverMounted] = React.useState(false);
  // Incremented each time the user requests a new game; GameInner watches this.
  const [newGameRequestCount, setNewGameRequestCount] = React.useState(0);
  // Incremented each time the user navigates via "Load Saved Game"; GameInner watches this.
  const [loadSavesRequestCount, setLoadSavesRequestCount] = React.useState(0);

  // Seed the initial history entry so browser Back/Forward works from the start.
  React.useEffect(() => {
    if (typeof window !== "undefined" && typeof window.history?.replaceState === "function") {
      window.history.replaceState({ screen: "home" } satisfies HistoryState, "");
    }
  }, []);

  // Listen for browser Back/Forward and restore the matching screen.
  // Intentionally does NOT increment request counters — we only restore the
  // screen that was visible; the Game component stays mounted throughout.
  React.useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const state = event.state as HistoryState | null;
      const next = state?.screen;
      if (next === "home" || next === "game" || next === "manage-teams") {
        // Close any open <dialog> elements before changing screen so the
        // top-layer does not leave modals blocking input on the incoming screen.
        if (next !== "game") {
          document.querySelectorAll("dialog[open]").forEach((d) => {
            (d as HTMLDialogElement).close();
          });
        }
        setScreen(next);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const goHome = React.useCallback(() => {
    setScreen("home");
    pushScreenState("home");
  }, []);

  const goManageTeams = React.useCallback(() => {
    setScreen("manage-teams");
    pushScreenState("manage-teams");
  }, []);

  const handleBackToHome = React.useCallback(() => {
    setScreen("home");
    pushScreenState("home");
  }, []);

  // Called by Game/GameInner when setGameActive(true) fires.
  const handleGameSessionStarted = React.useCallback(() => {
    setHasActiveSession(true);
  }, []);

  const handleResumeCurrent = React.useCallback(() => {
    setScreen("game");
    pushScreenState("game");
  }, []);

  const handleNewGame = React.useCallback(() => {
    setInitialGameView("new-game");
    setGameEverMounted(true);
    setNewGameRequestCount((c) => c + 1);
    setScreen("game");
    pushScreenState("game");
  }, []);

  const handleLoadSaves = React.useCallback(() => {
    setInitialGameView("load-saves");
    setGameEverMounted(true);
    setLoadSavesRequestCount((c) => c + 1);
    setScreen("game");
    pushScreenState("game");
  }, []);

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

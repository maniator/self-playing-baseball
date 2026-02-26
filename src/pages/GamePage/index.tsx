import * as React from "react";

import { useLocation, useNavigate, useOutletContext } from "react-router";

import type {
  AppShellOutletContext,
  ExhibitionGameSetup,
  GameLocationState,
} from "@components/AppShell";
import Game from "@components/Game";
import type { SaveDoc } from "@storage/types";

const GamePage: React.FunctionComponent = () => {
  const ctx = useOutletContext<AppShellOutletContext>();
  const location = useLocation();
  const navigate = useNavigate();

  // Capture one-shot state from navigation on first render only.
  const gameState = location.state as GameLocationState;
  const pendingSetupRef = React.useRef<ExhibitionGameSetup | null>(
    gameState?.pendingGameSetup ?? null,
  );
  const pendingLoadRef = React.useRef<SaveDoc | null>(gameState?.pendingLoadSave ?? null);

  // Clear location state immediately after capturing so browser back doesn't re-trigger.
  // `navigate` is stable across renders (guaranteed by React Router), so it is safe
  // and correct to include it as the only dependency.
  React.useEffect(() => {
    if (location.state) {
      navigate("/game", { replace: true, state: null });
    }
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps -- runs once on mount; location.state captured in refs above

  const handleConsumeSetup = React.useCallback(() => {
    pendingSetupRef.current = null;
  }, []);

  const handleConsumeLoad = React.useCallback(() => {
    pendingLoadRef.current = null;
  }, []);

  const handleNewGame = React.useCallback(() => {
    navigate("/exhibition/new");
  }, [navigate]);

  return (
    <Game
      onBackToHome={ctx.onBackToHome}
      onNewGame={handleNewGame}
      onGameSessionStarted={ctx.onGameSessionStarted}
      pendingGameSetup={pendingSetupRef.current}
      onConsumeGameSetup={handleConsumeSetup}
      pendingLoadSave={pendingLoadRef.current}
      onConsumePendingLoad={handleConsumeLoad}
    />
  );
};

export default GamePage;

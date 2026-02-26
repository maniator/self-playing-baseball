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

  // Guard prevents re-clearing on subsequent renders if location.state changes.
  const hasClearedStateRef = React.useRef(false);

  // Clear location state after capturing so browser back/forward doesn't re-trigger.
  // hasClearedStateRef ensures this runs at most once regardless of re-renders.
  React.useEffect(() => {
    if (!hasClearedStateRef.current && location.state) {
      hasClearedStateRef.current = true;
      navigate("/game", { replace: true, state: null });
    }
  }, [location.state, navigate]);

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

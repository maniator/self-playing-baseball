import * as React from "react";

import { Outlet, useLocation, useNavigate } from "react-router";

import VolumeControls from "@components/GameControls/VolumeControls";
import type { PlayerOverrides } from "@components/NewGameDialog";
import { useHomeScreenMusic } from "@hooks/useHomeScreenMusic";
import { useVolumeControls } from "@hooks/useVolumeControls";
import type { SaveDoc } from "@storage/types";

import { AppVolumeBar } from "./styles";

export type AppShellOutletContext = {
  onStartGame: (setup: ExhibitionGameSetup) => void;
  /** Called from the saves page when the user picks a save to load. */
  onLoadSave: (slot: SaveDoc) => void;
  /** Called by GamePage when a game session starts, to update hasActiveSession. */
  onGameSessionStarted: () => void;
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

/** Shape of the React Router location state used when navigating to /game. */
export type GameLocationState = {
  pendingGameSetup: ExhibitionGameSetup | null;
  pendingLoadSave: SaveDoc | null;
} | null;

const AppShell: React.FunctionComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // True only once a real game session has been started or loaded — gates Resume.
  const [hasActiveSession, setHasActiveSession] = React.useState(false);

  const isGameRoute = location.pathname === "/game";

  const volume = useVolumeControls();
  // Pass alertVolume = 0 on /game to stop music (game has its own audio: fanfare, chimes, stretch).
  useHomeScreenMusic(isGameRoute ? 0 : volume.alertVolume);

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

  const handleLoadSaves = React.useCallback(() => {
    navigate("/saves");
  }, [navigate]);

  /** Called from the saves page — navigates to /game with the save as location state. */
  const handleLoadSave = React.useCallback(
    (slot: SaveDoc) => {
      navigate("/game", { state: { pendingLoadSave: slot, pendingGameSetup: null } });
    },
    [navigate],
  );

  const handleBackToHome = React.useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleManageTeams = React.useCallback(() => {
    navigate("/teams");
  }, [navigate]);

  const handleHelp = React.useCallback(() => {
    navigate("/help");
  }, [navigate]);

  /** Called from /exhibition/new — navigates to /game with the setup as location state. */
  const handleStartFromExhibition = React.useCallback(
    (setup: ExhibitionGameSetup) => {
      navigate("/game", { state: { pendingGameSetup: setup, pendingLoadSave: null } });
    },
    [navigate],
  );

  const outletContext: AppShellOutletContext = React.useMemo(
    () => ({
      onStartGame: handleStartFromExhibition,
      onLoadSave: handleLoadSave,
      onGameSessionStarted: handleGameSessionStarted,
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
      handleGameSessionStarted,
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
      <Outlet context={outletContext} />
      {!isGameRoute && (
        <AppVolumeBar data-testid="app-volume-bar">
          <VolumeControls
            announcementVolume={volume.announcementVolume}
            alertVolume={volume.alertVolume}
            onAnnouncementVolumeChange={volume.handleAnnouncementVolumeChange}
            onAlertVolumeChange={volume.handleAlertVolumeChange}
            onToggleAnnouncementMute={volume.handleToggleAnnouncementMute}
            onToggleAlertMute={volume.handleToggleAlertMute}
          />
        </AppVolumeBar>
      )}
    </>
  );
};

export default AppShell;

import * as React from "react";

import { Strategy } from "@context/index";

import { SPEED_FAST, SPEED_NORMAL, SPEED_SLOW } from "./constants";
import ManagerModeControls from "./ManagerModeControls";
import { AutoPlayGroup, Button, Controls, HelpButton, Select, ToggleLabel } from "./styles";
import { useGameControls } from "./useGameControls";
import VolumeControls from "./VolumeControls";

const DecisionPanel = React.lazy(() => import("@components/DecisionPanel"));
const InstructionsModal = React.lazy(() => import("@components/InstructionsModal"));
const SavesModal = React.lazy(() => import("@components/SavesModal"));

type Props = {
  onNewGame?: () => void;
  gameStarted?: boolean;
  onLoadActivate?: (saveId: string) => void;
};

const GameControls: React.FunctionComponent<Props> = ({
  onNewGame,
  gameStarted = false,
  onLoadActivate,
}) => {
  const {
    speed,
    setSpeed,
    announcementVolume,
    alertVolume,
    managerMode,
    setManagerMode,
    strategy,
    setStrategy,
    managedTeam,
    setManagedTeam,
    teams,
    gameOver,
    notifPermission,
    handleManagerModeChange,
    handleRequestNotifPermission,
    handleAnnouncementVolumeChange,
    handleAlertVolumeChange,
    handleToggleAnnouncementMute,
    handleToggleAlertMute,
    handleShareReplay,
    currentSaveId,
    setCurrentSaveId,
  } = useGameControls({ gameStarted });

  return (
    <>
      <Controls>
        {gameOver && onNewGame && (
          <Button $variant="new" onClick={onNewGame}>
            New Game
          </Button>
        )}
        <React.Suspense
          fallback={
            <Button $variant="saves" disabled aria-label="Open saves panel">
              💾 Saves
            </Button>
          }
        >
          <SavesModal
            strategy={strategy}
            managedTeam={managedTeam}
            managerMode={managerMode}
            currentSaveId={currentSaveId}
            onSaveIdChange={setCurrentSaveId}
            onSetupRestore={(setup) => {
              setStrategy(setup.strategy);
              setManagedTeam(setup.managedTeam ?? 0);
              setManagerMode(setup.managerMode ?? false);
            }}
            onLoadActivate={onLoadActivate}
          />
        </React.Suspense>
        <Button $variant="share" onClick={handleShareReplay}>
          Share seed
        </Button>
        <React.Suspense
          fallback={
            <HelpButton disabled aria-label="How to play">
              ?
            </HelpButton>
          }
        >
          <InstructionsModal />
        </React.Suspense>
        <AutoPlayGroup>
          <ToggleLabel>
            Speed
            <Select value={speed} onChange={(e) => setSpeed(parseInt(e.target.value, 10))}>
              <option value={SPEED_SLOW}>Slow</option>
              <option value={SPEED_NORMAL}>Normal</option>
              <option value={SPEED_FAST}>Fast</option>
            </Select>
          </ToggleLabel>
          <VolumeControls
            announcementVolume={announcementVolume}
            alertVolume={alertVolume}
            onAnnouncementVolumeChange={handleAnnouncementVolumeChange}
            onAlertVolumeChange={handleAlertVolumeChange}
            onToggleAnnouncementMute={handleToggleAnnouncementMute}
            onToggleAlertMute={handleToggleAlertMute}
          />
          {gameStarted && (
            <ManagerModeControls
              managerMode={managerMode}
              strategy={strategy}
              managedTeam={managedTeam}
              teams={teams}
              notifPermission={notifPermission}
              onManagerModeChange={handleManagerModeChange}
              onStrategyChange={(e) => setStrategy(e.target.value as Strategy)}
              onManagedTeamChange={(e) => setManagedTeam(Number(e.target.value) === 1 ? 1 : 0)}
              onRequestNotifPermission={handleRequestNotifPermission}
            />
          )}
        </AutoPlayGroup>
      </Controls>
      {gameStarted && managerMode && (
        <React.Suspense fallback={null}>
          <DecisionPanel strategy={strategy} />
        </React.Suspense>
      )}
    </>
  );
};

export default GameControls;

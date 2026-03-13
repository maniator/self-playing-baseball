import * as React from "react";

import { resolveTeamLabel } from "@feat/customTeams/adapters/customTeamAdapter";
import { Strategy } from "@feat/gameplay/context/index";
import { useCustomTeams } from "@shared/hooks/useCustomTeams";

import type { SaveDoc } from "@storage/types";

import { SPEED_FAST, SPEED_INSTANT, SPEED_NORMAL, SPEED_SLOW, SPEED_STEP_LABELS, SPEED_STEPS } from "./constants";
import ManagerModeControls from "./ManagerModeControls";
import {
  AutoPlayGroup,
  Button,
  Controls,
  HelpButton,
  PausePlayButton,
  SpeedLabel,
  SpeedRow,
  SpeedSlider,
  ToggleLabel,
} from "./styles";
import { useGameControls } from "./useGameControls";
import VolumeControls from "./VolumeControls";

const DecisionPanel = React.lazy(() => import("@feat/gameplay/components/DecisionPanel"));
const InstructionsModal = React.lazy(() => import("@feat/help/components/InstructionsModal"));
const SavesModal = React.lazy(() => import("@feat/saves/components/SavesModal"));

type Props = {
  onNewGame?: () => void;
  gameStarted?: boolean;
  onLoadSave?: (slot: SaveDoc) => void;
  /** Routes back to the Home screen. When provided a "← Home" button is shown. */
  onBackToHome?: () => void;
  /** When true, shows a disabled "Saving…" button instead of "New Game". */
  isCommitting?: boolean;
};

const GameControls: React.FunctionComponent<Props> = ({
  onNewGame,
  gameStarted = false,
  onLoadSave,
  onBackToHome,
  isCommitting = false,
}) => {
  const {
    speed,
    setSpeed,
    announcementVolume,
    alertVolume,
    managerMode,
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
    currentSaveId,
    setCurrentSaveId,
  } = useGameControls({ gameStarted });

  const { teams: customTeamDocs } = useCustomTeams();
  // Resolve display labels for raw game-state team IDs (e.g. `custom:ct_...` → team name)
  const resolvedTeamLabels: [string, string] = [
    resolveTeamLabel(teams[0], customTeamDocs),
    resolveTeamLabel(teams[1], customTeamDocs),
  ];

  return (
    <>
      <Controls>
        {onBackToHome && (
          <Button
            $variant="home"
            onClick={onBackToHome}
            disabled={isCommitting}
            data-testid="back-to-home-button"
          >
            ← Home
          </Button>
        )}
        {gameOver &&
          onNewGame &&
          (isCommitting ? (
            <Button $variant="new" disabled data-testid="new-game-button">
              Saving…
            </Button>
          ) : (
            <Button $variant="new" onClick={onNewGame} data-testid="new-game-button">
              New Game
            </Button>
          ))}
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
            onLoadSave={onLoadSave}
            gameStarted={gameStarted}
          />
        </React.Suspense>
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
            <Select
              value={speed}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSpeed(parseInt(e.target.value, 10))
              }
              data-testid="speed-select"
            >
              <option value={SPEED_SLOW}>Slow</option>
              <option value={SPEED_NORMAL}>Normal</option>
              <option value={SPEED_FAST}>Fast</option>
              <option value={SPEED_INSTANT}>Instant</option>
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
              teams={resolvedTeamLabels}
              notifPermission={notifPermission}
              gameStarted={gameStarted}
              gameOver={gameOver}
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

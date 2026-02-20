import * as React from "react";

import DecisionPanel from "@components/DecisionPanel";
import InstructionsModal from "@components/InstructionsModal";
import SavesModal from "@components/SavesModal";
import { Strategy } from "@context/index";

import { SPEED_FAST, SPEED_NORMAL, SPEED_SLOW } from "./constants";
import ManagerModeControls from "./ManagerModeControls";
import {
  AutoPlayGroup,
  BatterUpButton,
  Controls,
  NewGameButton,
  Select,
  ShareButton,
  ToggleLabel,
} from "./styles";
import { useGameControls } from "./useGameControls";
import VolumeControls from "./VolumeControls";

type Props = {
  onNewGame?: () => void;
};

const GameControls: React.FunctionComponent<Props> = ({ onNewGame }) => {
  const {
    gameStarted,
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
    handleBatterUp,
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
  } = useGameControls();

  return (
    <>
      <Controls>
        {!gameStarted && <BatterUpButton onClick={handleBatterUp}>Batter Up!</BatterUpButton>}
        {gameOver && onNewGame && <NewGameButton onClick={onNewGame}>New Game</NewGameButton>}
        <SavesModal
          strategy={strategy}
          managedTeam={managedTeam}
          currentSaveId={currentSaveId}
          onSaveIdChange={setCurrentSaveId}
          onSetupRestore={(setup) => {
            setStrategy(setup.strategy);
            setManagedTeam(setup.managedTeam);
          }}
        />
        <ShareButton onClick={handleShareReplay}>Share replay</ShareButton>
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
        <InstructionsModal />
      </Controls>
      {gameStarted && managerMode && <DecisionPanel strategy={strategy} />}
    </>
  );
};

export default GameControls;

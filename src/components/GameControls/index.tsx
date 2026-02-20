import * as React from "react";

import DecisionPanel from "@components/DecisionPanel";
import InstructionsModal from "@components/InstructionsModal";
import { Strategy } from "@context/index";

type Props = {
  onNewGame?: () => void;
};

import { SPEED_FAST, SPEED_NORMAL, SPEED_SLOW } from "./constants";
import ManagerModeControls from "./ManagerModeControls";
import {
  AutoPlayGroup,
  Button,
  Controls,
  NewGameButton,
  Select,
  ShareButton,
  ToggleLabel,
} from "./styles";
import { useGameControls } from "./useGameControls";
import VolumeControls from "./VolumeControls";

const GameControls: React.FunctionComponent<Props> = ({ onNewGame }) => {
  const {
    autoPlay,
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
    handleClickRef,
    notifPermission,
    handleManagerModeChange,
    handleRequestNotifPermission,
    handleAutoPlayChange,
    handleAnnouncementVolumeChange,
    handleAlertVolumeChange,
    handleToggleAnnouncementMute,
    handleToggleAlertMute,
    handleShareReplay,
  } = useGameControls();

  return (
    <>
      <Controls>
        {!autoPlay && (
          <Button onClick={handleClickRef.current} disabled={gameOver}>
            Batter Up!
          </Button>
        )}
        {gameOver && <NewGameButton onClick={onNewGame}>New Game</NewGameButton>}
        <ShareButton onClick={handleShareReplay}>Share replay</ShareButton>
        <AutoPlayGroup>
          <ToggleLabel>
            <input type="checkbox" checked={autoPlay} onChange={handleAutoPlayChange} />
            Auto-play
          </ToggleLabel>
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
          {autoPlay && (
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
      {autoPlay && managerMode && <DecisionPanel strategy={strategy} />}
    </>
  );
};

export default GameControls;

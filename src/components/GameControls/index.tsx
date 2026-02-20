import * as React from "react";

import { useLocalStorage } from "usehooks-ts";

import DecisionPanel from "@components/DecisionPanel";
import { ContextValue, Strategy, useGameContext } from "@context/index";
import { useAutoPlayScheduler } from "@hooks/useAutoPlayScheduler";
import { useGameAudio } from "@hooks/useGameAudio";
import { useGameRefs } from "@hooks/useGameRefs";
import { useKeyboardPitch } from "@hooks/useKeyboardPitch";
import { usePitchDispatch } from "@hooks/usePitchDispatch";
import { usePlayerControls } from "@hooks/usePlayerControls";
import { useReplayDecisions } from "@hooks/useReplayDecisions";
import { setAlertVolume, setAnnouncementVolume, setSpeechRate } from "@utils/announce";

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
import VolumeControls from "./VolumeControls";

const GameControls: React.FunctionComponent = () => {
  const {
    dispatch,
    dispatchLog,
    strikes,
    balls,
    baseLayout,
    outs,
    inning,
    score,
    atBat,
    pendingDecision,
    gameOver,
    onePitchModifier,
    teams,
    decisionLog,
    pitchKey,
    suppressNextDecision,
    pinchHitterStrategy,
    defensiveShift,
    defensiveShiftOffered,
  }: ContextValue = useGameContext();
  const [autoPlay, setAutoPlay] = useLocalStorage("autoPlay", false);
  const [speed, setSpeed] = useLocalStorage("speed", SPEED_NORMAL);
  const [announcementVolume, setAnnouncementVolumeState] = useLocalStorage("announcementVolume", 1);
  const [alertVolume, setAlertVolumeState] = useLocalStorage("alertVolume", 1);
  const [managerMode, setManagerMode] = useLocalStorage("managerMode", false);
  const [strategy, setStrategy] = useLocalStorage<Strategy>("strategy", "balanced");
  const [managedTeam, setManagedTeam] = useLocalStorage<0 | 1>("managedTeam", 0);

  const gameSnapshot = {
    strikes,
    balls,
    baseLayout,
    outs,
    inning,
    score,
    atBat,
    pendingDecision,
    gameOver,
    onePitchModifier,
    teams,
    suppressNextDecision,
    pinchHitterStrategy,
    defensiveShift,
    defensiveShiftOffered,
  };
  const {
    autoPlayRef,
    mutedRef,
    speedRef,
    strikesRef,
    managerModeRef,
    strategyRef,
    managedTeamRef,
    gameStateRef,
    skipDecisionRef,
  } = useGameRefs({
    autoPlay,
    announcementVolume,
    speed,
    strikes,
    balls,
    managerMode,
    strategy,
    managedTeam,
    gameSnapshot,
    pendingDecision,
  });

  const betweenInningsPauseRef = useGameAudio(inning, atBat, gameOver, dispatchLog);
  const handleClickRef = usePitchDispatch(
    dispatch,
    gameStateRef,
    managerModeRef,
    strategyRef,
    managedTeamRef,
    skipDecisionRef,
    strikesRef,
  );
  useAutoPlayScheduler(
    autoPlay,
    pendingDecision,
    managerMode,
    autoPlayRef,
    mutedRef,
    speedRef,
    handleClickRef,
    gameStateRef,
    betweenInningsPauseRef,
  );
  useKeyboardPitch(autoPlayRef, handleClickRef);
  useReplayDecisions(dispatch, pendingDecision, pitchKey, strategy);

  React.useEffect(() => {
    setAnnouncementVolume(announcementVolume);
  }, [announcementVolume]);
  React.useEffect(() => {
    setAlertVolume(alertVolume);
  }, [alertVolume]);
  React.useEffect(() => {
    setSpeechRate(speed);
  }, [speed]);

  const {
    notifPermission,
    handleManagerModeChange,
    handleRequestNotifPermission,
    handleAutoPlayChange,
    handleAnnouncementVolumeChange,
    handleAlertVolumeChange,
    handleToggleAnnouncementMute,
    handleToggleAlertMute,
    handleShareReplay,
  } = usePlayerControls({
    managerMode,
    setManagerMode,
    setAutoPlay,
    announcementVolume,
    setAnnouncementVolumeState,
    alertVolume,
    setAlertVolumeState,
    decisionLog,
    dispatchLog,
  });

  return (
    <>
      <Controls>
        {!autoPlay && (
          <Button onClick={handleClickRef.current} disabled={gameOver}>
            Batter Up!
          </Button>
        )}
        {gameOver && (
          <NewGameButton onClick={() => dispatch({ type: "reset" })}>New Game</NewGameButton>
        )}
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
      </Controls>
      {autoPlay && managerMode && <DecisionPanel strategy={strategy} />}
    </>
  );
};

export default GameControls;

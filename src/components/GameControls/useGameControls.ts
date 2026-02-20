import * as React from "react";

import { useLocalStorage } from "usehooks-ts";

import { ContextValue, Strategy, useGameContext } from "@context/index";
import { useAutoPlayScheduler } from "@hooks/useAutoPlayScheduler";
import { useAutoSave } from "@hooks/useAutoSave";
import { useGameAudio } from "@hooks/useGameAudio";
import { useGameRefs } from "@hooks/useGameRefs";
import { usePitchDispatch } from "@hooks/usePitchDispatch";
import { usePlayerControls } from "@hooks/usePlayerControls";
import { useReplayDecisions } from "@hooks/useReplayDecisions";
import { setAlertVolume, setAnnouncementVolume, setSpeechRate } from "@utils/announce";

import { SPEED_NORMAL } from "./constants";

/** Wires all game-controls hooks and localStorage state into a single value. */
export const useGameControls = () => {
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
    pitchKey,
    suppressNextDecision,
    pinchHitterStrategy,
    defensiveShift,
    defensiveShiftOffered,
  }: ContextValue = useGameContext();

  const [gameStarted, setGameStarted] = React.useState(false);
  const [speed, setSpeed] = useLocalStorage("speed", SPEED_NORMAL);
  const [announcementVolume, setAnnouncementVolumeState] = useLocalStorage("announcementVolume", 1);
  const [alertVolume, setAlertVolumeState] = useLocalStorage("alertVolume", 1);
  const [managerMode, setManagerMode] = useLocalStorage("managerMode", false);
  const [strategy, setStrategy] = useLocalStorage<Strategy>("strategy", "balanced");
  const [managedTeam, setManagedTeam] = useLocalStorage<0 | 1>("managedTeam", 0);
  const [currentSaveId, setCurrentSaveId] = React.useState<string | null>(null);

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
    mutedRef,
    speedRef,
    strikesRef,
    managerModeRef,
    strategyRef,
    managedTeamRef,
    gameStateRef,
    skipDecisionRef,
  } = useGameRefs({
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

  const handleBatterUp = React.useCallback(() => {
    setGameStarted(true);
  }, []);

  useAutoPlayScheduler(
    gameStarted,
    pendingDecision,
    managerMode,
    mutedRef,
    speedRef,
    handleClickRef,
    gameStateRef,
    betweenInningsPauseRef,
  );
  useReplayDecisions(dispatch, pendingDecision, pitchKey, strategy);
  useAutoSave(strategy, managedTeam);

  React.useEffect(() => {
    setAnnouncementVolume(announcementVolume);
  }, [announcementVolume]);
  React.useEffect(() => {
    setAlertVolume(alertVolume);
  }, [alertVolume]);
  React.useEffect(() => {
    setSpeechRate(speed);
  }, [speed]);

  const playerControls = usePlayerControls({
    managerMode,
    setManagerMode,
    announcementVolume,
    setAnnouncementVolumeState,
    alertVolume,
    setAlertVolumeState,
    dispatchLog,
  });

  return {
    dispatch,
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
    handleClickRef,
    currentSaveId,
    setCurrentSaveId,
    handleBatterUp,
    ...playerControls,
  };
};

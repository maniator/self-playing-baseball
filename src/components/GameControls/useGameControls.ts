import * as React from "react";

import { useLocalStorage } from "usehooks-ts";

import type { PitchingRole } from "@components/SubstitutionPanel";
import { ContextValue, Strategy, useGameContext } from "@context/index";
import { useAutoPlayScheduler } from "@hooks/useAutoPlayScheduler";
import { useCustomTeams } from "@hooks/useCustomTeams";
import { useGameAudio } from "@hooks/useGameAudio";
import { useGameRefs } from "@hooks/useGameRefs";
import { usePitchDispatch } from "@hooks/usePitchDispatch";
import { usePlayerControls } from "@hooks/usePlayerControls";
import { useReplayDecisions } from "@hooks/useReplayDecisions";
import { setAlertVolume, setAnnouncementVolume, setSpeechRate } from "@utils/announce";

import { SPEED_FAST, SPEED_NORMAL, SPEED_SLOW } from "./constants";

const VALID_STRATEGIES: Strategy[] = ["balanced", "aggressive", "patient", "contact", "power"];
const VALID_SPEEDS = [SPEED_SLOW, SPEED_NORMAL, SPEED_FAST];

/** Wires all game-controls hooks and localStorage state into a single value. */
export const useGameControls = ({
  gameStarted = false,
}: {
  gameStarted?: boolean;
} = {}) => {
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

  const [speed, setSpeed] = useLocalStorage("speed", SPEED_NORMAL);
  const [announcementVolume, setAnnouncementVolumeState] = useLocalStorage("announcementVolume", 1);
  const [alertVolume, setAlertVolumeState] = useLocalStorage("alertVolume", 1);
  const [managerMode, setManagerMode] = useLocalStorage("managerMode", false);
  const [strategy, setStrategy] = useLocalStorage<Strategy>("strategy", "balanced");
  const [managedTeam, setManagedTeam] = useLocalStorage<0 | 1>("managedTeam", 0);
  const [currentSaveId, setCurrentSaveId] = React.useState<string | null>(null);

  // Sanitize values read from localStorage — invalid entries are coerced to safe defaults
  // and immediately written back so the bad value is evicted on first render.
  const safeStrategy: Strategy = VALID_STRATEGIES.includes(strategy) ? strategy : "balanced";
  const safeManagedTeam: 0 | 1 = managedTeam === 0 || managedTeam === 1 ? managedTeam : 0;
  const safeSpeed = VALID_SPEEDS.includes(speed) ? speed : SPEED_NORMAL;
  const safeManagerMode = typeof managerMode === "boolean" ? managerMode : false;
  const safeAnnouncementVolume =
    typeof announcementVolume === "number" && announcementVolume >= 0 && announcementVolume <= 1
      ? announcementVolume
      : 1;
  const safeAlertVolume =
    typeof alertVolume === "number" && alertVolume >= 0 && alertVolume <= 1 ? alertVolume : 1;

  // Write back corrected values so localStorage self-heals on first bad render.
  React.useEffect(() => {
    if (!VALID_STRATEGIES.includes(strategy)) setStrategy("balanced");
    if (managedTeam !== 0 && managedTeam !== 1) setManagedTeam(0);
    if (!VALID_SPEEDS.includes(speed)) setSpeed(SPEED_NORMAL);
    if (typeof managerMode !== "boolean") setManagerMode(false);
    if (typeof announcementVolume !== "number" || announcementVolume < 0 || announcementVolume > 1)
      setAnnouncementVolumeState(1);
    if (typeof alertVolume !== "number" || alertVolume < 0 || alertVolume > 1)
      setAlertVolumeState(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    announcementVolume: safeAnnouncementVolume,
    speed: safeSpeed,
    strikes,
    balls,
    managerMode: safeManagerMode,
    strategy: safeStrategy,
    managedTeam: safeManagedTeam,
    gameSnapshot,
    pendingDecision,
  });

  const { teams: customTeams } = useCustomTeams();

  // Derive pitcher roles for both teams from custom team docs.
  // Used by the AI manager to respect SP/RP role restrictions when making pitching changes.
  const allTeamPitcherRoles = React.useMemo((): [
    Record<string, PitchingRole>,
    Record<string, PitchingRole>,
  ] => {
    return [0, 1].map((idx) => {
      const teamId = teams[idx as 0 | 1];
      if (!teamId || !teamId.startsWith("custom:")) return {};
      const ctId = teamId.slice("custom:".length);
      const doc = customTeams.find((t) => t.id === ctId);
      if (!doc) return {};
      const roles: Record<string, PitchingRole> = {};
      for (const p of doc.roster.pitchers) {
        if (p.pitchingRole) roles[p.id] = p.pitchingRole;
      }
      return roles;
    }) as [Record<string, PitchingRole>, Record<string, PitchingRole>];
  }, [teams, customTeams]);

  const allTeamPitcherRolesRef =
    React.useRef<[Record<string, PitchingRole>, Record<string, PitchingRole>]>(allTeamPitcherRoles);
  allTeamPitcherRolesRef.current = allTeamPitcherRoles;

  const betweenInningsPauseRef = useGameAudio(inning, atBat, gameOver, dispatchLog);
  const handleClickRef = usePitchDispatch(
    dispatch,
    gameStateRef,
    managerModeRef,
    strategyRef,
    managedTeamRef,
    skipDecisionRef,
    strikesRef,
    dispatchLog,
    allTeamPitcherRolesRef,
  );

  useAutoPlayScheduler(
    gameStarted,
    pendingDecision,
    safeManagerMode,
    gameOver,
    mutedRef,
    speedRef,
    handleClickRef,
    gameStateRef,
    betweenInningsPauseRef,
  );
  useReplayDecisions(dispatch, pendingDecision, pitchKey, safeStrategy);

  React.useEffect(() => {
    setAnnouncementVolume(safeAnnouncementVolume);
  }, [safeAnnouncementVolume]);
  React.useEffect(() => {
    setAlertVolume(safeAlertVolume);
  }, [safeAlertVolume]);
  React.useEffect(() => {
    setSpeechRate(safeSpeed);
  }, [safeSpeed]);

  const playerControls = usePlayerControls({
    setManagerMode,
    announcementVolume: safeAnnouncementVolume,
    setAnnouncementVolumeState,
    alertVolume: safeAlertVolume,
    setAlertVolumeState,
    dispatchLog,
  });

  return {
    dispatch,
    speed: safeSpeed,
    setSpeed,
    announcementVolume: safeAnnouncementVolume,
    alertVolume: safeAlertVolume,
    managerMode: safeManagerMode,
    setManagerMode,
    strategy: safeStrategy,
    setStrategy,
    managedTeam: safeManagedTeam,
    setManagedTeam,
    teams,
    gameOver,
    handleClickRef,
    currentSaveId,
    setCurrentSaveId,
    ...playerControls,
  };
};

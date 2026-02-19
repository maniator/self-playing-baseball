import * as React from "react";
import { Strategy, DecisionType, OnePitchModifier, State } from "../../Context";

export type GameStateSnapshot = Pick<
  State,
  "strikes" | "balls" | "baseLayout" | "outs" | "inning" | "score" | "atBat" | "pendingDecision" | "gameOver" | "onePitchModifier" | "teams" | "suppressNextDecision" | "pinchHitterStrategy" | "defensiveShift" | "defensiveShiftOffered"
>;

export type GameStateRef = React.MutableRefObject<GameStateSnapshot>;

/**
 * Syncs all stable refs used by the pitch dispatcher and auto-play scheduler.
 * Returns refs + skipDecisionRef (which tracks pending-decision transitions).
 */
export const useGameRefs = (
  autoPlay: boolean,
  announcementVolume: number,
  speed: number,
  strikes: number,
  managerMode: boolean,
  strategy: Strategy,
  managedTeam: 0 | 1,
  gameSnapshot: GameStateSnapshot,
  pendingDecision: DecisionType | null,
) => {
  const autoPlayRef = React.useRef(autoPlay);
  autoPlayRef.current = autoPlay;

  const mutedRef = React.useRef(announcementVolume === 0);
  mutedRef.current = announcementVolume === 0;

  const speedRef = React.useRef(speed);
  speedRef.current = speed;

  const strikesRef = React.useRef(strikes);
  strikesRef.current = strikes;

  const managerModeRef = React.useRef(managerMode);
  managerModeRef.current = managerMode;

  const strategyRef = React.useRef<Strategy>(strategy);
  strategyRef.current = strategy;

  const managedTeamRef = React.useRef<0 | 1>(managedTeam);
  managedTeamRef.current = managedTeam;

  const gameStateRef: GameStateRef = React.useRef(gameSnapshot);
  gameStateRef.current = gameSnapshot;

  const skipDecisionRef = React.useRef(false);
  const prevPendingDecision = React.useRef<DecisionType | null>(pendingDecision);
  React.useEffect(() => {
    if (prevPendingDecision.current !== null && pendingDecision === null) {
      skipDecisionRef.current = true;
    }
    prevPendingDecision.current = pendingDecision;
  }, [pendingDecision]);

  return {
    autoPlayRef,
    mutedRef,
    speedRef,
    strikesRef,
    managerModeRef,
    strategyRef,
    managedTeamRef,
    gameStateRef,
    skipDecisionRef,
  };
};

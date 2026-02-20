import * as React from "react";

import { DecisionType, State, Strategy } from "@context/index";

export type GameStateSnapshot = Pick<
  State,
  | "strikes"
  | "balls"
  | "baseLayout"
  | "outs"
  | "inning"
  | "score"
  | "atBat"
  | "pendingDecision"
  | "gameOver"
  | "onePitchModifier"
  | "teams"
  | "suppressNextDecision"
  | "pinchHitterStrategy"
  | "defensiveShift"
  | "defensiveShiftOffered"
>;

export type GameStateRef = React.MutableRefObject<GameStateSnapshot>;

export interface UseGameRefsOptions {
  autoPlay: boolean;
  announcementVolume: number;
  speed: number;
  strikes: number;
  balls: number;
  managerMode: boolean;
  strategy: Strategy;
  managedTeam: 0 | 1;
  gameSnapshot: GameStateSnapshot;
  pendingDecision: DecisionType | null;
}

/**
 * Syncs all stable refs used by the pitch dispatcher and auto-play scheduler.
 * Returns refs + skipDecisionRef (which tracks pending-decision transitions).
 */
export const useGameRefs = ({
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
}: UseGameRefsOptions) => {
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

  // Reset skip when a new batter comes to the plate (count returns to 0-0 from non-zero).
  // This allows decisions to be re-evaluated for each new at-bat.
  const prevCountRef = React.useRef({ balls, strikes });
  React.useEffect(() => {
    const prev = prevCountRef.current;
    if (balls === 0 && strikes === 0 && (prev.balls > 0 || prev.strikes > 0)) {
      skipDecisionRef.current = false;
    }
    prevCountRef.current = { balls, strikes };
  }, [balls, strikes]);

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

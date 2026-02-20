import * as React from "react";

import type { Strategy } from "@context/index";
import { useGameContext } from "@context/index";
import { writeAutoSave } from "@utils/saves";

/**
 * Writes an auto-save to localStorage after every half-inning transition
 * and when the game ends. Uses refs so the effect deps stay minimal and
 * the saved snapshot is always current.
 */
export const useAutoSave = (strategy: Strategy, managedTeam: 0 | 1): void => {
  const ctx = useGameContext();
  const { atBat, inning, gameOver } = ctx;

  // Always-current refs — updated on every render, safe to read in effects.
  const ctxRef = React.useRef(ctx);
  ctxRef.current = ctx;
  const strategyRef = React.useRef(strategy);
  strategyRef.current = strategy;
  const managedTeamRef = React.useRef<0 | 1>(managedTeam);
  managedTeamRef.current = managedTeam;

  // Stable save callback — reads from refs so needs no deps.
  const save = React.useCallback(() => {
    writeAutoSave(ctxRef.current, strategyRef.current, managedTeamRef.current);
  }, []);

  // Track half-inning transitions (atBat toggles 0↔1 each half-inning,
  // inning increments every full inning). Skip the very first render.
  const halfKey = inning * 2 + atBat;
  const prevHalfKeyRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (prevHalfKeyRef.current === null) {
      prevHalfKeyRef.current = halfKey;
      return;
    }
    if (halfKey === prevHalfKeyRef.current) return;
    prevHalfKeyRef.current = halfKey;
    save();
  }, [halfKey, save]);

  // Also save when the game ends (walk-off doesn't flip the half-inning key).
  React.useEffect(() => {
    if (!gameOver) return;
    save();
  }, [gameOver, save]);
};

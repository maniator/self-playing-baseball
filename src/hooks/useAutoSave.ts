import * as React from "react";

import type { Strategy } from "@context/index";
import { useGameContext } from "@context/index";
import { writeAutoSave } from "@utils/saves";

/**
 * Writes an auto-save to localStorage after every half-inning transition
 * and when the game ends. Uses refs so the effect deps stay minimal and
 * the saved snapshot is always current.
 */
export const useAutoSave = (strategy: Strategy, managedTeam: 0 | 1, managerMode: boolean): void => {
  const ctx = useGameContext();
  const { atBat, inning, gameOver } = ctx;

  // Always-current refs — updated on every render, safe to read in effects.
  const ctxRef = React.useRef(ctx);
  ctxRef.current = ctx;
  const strategyRef = React.useRef(strategy);
  strategyRef.current = strategy;
  const managedTeamRef = React.useRef<0 | 1>(managedTeam);
  managedTeamRef.current = managedTeam;
  const managerModeRef = React.useRef(managerMode);
  managerModeRef.current = managerMode;

  // Stable save callback — reads from refs so needs no deps.
  const save = React.useCallback(() => {
    // Strip ContextValue-only fields (dispatch, dispatchLog, log) — they are
    // not part of State and must not be serialized into the save slot.
    const { dispatch: _d, dispatchLog: _dl, log: _l, ...gameState } = ctxRef.current;
    void _d;
    void _dl;
    void _l;
    writeAutoSave(gameState, strategyRef.current, managedTeamRef.current, managerModeRef.current);
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

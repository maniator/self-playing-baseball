import * as React from "react";

import { DecisionType } from "@context/index";
import { isSpeechPending } from "@utils/announce";
import { appLog } from "@utils/logger";

import { GameStateRef } from "./useGameRefs";

/**
 * Speech-gated scheduler — runs while the game is in progress.
 * Waits for the current announcement to finish before pitching, so nothing
 * gets cut off. Adds a brief pause at half-inning transitions when muted.
 *
 * `gameOver` is included as an explicit parameter (and effect dependency) so
 * the scheduler restarts automatically when a new in-progress save is loaded
 * after a finished game — without it the timer chain would stay dead.
 *
 * With Game rendered as a proper route element, it unmounts when the user
 * navigates away from /game, so no off-route guard is needed.
 */
export const useAutoPlayScheduler = (
  gameStarted: boolean,
  pendingDecision: DecisionType | null,
  managerMode: boolean,
  gameOver: boolean,
  mutedRef: React.MutableRefObject<boolean>,
  speedRef: React.MutableRefObject<number>,
  handleClickRef: React.MutableRefObject<() => void>,
  gameStateRef: GameStateRef,
  betweenInningsPauseRef: React.MutableRefObject<boolean>,
): void => {
  React.useEffect(() => {
    if (!gameStarted) return;
    if (gameOver) return;
    if (pendingDecision && managerMode) return;

    let timerId: ReturnType<typeof setTimeout>;
    let extraWait = 0;
    let cancelled = false;
    const MAX_SPEECH_WAIT_MS = 8000;
    const SPEECH_POLL_MS = 300;

    const tick = (delay: number) => {
      timerId = setTimeout(() => {
        if (cancelled) return;
        // NOTE: We intentionally do NOT re-check gameStateRef.current.gameOver here.
        // The ref can be stale during a same-component save restore, which would
        // permanently kill the chain. The effect-level `if (gameOver) return` guard
        // (above) and the `cancelled` flag are sufficient: when the game truly ends,
        // React cleans up this effect (cancelled=true, clearTimeout) and re-runs it
        // with gameOver=true so it returns early without starting a new chain.

        if (!mutedRef.current && isSpeechPending() && extraWait < MAX_SPEECH_WAIT_MS) {
          extraWait += SPEECH_POLL_MS;
          tick(SPEECH_POLL_MS);
          return;
        }

        if (mutedRef.current && betweenInningsPauseRef.current) {
          betweenInningsPauseRef.current = false;
          extraWait = 0;
          tick(1500);
          return;
        }

        betweenInningsPauseRef.current = false;
        // Reset extraWait so the next speech-wait window starts fresh for the new pitch.
        extraWait = 0;
        try {
          handleClickRef.current();
        } catch (error) {
          // Log the error with context to aid debugging, then continue scheduling
          // so the game does not silently freeze on unhandled exceptions.
          const state = gameStateRef.current;
          appLog.error(
            `Autoplay scheduler error at inning ${state.inning}, outs ${state.outs}, ` +
              `at-bat team ${state.atBat}, pitch key ${state.pitchKey}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        tick(speedRef.current);
      }, delay);
    };

    tick(speedRef.current);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [
    gameStarted,
    pendingDecision,
    managerMode,
    gameOver,
    betweenInningsPauseRef,
    gameStateRef,
    handleClickRef,
    mutedRef,
    speedRef,
  ]);
};

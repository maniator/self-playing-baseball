import * as React from "react";

import { DecisionType } from "@context/index";
import { isSpeechPending } from "@utils/announce";

import { GameStateRef } from "./useGameRefs";

/**
 * Speech-gated scheduler — runs while the game is in progress.
 * Waits for the current announcement to finish before pitching, so nothing
 * gets cut off. Adds a brief pause at half-inning transitions when muted.
 */
export const useAutoPlayScheduler = (
  gameStarted: boolean,
  pendingDecision: DecisionType | null,
  managerMode: boolean,
  mutedRef: React.MutableRefObject<boolean>,
  speedRef: React.MutableRefObject<number>,
  handleClickRef: React.MutableRefObject<() => void>,
  gameStateRef: GameStateRef,
  betweenInningsPauseRef: React.MutableRefObject<boolean>,
): void => {
  React.useEffect(() => {
    if (!gameStarted) return;
    if (pendingDecision && managerMode) return;

    let timerId: ReturnType<typeof setTimeout>;
    let extraWait = 0;
    let cancelled = false;
    const MAX_SPEECH_WAIT_MS = 8000;
    const SPEECH_POLL_MS = 300;

    const tick = (delay: number) => {
      timerId = setTimeout(() => {
        if (cancelled) return;
        if (gameStateRef.current.gameOver) return;

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
        handleClickRef.current();
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
    betweenInningsPauseRef,
    gameStateRef,
    handleClickRef,
    mutedRef,
    speedRef,
  ]);
};

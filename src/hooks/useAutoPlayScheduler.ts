import * as React from "react";

import { DecisionType } from "@context/index";
import { isSpeechPending } from "@utils/announce";
import { appLog } from "@utils/logger";

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
export const useAutoPlayScheduler = ({
  gameStarted,
  pendingDecision,
  managerMode,
  gameOver,
  muted,
  speed,
  handlePitch,
  inning,
  atBat,
}: {
  gameStarted: boolean;
  pendingDecision: DecisionType | null;
  managerMode: boolean;
  gameOver: boolean;
  muted: boolean;
  speed: number;
  handlePitch: () => void;
  inning: number;
  atBat: 0 | 1 | null;
}): void => {
  // Track previous inning/atBat to detect half-inning transitions across effect re-runs.
  // This ref is LOCAL to this hook (not passed between hooks), so it's not cross-hook mutation.
  const prevInningRef = React.useRef(inning);
  const prevAtBatRef = React.useRef(atBat);

  React. useEffect(() => {
    if (!gameStarted) return;
    if (gameOver) return;
    if (pendingDecision && managerMode) return;

    let timerId: ReturnType<typeof setTimeout>;
    let extraWait = 0;
    let cancelled = false;
    let needsInningPause = false;
    const MAX_SPEECH_WAIT_MS = 8000;
    const SPEECH_POLL_MS = 300;
    const INNING_PAUSE_MS = 1500;

    const tick = (delay: number) => {
      timerId = setTimeout(() => {
        if (cancelled) return;
        // NOTE: We intentionally do NOT re-check gameStateRef.current.gameOver here.
        // The ref can be stale during a same-component save restore, which would
        // permanently kill the chain. The effect-level `if (gameOver) return` guard
        // (above) and the `cancelled` flag are sufficient: when the game truly ends,
        // React cleans up this effect (cancelled=true, clearTimeout) and re-runs it
        // with gameOver=true so it returns early without starting a new chain.

        if (!muted && isSpeechPending() && extraWait < MAX_SPEECH_WAIT_MS) {
          extraWait += SPEECH_POLL_MS;
          tick(SPEECH_POLL_MS);
          return;
        }

        // Detect half-inning transitions for muted pause
        // Note: We use refs to track previous values across effect re-runs.
        // The effect re-runs when inning/atBat change, but the ref persists.
        if (inning !== prevInningRef.current || atBat !== prevAtBatRef.current) {
          needsInningPause = true;
          prevInningRef.current = inning;
          prevAtBatRef.current = atBat;
        }

        if (muted && needsInningPause) {
          needsInningPause = false;
          extraWait = 0;
          tick(INNING_PAUSE_MS);
          return;
        }
        // Reset extraWait so the next speech-wait window starts fresh for the new pitch.
        extraWait = 0;
        try {
          handlePitch();
        } catch (err) {
          // An exception in the pitch handler must not silently kill the autoplay
          // chain. Log it with context and continue scheduling so the game can
          // recover or at least surface a visible error rather than freezing.
          appLog.error("[autoplay] handleClick threw — continuing scheduler:", err);
        }
        tick(speed);
      }, delay);
    };

    tick(speed);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [
    gameStarted,
    pendingDecision,
    managerMode,
    gameOver,
    handlePitch,
    muted,
    speed,
    inning,
    atBat,
  ]);
};

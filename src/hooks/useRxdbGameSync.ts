import * as React from "react";

import type { GameAction } from "@context/index";
import { SaveStore } from "@storage/saveStore";

/** Action types that represent meaningful game events (stored in the event log). */
const GAME_EVENT_TYPES = new Set([
  "hit",
  "strike",
  "foul",
  "wait",
  "steal_attempt",
  "bunt_attempt",
  "intentional_walk",
  "set_one_pitch_modifier",
  "set_pinch_hitter_strategy",
  "set_defensive_shift",
  "skip_decision",
  "set_pending_decision",
]);

/**
 * Wires the RxDB event store into the live game loop:
 * - flushes game actions to SaveStore.appendEvents() whenever pitchKey advances
 * - calls SaveStore.updateProgress() on half-inning transitions and game end
 *
 * All RxDB writes are fire-and-forget (errors are swallowed) so failures never
 * block the UI.
 */
export const useRxdbGameSync = (
  rxSaveIdRef: React.MutableRefObject<string | null>,
  actionBufferRef: React.MutableRefObject<GameAction[]>,
  pitchKey: number,
  inning: number,
  atBat: number,
  score: [number, number],
  gameOver: boolean,
): void => {
  const prevPitchKeyRef = React.useRef<number | null>(null);

  // Flush buffered actions to RxDB when pitchKey advances.
  React.useEffect(() => {
    if (prevPitchKeyRef.current === null) {
      prevPitchKeyRef.current = pitchKey;
      return;
    }
    if (pitchKey === prevPitchKeyRef.current) return;
    // Capture the pitchKey *before* the advance — events are tagged with the
    // position at which they were applied (the game moment they occurred in).
    const eventAt = prevPitchKeyRef.current;
    prevPitchKeyRef.current = pitchKey;

    const saveId = rxSaveIdRef.current;
    const pending = actionBufferRef.current.splice(0);

    if (!saveId) return;

    const events = pending
      .filter((a) => GAME_EVENT_TYPES.has(a.type))
      .map((a) => ({
        type: a.type,
        at: eventAt,
        payload: (a.payload as Record<string, unknown>) ?? {},
      }));

    if (events.length > 0) {
      SaveStore.appendEvents(saveId, events).catch(() => {});
    }
  }, [pitchKey, rxSaveIdRef, actionBufferRef]);

  // Update progress on half-inning transitions.
  const halfKey = inning * 2 + atBat;
  const prevHalfKeyRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (prevHalfKeyRef.current === null) {
      prevHalfKeyRef.current = halfKey;
      return;
    }
    if (halfKey === prevHalfKeyRef.current) return;
    prevHalfKeyRef.current = halfKey;

    const saveId = rxSaveIdRef.current;
    if (!saveId) return;

    SaveStore.updateProgress(saveId, pitchKey, {
      scoreSnapshot: { away: score[0], home: score[1] },
      inningSnapshot: { inning, atBat },
    }).catch(() => {});
  }, [halfKey, rxSaveIdRef, pitchKey, score, inning, atBat]);

  // Update progress when the game ends.
  React.useEffect(() => {
    if (!gameOver) return;
    const saveId = rxSaveIdRef.current;
    if (!saveId) return;
    SaveStore.updateProgress(saveId, pitchKey, {
      scoreSnapshot: { away: score[0], home: score[1] },
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);
};

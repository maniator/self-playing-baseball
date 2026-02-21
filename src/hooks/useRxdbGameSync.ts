import * as React from "react";

import type { GameAction } from "@context/index";
import { useGameContext } from "@context/index";
import { SaveStore } from "@storage/saveStore";
import { getRngState } from "@utils/rng";

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
 * - calls SaveStore.updateProgress() (with full stateSnapshot) on half-inning
 *   transitions and game end so saves can be restored deterministically
 *
 * All RxDB writes are fire-and-forget (errors are swallowed) so failures never
 * block the UI.
 */
export const useRxdbGameSync = (
  rxSaveIdRef: React.MutableRefObject<string | null>,
  actionBufferRef: React.MutableRefObject<GameAction[]>,
): void => {
  const { dispatch: _d, dispatchLog: _dl, log: _l, ...gameState } = useGameContext();
  void _d;
  void _dl;
  void _l;

  const { pitchKey, inning, atBat, gameOver } = gameState;

  // Always-current ref of game state — read by effects without re-creating them.
  const gameStateRef = React.useRef(gameState);
  gameStateRef.current = gameState;

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

    // Keep the buffer intact until the save ID is available (createSave may
    // still be resolving).  Actions will be flushed on the next pitchKey advance.
    if (!saveId) return;

    const pending = actionBufferRef.current.splice(0);

    const events = pending
      .filter((a) => GAME_EVENT_TYPES.has(a.type))
      .map((a) => ({
        type: a.type,
        at: eventAt,
        // Ensure payload is always an object — some action types (e.g.
        // set_one_pitch_modifier, set_pinch_hitter_strategy, set_defensive_shift)
        // dispatch string/boolean values directly.
        payload:
          a.payload !== null && typeof a.payload === "object"
            ? (a.payload as Record<string, unknown>)
            : { value: a.payload },
      }));

    if (events.length > 0) {
      SaveStore.appendEvents(saveId, events).catch(() => {});
    }
  }, [pitchKey, rxSaveIdRef, actionBufferRef]);

  // Update progress on half-inning transitions — store a full stateSnapshot
  // so the save can be resumed without replaying all events.
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

    const state = gameStateRef.current;
    SaveStore.updateProgress(saveId, state.pitchKey, {
      scoreSnapshot: { away: state.score[0], home: state.score[1] },
      inningSnapshot: { inning: state.inning, atBat: state.atBat },
      stateSnapshot: {
        state: state,
        rngState: getRngState(),
      },
    }).catch(() => {});
  }, [halfKey, rxSaveIdRef]);

  // Update progress when the game ends.
  React.useEffect(() => {
    if (!gameOver) return;
    const saveId = rxSaveIdRef.current;
    if (!saveId) return;
    const state = gameStateRef.current;
    SaveStore.updateProgress(saveId, state.pitchKey, {
      scoreSnapshot: { away: state.score[0], home: state.score[1] },
      stateSnapshot: {
        state: state,
        rngState: getRngState(),
      },
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);
};

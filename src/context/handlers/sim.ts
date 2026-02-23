import { Hit } from "@constants/hitTypes";
import type { PitchType } from "@constants/pitchTypes";
import { pitchName } from "@constants/pitchTypes";

import { checkWalkoff } from "../gameOver";
import { hitBall } from "../hitBall";
import type { GameAction, State, Strategy } from "../index";
import { buntAttempt, playerStrike, playerWait, stealAttempt } from "../playerActions";
import { withDecisionLog, withStrikeoutLog } from "../reducerHelpers";

/** Reducer context passed into simulation handlers. */
export interface SimCtx {
  log: (msg: string) => void;
}

/** Sim action types handled by this module. */
const SIM_ACTIONS = new Set([
  "hit",
  "strike",
  "foul",
  "wait",
  "steal_attempt",
  "bunt_attempt",
  "intentional_walk",
]);

/**
 * Handles simulation (on-field) actions.
 * Returns `undefined` for any action type that is not a sim action,
 * allowing the root reducer to fall through to its own branches.
 */
export const handleSimAction = (
  state: State,
  action: GameAction,
  ctx: SimCtx,
): State | undefined => {
  if (!SIM_ACTIONS.has(action.type)) return undefined;
  const { log } = ctx;

  switch (action.type) {
    case "hit": {
      const p = action.payload as { hitType?: Hit; strategy?: Strategy };
      const strategy: Strategy = p?.strategy ?? "balanced";
      const hitType: Hit = p?.hitType ?? (action.payload as Hit);
      return checkWalkoff(hitBall(hitType, state, log, strategy), log);
    }
    case "strike": {
      const sp = action.payload as { swung?: boolean; pitchType?: PitchType };
      const result = playerStrike(state, log, sp?.swung ?? false, false, sp?.pitchType);
      return withStrikeoutLog(state, result);
    }
    case "foul": {
      const fp = action.payload as { pitchType?: PitchType };
      const pt = fp?.pitchType;
      if (state.strikes < 2) return playerStrike(state, log, true, true, pt);
      const msg = pt ? `${pitchName(pt)} — foul ball — count stays.` : "Foul ball — count stays.";
      log(msg);
      return {
        ...state,
        pendingDecision: null,
        hitType: undefined,
        pitchKey: (state.pitchKey ?? 0) + 1,
      };
    }
    case "wait": {
      const wp = action.payload as { strategy?: Strategy; pitchType?: PitchType };
      const result = playerWait(
        state,
        log,
        wp?.strategy ?? "balanced",
        state.onePitchModifier,
        wp?.pitchType,
      );
      return withStrikeoutLog(state, result);
    }
    case "steal_attempt": {
      const { successPct, base } = action.payload as { successPct: number; base: 0 | 1 };
      const result = stealAttempt(state, log, successPct, base);
      return withDecisionLog(state, result, `${state.pitchKey}:steal:${base}:${successPct}`);
    }
    case "bunt_attempt": {
      const bp = action.payload as { strategy?: Strategy };
      const result = checkWalkoff(buntAttempt(state, log, bp?.strategy ?? "balanced"), log);
      return withDecisionLog(state, result, `${state.pitchKey}:bunt`);
    }
    case "intentional_walk": {
      log("Intentional walk issued.");
      const result = checkWalkoff(
        hitBall(Hit.Walk, { ...state, pendingDecision: null, suppressNextDecision: true }, log),
        log,
      );
      return withDecisionLog(state, result, `${state.pitchKey}:ibb`);
    }
    default:
      return undefined;
  }
};

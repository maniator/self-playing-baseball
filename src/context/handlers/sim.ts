import { Hit } from "@constants/hitTypes";
import type { PitchType } from "@constants/pitchTypes";
import { pitchName } from "@constants/pitchTypes";

import { checkWalkoff } from "../gameOver";
import { hitBall } from "../hitBall";
import type { GameAction, State, Strategy } from "../index";
import { buntAttempt, playerStrike, playerWait, stealAttempt } from "../playerActions";
import type { ReducerCtx } from "../reducerHelpers";
import { withDecisionLog, withStrikeoutLog } from "../reducerHelpers";

/**
 * Handles simulation (on-field) actions.
 * Returns `undefined` for any action type that is not a sim action,
 * allowing the root reducer to fall through to its own branches.
 * The `default` branch is the sole sentinel — no separate membership set needed.
 */
export const handleSimAction = (
  state: State,
  action: GameAction,
  ctx: ReducerCtx,
): State | undefined => {
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
      // checkWalkoff is required here: a 4th ball (walk) can score the game-winning run
      // in the bottom of the 9th or later (e.g. bases-loaded walk in extra innings).
      // Without it, tie games would continue past the walkoff pitch instead of ending immediately.
      return checkWalkoff(withStrikeoutLog(state, result), log);
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
      const fieldingTeam = state.teams[(1 - (state.atBat as number)) as 0 | 1];
      log(`${fieldingTeam} manager issues an intentional walk.`);
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

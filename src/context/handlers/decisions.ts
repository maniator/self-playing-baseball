import type { DecisionType, GameAction, OnePitchModifier, State, Strategy } from "../index";
import { withDecisionLog } from "../reducerHelpers";

/** Reducer context passed into decision handlers. */
export interface DecisionsCtx {
  log: (msg: string) => void;
}

/**
 * Handles manager/UI decision state actions.
 * Returns `undefined` for any action type that is not a decision action,
 * allowing the root reducer to fall through to its own branches.
 */
export const handleDecisionsAction = (
  state: State,
  action: GameAction,
  ctx: DecisionsCtx,
): State | undefined => {
  const { log } = ctx;

  switch (action.type) {
    case "set_one_pitch_modifier": {
      const result = {
        ...state,
        onePitchModifier: action.payload as OnePitchModifier,
        pendingDecision: null,
      };
      return withDecisionLog(state, result, `${state.pitchKey}:${action.payload}`);
    }
    case "skip_decision": {
      const result = { ...state, pendingDecision: null };
      return withDecisionLog(state, result, `${state.pitchKey}:skip`);
    }
    case "set_pending_decision": {
      const newState: State = { ...state, pendingDecision: action.payload as DecisionType };
      if ((action.payload as DecisionType).kind === "defensive_shift") {
        newState.defensiveShiftOffered = true;
      }
      return newState;
    }
    case "clear_suppress_decision":
      return { ...state, suppressNextDecision: false };
    case "set_pinch_hitter_strategy": {
      const ph = action.payload as Strategy;
      log(`Pinch hitter in — playing ${ph} strategy.`);
      const result = { ...state, pinchHitterStrategy: ph, pendingDecision: null };
      return withDecisionLog(state, result, `${state.pitchKey}:pinch:${ph}`);
    }
    case "set_defensive_shift": {
      const shiftOn = action.payload as boolean;
      if (shiftOn) log("Defensive shift deployed — outfield repositioned.");
      else log("Normal alignment set.");
      const result = { ...state, defensiveShift: shiftOn, pendingDecision: null };
      return withDecisionLog(state, result, `${state.pitchKey}:shift:${shiftOn ? "on" : "off"}`);
    }
    default:
      return undefined;
  }
};

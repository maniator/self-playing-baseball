import type { DecisionType, GameAction, OnePitchModifier, State, Strategy } from "../index";
import type { ReducerCtx } from "../reducerHelpers";
import { withDecisionLog } from "../reducerHelpers";

/**
 * Handles manager/UI decision state actions.
 * Returns `undefined` for any action type that is not a decision action,
 * allowing the root reducer to fall through to its own branches.
 */
export const handleDecisionsAction = (
  state: State,
  action: GameAction,
  ctx: ReducerCtx,
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
    case "make_substitution": {
      const p = action.payload as {
        teamIdx: 0 | 1;
        kind: "batter" | "pitcher";
        lineupIdx?: number;
        benchPlayerId?: string;
        pitcherIdx?: number;
      };
      const { teamIdx, kind } = p;
      const getPlayerName = (id: string): string =>
        state.playerOverrides[teamIdx][id]?.nickname ?? id.slice(0, 8);

      if (kind === "batter") {
        const { lineupIdx, benchPlayerId } = p;
        if (
          lineupIdx === undefined ||
          !benchPlayerId ||
          lineupIdx < 0 ||
          lineupIdx >= state.lineupOrder[teamIdx].length ||
          !state.rosterBench[teamIdx].includes(benchPlayerId)
        ) {
          return state;
        }
        const oldPlayerId = state.lineupOrder[teamIdx][lineupIdx];
        const newLineup = [...state.lineupOrder[teamIdx]];
        newLineup[lineupIdx] = benchPlayerId;
        const newBench = state.rosterBench[teamIdx].filter((id) => id !== benchPlayerId);
        newBench.push(oldPlayerId);
        const newLineupOrder: [string[], string[]] = [
          teamIdx === 0 ? newLineup : state.lineupOrder[0],
          teamIdx === 1 ? newLineup : state.lineupOrder[1],
        ];
        const newRosterBench: [string[], string[]] = [
          teamIdx === 0 ? newBench : state.rosterBench[0],
          teamIdx === 1 ? newBench : state.rosterBench[1],
        ];
        log(`Substitution: ${getPlayerName(benchPlayerId)} in for ${getPlayerName(oldPlayerId)}.`);
        return { ...state, lineupOrder: newLineupOrder, rosterBench: newRosterBench };
      }

      if (kind === "pitcher") {
        const { pitcherIdx } = p;
        if (
          pitcherIdx === undefined ||
          pitcherIdx < 0 ||
          pitcherIdx >= state.rosterPitchers[teamIdx].length ||
          pitcherIdx === state.activePitcherIdx[teamIdx]
        ) {
          return state;
        }
        const newActivePitcherIdx: [number, number] = [
          teamIdx === 0 ? pitcherIdx : state.activePitcherIdx[0],
          teamIdx === 1 ? pitcherIdx : state.activePitcherIdx[1],
        ];
        const newPitcherId = state.rosterPitchers[teamIdx][pitcherIdx];
        log(`Pitching change: ${getPlayerName(newPitcherId)} now pitching.`);
        return { ...state, activePitcherIdx: newActivePitcherIdx };
      }

      return state;
    }
    default:
      return undefined;
  }
};

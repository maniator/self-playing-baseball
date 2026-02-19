import { Hit } from "../constants/hitTypes";
import { State, Strategy, DecisionType } from "./index";
import { hitBall } from "./hitBall";
import { playerStrike, playerWait, stealAttempt, buntAttempt } from "./playerActions";
import { checkWalkoff } from "./gameOver";
import { stratMod } from "./strategy";
import { pitchName } from "../constants/pitchTypes";
import type { PitchType } from "../constants/pitchTypes";

// Re-export stratMod so existing consumers (e.g. tests) can import from this module.
export { stratMod } from "./strategy";

const createLogger = (dispatchLogger) => (message) => {
  dispatchLogger({ type: "log", payload: message });
};

const computeStealSuccessPct = (base: 0 | 1, strategy: Strategy): number => {
  const base_pct = base === 0 ? 70 : 60;
  return Math.round(base_pct * stratMod(strategy, "steal"));
};

// Minimum steal success probability required to offer the steal decision (>72 means 73%+).
const STEAL_MIN_PCT = 72;

export const detectDecision = (state: State, strategy: Strategy, managerMode: boolean): DecisionType | null => {
  if (!managerMode) return null;
  if (state.gameOver) return null;

  const { baseLayout, outs, balls, strikes } = state;
  const scoreDiff = Math.abs(state.score[0] - state.score[1]);

  const ibbAvailable = !baseLayout[0] && (baseLayout[1] || baseLayout[2]) && outs === 2 && state.inning >= 7 && scoreDiff <= 2;

  let stealDecision: { kind: "steal"; base: 0 | 1; successPct: number } | null = null;
  if (outs < 2) {
    if (baseLayout[0] && !baseLayout[1]) {
      const pct = computeStealSuccessPct(0, strategy);
      if (pct > STEAL_MIN_PCT) stealDecision = { kind: "steal", base: 0, successPct: pct };
    }
    if (!stealDecision && baseLayout[1] && !baseLayout[2]) {
      const pct = computeStealSuccessPct(1, strategy);
      if (pct > STEAL_MIN_PCT) stealDecision = { kind: "steal", base: 1, successPct: pct };
    }
  }

  if (ibbAvailable && stealDecision) {
    return { kind: "ibb_or_steal", base: stealDecision.base, successPct: stealDecision.successPct };
  }
  if (ibbAvailable) return { kind: "ibb" };
  if (stealDecision) return stealDecision;

  if (outs < 2 && (baseLayout[0] || baseLayout[1])) return { kind: "bunt" };
  if (balls === 3 && strikes === 0) return { kind: "count30" };
  if (balls === 0 && strikes === 2) return { kind: "count02" };
  return null;
};

const reducer = (dispatchLogger) => {
  const log = createLogger(dispatchLogger);

  return function reducer(state: State, action: { type: string, payload: any }): State {
    if (state.gameOver && !['setTeams', 'nextInning', 'reset'].includes(action.type)) {
      return state;
    }

    switch (action.type) {
      case 'nextInning':
        return { ...state, inning: state.inning + 1 };
      case 'hit': {
        const strategy: Strategy = action.payload?.strategy ?? "balanced";
        const hitType: Hit = action.payload?.hitType ?? action.payload;
        return checkWalkoff(hitBall(hitType, state, log, strategy), log);
      }
      case 'setTeams':
        return { ...state, teams: action.payload };
      case 'strike':
        return playerStrike(state, log, action.payload?.swung ?? false, false, action.payload?.pitchType as PitchType | undefined);
      case 'foul': {
        const pt = action.payload?.pitchType as PitchType | undefined;
        if (state.strikes < 2) return playerStrike(state, log, true, true, pt);
        const msg = pt ? `${pitchName(pt)} — foul ball — count stays.` : "Foul ball — count stays.";
        log(msg);
        return { ...state, pendingDecision: null, hitType: undefined, pitchKey: (state.pitchKey ?? 0) + 1 };
      }
      case 'wait':
        return playerWait(state, log, action.payload?.strategy ?? "balanced", state.onePitchModifier, action.payload?.pitchType as PitchType | undefined);
      case 'set_one_pitch_modifier':
        return { ...state, onePitchModifier: action.payload, pendingDecision: null };
      case 'steal_attempt': {
        const { successPct, base } = action.payload;
        return stealAttempt(state, log, successPct, base);
      }
      case 'bunt_attempt':
        return checkWalkoff(buntAttempt(state, log, action.payload?.strategy ?? "balanced"), log);
      case 'intentional_walk': {
        log("Intentional walk issued.");
        return checkWalkoff(hitBall(Hit.Walk, { ...state, pendingDecision: null }, log), log);
      }
      case 'reset':
        return {
          inning: 1, score: [0, 0] as [number, number], teams: state.teams,
          baseLayout: [0, 0, 0] as [number, number, number],
          outs: 0, strikes: 0, balls: 0, atBat: 0, hitType: undefined,
          gameOver: false, pendingDecision: null, onePitchModifier: null,
          pitchKey: 0, decisionLog: [],
        };
      case 'skip_decision':
        return { ...state, pendingDecision: null };
      case 'set_pending_decision':
        return { ...state, pendingDecision: action.payload as DecisionType };
      default:
        throw new Error(`No such reducer type as ${action.type}`);
    }
  };
};

export default reducer;

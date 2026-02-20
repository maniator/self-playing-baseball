import { Hit } from "@constants/hitTypes";
import type { PitchType } from "@constants/pitchTypes";
import { pitchName } from "@constants/pitchTypes";

import { checkWalkoff } from "./gameOver";
import { hitBall } from "./hitBall";
import {
  DecisionType,
  GameAction,
  LogAction,
  OnePitchModifier,
  State,
  Strategy,
  TeamCustomPlayerOverrides,
} from "./index";
import { buntAttempt, playerStrike, playerWait, stealAttempt } from "./playerActions";
import { stratMod } from "./strategy";

// Re-export stratMod so existing consumers (e.g. tests) can import from this module.
export { stratMod } from "./strategy";

const createLogger = (dispatchLogger: (action: LogAction) => void) => (message: string) => {
  dispatchLogger({ type: "log", payload: message });
};

const computeStealSuccessPct = (base: 0 | 1, strategy: Strategy): number => {
  const base_pct = base === 0 ? 70 : 60;
  return Math.round(base_pct * stratMod(strategy, "steal"));
};

// Minimum steal success probability required to offer the steal decision (>72 means 73%+).
const STEAL_MIN_PCT = 72;

export const detectDecision = (
  state: State,
  strategy: Strategy,
  managerMode: boolean,
): DecisionType | null => {
  if (!managerMode) return null;
  if (state.gameOver) return null;
  if (state.suppressNextDecision) return null;

  const { baseLayout, outs, balls, strikes } = state;
  const scoreDiff = Math.abs(state.score[0] - state.score[1]);

  const ibbAvailable =
    !baseLayout[0] &&
    (baseLayout[1] || baseLayout[2]) &&
    outs === 2 &&
    state.inning >= 7 &&
    scoreDiff <= 2;

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

  // pinch_hitter is checked before bunt: it's a start-of-at-bat decision (0-0 count only)
  // and runners on 2nd/3rd would otherwise always hit the bunt branch first.
  if (
    state.inning >= 7 &&
    outs < 2 &&
    (baseLayout[1] || baseLayout[2]) &&
    !state.pinchHitterStrategy &&
    balls === 0 &&
    strikes === 0
  ) {
    return { kind: "pinch_hitter" };
  }

  if (outs < 2 && (baseLayout[0] || baseLayout[1])) return { kind: "bunt" };

  if (balls === 3 && strikes === 0) return { kind: "count30" };
  if (balls === 0 && strikes === 2) return { kind: "count02" };
  return null;
};

const reducer = (dispatchLogger: (action: LogAction) => void) => {
  const log = createLogger(dispatchLogger);

  return function reducer(state: State, action: GameAction): State {
    if (
      state.gameOver &&
      !["setTeams", "nextInning", "reset", "restore_game"].includes(action.type)
    ) {
      return state;
    }

    switch (action.type) {
      case "nextInning":
        return { ...state, inning: state.inning + 1 };
      case "hit": {
        const p = action.payload as { hitType?: Hit; strategy?: Strategy };
        const strategy: Strategy = p?.strategy ?? "balanced";
        const hitType: Hit = p?.hitType ?? (action.payload as Hit);
        return checkWalkoff(hitBall(hitType, state, log, strategy), log);
      }
      case "setTeams": {
        const p = action.payload as
          | [string, string]
          | {
              teams: [string, string];
              playerOverrides?: [TeamCustomPlayerOverrides, TeamCustomPlayerOverrides];
            };
        if (Array.isArray(p)) {
          return { ...state, teams: p };
        }
        return {
          ...state,
          teams: p.teams,
          ...(p.playerOverrides ? { playerOverrides: p.playerOverrides } : {}),
        };
      }
      case "strike": {
        const sp = action.payload as { swung?: boolean; pitchType?: PitchType };
        return playerStrike(state, log, sp?.swung ?? false, false, sp?.pitchType);
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
        return playerWait(
          state,
          log,
          wp?.strategy ?? "balanced",
          state.onePitchModifier,
          wp?.pitchType,
        );
      }
      case "set_one_pitch_modifier": {
        const result = {
          ...state,
          onePitchModifier: action.payload as OnePitchModifier,
          pendingDecision: null,
        };
        if (state.pendingDecision) {
          return {
            ...result,
            decisionLog: [...state.decisionLog, `${state.pitchKey}:${action.payload}`],
          };
        }
        return result;
      }
      case "steal_attempt": {
        const { successPct, base } = action.payload as { successPct: number; base: 0 | 1 };
        const result = stealAttempt(state, log, successPct, base);
        if (state.pendingDecision) {
          return {
            ...result,
            decisionLog: [...state.decisionLog, `${state.pitchKey}:steal:${base}:${successPct}`],
          };
        }
        return result;
      }
      case "bunt_attempt": {
        const bp = action.payload as { strategy?: Strategy };
        const result = checkWalkoff(buntAttempt(state, log, bp?.strategy ?? "balanced"), log);
        if (state.pendingDecision) {
          return { ...result, decisionLog: [...state.decisionLog, `${state.pitchKey}:bunt`] };
        }
        return result;
      }
      case "intentional_walk": {
        log("Intentional walk issued.");
        const result = checkWalkoff(
          hitBall(Hit.Walk, { ...state, pendingDecision: null, suppressNextDecision: true }, log),
          log,
        );
        if (state.pendingDecision) {
          return { ...result, decisionLog: [...state.decisionLog, `${state.pitchKey}:ibb`] };
        }
        return result;
      }
      case "reset":
        return {
          inning: 1,
          score: [0, 0] as [number, number],
          teams: state.teams,
          baseLayout: [0, 0, 0] as [number, number, number],
          outs: 0,
          strikes: 0,
          balls: 0,
          atBat: 0,
          hitType: undefined,
          gameOver: false,
          pendingDecision: null,
          onePitchModifier: null,
          pitchKey: 0,
          decisionLog: [],
          suppressNextDecision: false,
          pinchHitterStrategy: null,
          defensiveShift: false,
          defensiveShiftOffered: false,
          batterIndex: [0, 0] as [number, number],
          inningRuns: [[], []] as [number[], number[]],
          playLog: [],
          playerOverrides: [{}, {}] as [TeamCustomPlayerOverrides, TeamCustomPlayerOverrides],
        };
      case "skip_decision": {
        const entry = state.pendingDecision ? `${state.pitchKey}:skip` : null;
        const decisionLog = entry ? [...state.decisionLog, entry] : state.decisionLog;
        return { ...state, pendingDecision: null, decisionLog };
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
        const entry = state.pendingDecision ? `${state.pitchKey}:pinch:${ph}` : null;
        const decisionLog = entry ? [...state.decisionLog, entry] : state.decisionLog;
        return { ...state, pinchHitterStrategy: ph, pendingDecision: null, decisionLog };
      }
      case "set_defensive_shift": {
        const shiftOn = action.payload as boolean;
        if (shiftOn) log("Defensive shift deployed — outfield repositioned.");
        else log("Normal alignment set.");
        const entry = state.pendingDecision
          ? `${state.pitchKey}:shift:${shiftOn ? "on" : "off"}`
          : null;
        const decisionLog = entry ? [...state.decisionLog, entry] : state.decisionLog;
        return { ...state, defensiveShift: shiftOn, pendingDecision: null, decisionLog };
      }
      case "restore_game": {
        const restored = action.payload as State;
        return {
          ...restored,
          playerOverrides: restored.playerOverrides ?? [{}, {}],
        };
      }
      default:
        throw new Error(`No such reducer type as ${action.type}`);
    }
  };
};

export default reducer;

import { handleDecisionsAction } from "./handlers/decisions";
import { handleLifecycleAction } from "./handlers/lifecycle";
import { handleSetupAction } from "./handlers/setup";
import { handleSimAction } from "./handlers/sim";
import type { DecisionType, GameAction, LogAction, State, Strategy } from "./index";
import { warnIfImpossible } from "./invariants";
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

  function apply(state: State, action: GameAction): State {
    if (
      state.gameOver &&
      !["setTeams", "nextInning", "reset", "restore_game"].includes(action.type)
    ) {
      return state;
    }

    const simResult = handleSimAction(state, action, { log });
    if (simResult !== undefined) return simResult;

    const lifecycleResult = handleLifecycleAction(state, action);
    if (lifecycleResult !== undefined) return lifecycleResult;

    const decisionsResult = handleDecisionsAction(state, action, { log });
    if (decisionsResult !== undefined) return decisionsResult;

    const setupResult = handleSetupAction(state, action);
    if (setupResult !== undefined) return setupResult;

    throw new Error(`No such reducer type as ${action.type}`);
  }

  return function reducer(state: State, action: GameAction): State {
    const next = apply(state, action);
    if (import.meta.env.DEV) warnIfImpossible(next, { pitchKey: next.pitchKey ?? 0 });
    return next;
  };
};

export default reducer;

import * as React from "react";

import { DecisionType, GameAction, Strategy } from "@context/index";
import { getDecisionsFromUrl } from "@utils/rng";

/**
 * Parses a serialized decision entry (produced by the reducer's decisionLog)
 * and dispatches the matching action.
 *
 * Entry format:  "<pitchKey>:<action>[:<args…>]"
 *   steal:<base>:<successPct>  → steal_attempt
 *   bunt                       → bunt_attempt
 *   ibb                        → intentional_walk
 *   take/swing/protect/normal  → set_one_pitch_modifier
 *   pinch:<strategy>           → set_pinch_hitter_strategy
 *   shift:<on|off>             → set_defensive_shift
 *   skip                       → skip_decision
 */
const VALID_STRATEGIES = new Set<string>(["balanced", "aggressive", "patient", "contact", "power"]);

function applyEntry(
  entry: string,
  dispatch: (action: GameAction) => void,
  strategy: Strategy,
): void {
  const parts = entry.split(":");
  const action = parts[1];
  switch (action) {
    case "steal":
      dispatch({
        type: "steal_attempt",
        payload: { base: Number(parts[2]) as 0 | 1, successPct: Number(parts[3]) },
      });
      break;
    case "bunt":
      dispatch({ type: "bunt_attempt", payload: { strategy } });
      break;
    case "ibb":
      dispatch({ type: "intentional_walk" });
      break;
    case "take":
    case "swing":
    case "protect":
    case "normal":
      dispatch({ type: "set_one_pitch_modifier", payload: action });
      break;
    case "pinch": {
      const ph = parts[2];
      if (parts.length >= 3 && VALID_STRATEGIES.has(ph)) {
        dispatch({ type: "set_pinch_hitter_strategy", payload: ph as Strategy });
      }
      break;
    }
    case "shift": {
      if (parts.length >= 3 && (parts[2] === "on" || parts[2] === "off")) {
        dispatch({ type: "set_defensive_shift", payload: parts[2] === "on" });
      }
      break;
    }
    case "skip":
      dispatch({ type: "skip_decision" });
      break;
    default:
      break;
  }
}

/**
 * Reads `?decisions=` from the URL once on mount and, whenever a
 * pendingDecision fires at a matching pitchKey, dispatches the recorded
 * action automatically — reproducing a full managed-game replay.
 */
export const useReplayDecisions = (
  dispatch: (action: GameAction) => void,
  pendingDecision: DecisionType | null,
  pitchKey: number,
  strategy: Strategy,
): void => {
  const entries = React.useRef<string[] | null>(null);
  if (entries.current === null) entries.current = getDecisionsFromUrl();
  const indexRef = React.useRef(0);

  React.useEffect(() => {
    if (!pendingDecision) return;
    if (!entries.current) return;
    // Skip any stale entries whose pitchKey is behind the current one.
    while (
      indexRef.current < entries.current.length &&
      Number(entries.current[indexRef.current].split(":")[0]) < pitchKey
    ) {
      indexRef.current += 1;
    }
    if (indexRef.current >= entries.current.length) return;
    const entry = entries.current[indexRef.current];
    if (Number(entry.split(":")[0]) === pitchKey) {
      indexRef.current += 1;
      applyEntry(entry, dispatch, strategy);
    }
  }, [pendingDecision, pitchKey, strategy, dispatch]);
};

import * as React from "react";
import { getDecisionsFromUrl } from "../../utilities/rng";
import { DecisionType, Strategy } from "../../Context";

/**
 * Parses a serialized decision entry (produced by the reducer's decisionLog)
 * and dispatches the matching action.
 *
 * Entry format:  "<pitchKey>:<action>[:<args…>]"
 *   steal:<base>:<successPct>  → steal_attempt
 *   bunt                       → bunt_attempt
 *   ibb                        → intentional_walk
 *   take/swing/protect/normal  → set_one_pitch_modifier
 *   skip                       → skip_decision
 */
function applyEntry(entry: string, dispatch: Function, strategy: Strategy): void {
  const parts = entry.split(":");
  const action = parts[1];
  switch (action) {
    case "steal":
      dispatch({ type: "steal_attempt", payload: { base: Number(parts[2]) as 0 | 1, successPct: Number(parts[3]) } });
      break;
    case "bunt":
      dispatch({ type: "bunt_attempt", payload: { strategy } });
      break;
    case "ibb":
      dispatch({ type: "intentional_walk" });
      break;
    case "take": case "swing": case "protect": case "normal":
      dispatch({ type: "set_one_pitch_modifier", payload: action });
      break;
    case "skip":
      dispatch({ type: "skip_decision" });
      break;
    default: break;
  }
}

/**
 * Reads `?decisions=` from the URL once on mount and, whenever a
 * pendingDecision fires at a matching pitchKey, dispatches the recorded
 * action automatically — reproducing a full managed-game replay.
 */
export const useReplayDecisions = (
  dispatch: Function,
  pendingDecision: DecisionType | null,
  pitchKey: number,
  strategy: Strategy,
): void => {
  const entries = React.useRef<string[]>(null as any);
  if (entries.current === null) entries.current = getDecisionsFromUrl();
  const indexRef = React.useRef(0);

  React.useEffect(() => {
    if (!pendingDecision) return;
    if (indexRef.current >= entries.current.length) return;
    const entry = entries.current[indexRef.current];
    if (Number(entry.split(":")[0]) === pitchKey) {
      indexRef.current += 1;
      applyEntry(entry, dispatch, strategy);
    }
  }, [pendingDecision, pitchKey]);
};

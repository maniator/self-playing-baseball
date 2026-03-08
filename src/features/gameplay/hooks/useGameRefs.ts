import * as React from "react";

import { DecisionType } from "@context/index";

export interface UseGameRefsOptions {
  strikes: number;
  balls: number;
  pendingDecision: DecisionType | null;
}

/**
 * Tracks whether to skip decision re-evaluation after a decision resolves.
 * Returns a boolean value (not a ref) for proper React data flow.
 */
export const useGameRefs = ({
  strikes,
  balls,
  pendingDecision,
}: UseGameRefsOptions): { skipDecision: boolean } => {
  // Track decision transitions - skip re-evaluation immediately after a decision resolves
  const [skipDecision, setSkipDecision] = React.useState(false);
  const prevPendingDecision = React.useRef<DecisionType | null>(pendingDecision);

  React.useEffect(() => {
    if (prevPendingDecision.current !== null && pendingDecision === null) {
      setSkipDecision(true);
    }
    prevPendingDecision.current = pendingDecision;
  }, [pendingDecision]);

  // Reset skip when a new batter comes to the plate (count returns to 0-0 from non-zero).
  // This allows decisions to be re-evaluated for each new at-bat.
  const prevCountRef = React.useRef({ balls, strikes });
  React.useEffect(() => {
    const prev = prevCountRef.current;
    if (balls === 0 && strikes === 0 && (prev.balls > 0 || prev.strikes > 0)) {
      setSkipDecision(false);
    }
    prevCountRef.current = { balls, strikes };
  }, [balls, strikes]);

  return { skipDecision };
};

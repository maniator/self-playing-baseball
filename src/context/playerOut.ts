import { checkGameOver, nextHalfInning } from "./gameOver";
import type { State, Strategy, StrikeoutEntry } from "./index";

/** Rotate the batting-order position (0–8 cycling) for the team currently at bat. */
export const nextBatter = (state: State): State => {
  const newBatterIndex: [number, number] = [state.batterIndex[0], state.batterIndex[1]];
  newBatterIndex[state.atBat as 0 | 1] = (newBatterIndex[state.atBat as 0 | 1] + 1) % 9;
  return { ...state, batterIndex: newBatterIndex };
};

/**
 * Record an out and handle half-inning transitions.
 *
 * batterCompleted: true  → the *batter's* at-bat is over (strikeout, pop-out, bunt out).
 *                          Rotates the batting order to the next batter.
 * batterCompleted: false → a *runner* was put out (caught stealing).
 *                          The same batter remains at the plate; order does NOT rotate.
 */
export const playerOut = (state: State, log, batterCompleted = false): State => {
  // Record this batter's completed plate appearance in outLog (covers K, pop-outs, groundouts, FC, bunts).
  const outEntry: StrikeoutEntry | null = batterCompleted
    ? { team: state.atBat as 0 | 1, batterNum: state.batterIndex[state.atBat as 0 | 1] + 1 }
    : null;
  const stateWithOut = outEntry ? { ...state, outLog: [...state.outLog, outEntry] } : state;
  const stateAfterBatter = batterCompleted ? nextBatter(stateWithOut) : stateWithOut;
  const newOuts = stateAfterBatter.outs + 1;
  if (newOuts === 3) {
    const afterHalf = nextHalfInning(stateAfterBatter, log);
    if (afterHalf.gameOver) return afterHalf;
    if (stateAfterBatter.atBat === 1 && stateAfterBatter.inning >= 9) {
      const maybe = checkGameOver(afterHalf, log);
      if (maybe.gameOver) return maybe;
    }
    return afterHalf;
  }
  log(newOuts === 1 ? "One out." : "Two outs.");
  // Only clear per-batter state when the batter's at-bat is actually over.
  // When batterCompleted=false (caught stealing), the same batter stays at the
  // plate, so pinchHitterStrategy must persist for that at-bat.
  // defensiveShift and defensiveShiftOffered persist for the whole half-inning
  // and are reset in nextHalfInning.
  return {
    ...stateAfterBatter,
    strikes: 0,
    balls: 0,
    outs: newOuts,
    pendingDecision: null,
    onePitchModifier: null,
    hitType: undefined,
    ...(batterCompleted
      ? {
          pinchHitterStrategy: null as Strategy | null,
        }
      : {}),
  };
};

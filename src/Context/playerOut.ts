import { State, DecisionType, OnePitchModifier, Strategy } from "./index";
import { nextHalfInning, checkGameOver } from "./gameOver";

export const playerOut = (state: State, log): State => {
  const newOuts = state.outs + 1;
  if (newOuts === 3) {
    const afterHalf = nextHalfInning(state, log);
    if (afterHalf.gameOver) return afterHalf;
    if (state.atBat === 1 && state.inning >= 9) {
      const maybe = checkGameOver(afterHalf, log);
      if (maybe.gameOver) return maybe;
    }
    return afterHalf;
  }
  log(newOuts === 1 ? "One out." : "Two outs.");
  return {
    ...state,
    strikes: 0, balls: 0, outs: newOuts,
    pendingDecision: null, onePitchModifier: null,
    hitType: undefined,
    pinchHitterStrategy: null as Strategy | null,
    defensiveShift: false,
    defensiveShiftOffered: false,
  };
};

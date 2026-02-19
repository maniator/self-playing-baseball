import { State, DecisionType, OnePitchModifier } from "./index";

export const checkGameOver = (state: State, log): State => {
  if (state.inning >= 9) {
    const [away, home] = state.score;
    if (away !== home) {
      const winner = away > home ? state.teams[0] : state.teams[1];
      log(`That's the ball game! ${winner} win!`);
      return { ...state, gameOver: true };
    }
  }
  return state;
};

export const nextHalfInning = (state: State, log): State => {
  const newState = {
    ...state,
    baseLayout: [0, 0, 0] as [number, number, number],
    outs: 0, strikes: 0, balls: 0,
    pendingDecision: null as DecisionType | null,
    onePitchModifier: null as OnePitchModifier,
    hitType: undefined,
  };
  let newHalfInning = newState.atBat + 1;
  let newInning = newState.inning;

  if (newHalfInning > 1) {
    newHalfInning = 0;
    newInning += 1;
  }

  const next = { ...newState, inning: newInning, atBat: newHalfInning };

  if (newHalfInning === 0 && newInning > 9) {
    const maybe = checkGameOver(next, log);
    if (maybe.gameOver) return maybe;
  }

  log(`${state.teams[newHalfInning]} are now up to bat!`);
  return next;
};

export const checkWalkoff = (state: State, log): State => {
  if (state.inning >= 9 && state.atBat === 1) {
    const [away, home] = state.score;
    if (home > away) {
      log(`Walk-off! ${state.teams[1]} win!`);
      return { ...state, gameOver: true };
    }
  }
  return state;
};

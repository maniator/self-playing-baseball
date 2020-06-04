import { Hit } from "../constants/hitTypes";
import getRandomInt from "../utilities/getRandomInt";
import { State } from "./index";

enum Base {
  First,
  Second,
  Third,
  Home
}

const createLogger = (dispatchLogger) => (message) => {
  dispatchLogger({ type: "log", payload: message });
}

const moveBase = (log, state: State, fromBase: Base, toBase: Base): State => {
  let newState = { ...state };

  const nextBase = fromBase === null ? Base.First : fromBase + 1;

  if (newState.baseLayout.hasOwnProperty(fromBase) && fromBase !== Base.Home) {
    newState.baseLayout[fromBase] = 1;
  }

  if (Base[fromBase] === Base[toBase]) {
    if (toBase === Base.Home) {
      log("Player scored a run!");
      newState.score[newState.atBat] += 1;
    } else {
      log(`Player stayed on ${Base[toBase]}`);
    }

    return newState;
  }

  if (fromBase === toBase) {
    return newState;
  } else if (newState.baseLayout.hasOwnProperty(nextBase) || nextBase === Base.Home) {
    if (newState.baseLayout[nextBase] === 1) {
      log(`Already someone on ${Base[nextBase]}`)
      newState = moveBase(log, newState, nextBase, nextBase + 1);
      newState.baseLayout[nextBase] = 0;
    }

    log(`Player runs to ${Base[nextBase]}`)
    newState = moveBase(log, newState, nextBase, toBase);
  } else {
    throw new Error(`Base does not exist: ${Base[nextBase]}`);
  }

  if (newState.baseLayout.hasOwnProperty(fromBase) && fromBase !== Base.Home) {
    newState.baseLayout[fromBase] = 0;
  }

  return newState;
}

const hitBall = (type: Hit, state: State, log): State => {
  let newState = { ...state };

  switch (type) {
    case Hit.Homerun:
      newState = moveBase(log, newState, null, Base.Home);
      break;
    case Hit.Triple:
      newState = moveBase(log, newState, null, Base.Third);
      break;
    case Hit.Double:
      newState = moveBase(log, newState, null, Base.Second);
      break;
    case Hit.Walk:
    case Hit.Single:
      newState = moveBase(log, newState, null, Base.First);
      break;
    default:
      throw new Error(`Not a possible hit type: ${type}`);
  }

  return newState;
};

const nextHalfInning = (state, log): State => {
  const newState = { ...state };
  let newHalfInning = newState.atBat + 1;
  let newInning = newState.inning;

  if (newHalfInning > 1) {
    newHalfInning = newState.atBat = 0;
    newInning += 1;
  }

  log(`${state.teams[newHalfInning]} are now up to bat!`)

  return { ...newState, inning: newInning, atBat: newHalfInning, strikes: 0, outs: 0, balls: 0 };
}

const playerOut = (state, log) => {
  const newState = { ...state };
  const newOuts = newState.outs + 1;
  log("Player is out!");

  if (newOuts === 3) {
    log("Team has three outs, next team is up!");
    return nextHalfInning(newState, log);
  }

  return { ...newState, strikes: 0, balls: 0, outs: newOuts }
}

const playerStrike = (state, log): State => {
  const newStrikes = state.strikes + 1;

  if (newStrikes === 3) {
    log("Strike three! Yerrr out!")
    return playerOut(state, log);
  }

  log(`Strike ${newStrikes}!`)

  return { ...state, strikes: newStrikes };
}

const playerBall = (state, log): State => {
  const newBalls = state.balls + 1;

  if (newBalls === 4) {
    log("Player takes his base");
    return hitBall(Hit.Walk, state, log);
  }

  return { ...state, balls: newBalls };
}

const playerWait = (state, log): State => {
  const random = getRandomInt(1000);

  if (random % 2 === 0) {
    log("A called strike!")
    return playerStrike(state, log);
  } else {
    log("Ball has been called!")
    return playerBall(state, log);
  }
}

const reducer = (dispatchLogger) => {
  const log = createLogger(dispatchLogger);

  return function reducer(state: State, action: { type: string, payload: any }): State {
    switch (action.type) {
      case 'nextInning':
        return { ...state, inning: state.inning + 1 };
      case 'hit':
        return hitBall(action.payload, state, log);
      case 'startGame':
        return { ...state, teams: action.payload };
      case 'strike':
        return playerStrike(state, log);
      case 'wait':
        return playerWait(state, log);
      default:
        throw new Error(`No such reducer type as ${action.type}`);
    }
  }
}

export default reducer;

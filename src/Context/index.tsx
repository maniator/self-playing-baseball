import * as React from "react";
import { Hit } from "../constants/hitTypes";

export const GameContext = React.createContext();

type State = {
  inning: number,
  score: [number, number],
  baseLayout: [number, number, number],
  outs: number,
  strikes: number,
  balls: number,
  atBat: number
}

enum Base {
  First,
  Second,
  Third,
  Home
}

const moveBase = (state: State, fromBase: Base, toBase: Base): State => {
  let newState = { ...state };

  const nextBase = fromBase === Base.Home ? Base.First : fromBase + 1;

  console.log(`Running to ${Base[fromBase]} to ${Base[toBase]}`)
  console.log(`Next base: ${Base[nextBase]}`)

  if (newState.baseLayout.hasOwnProperty(fromBase) && fromBase !== Base.Home) {
    newState.baseLayout[fromBase] = 1;
  }

  if (fromBase === toBase && toBase === Base.Home) { //ran home
    newState.score[newState.atBat] += 1;
  } else if (fromBase === toBase) {
    return newState;
  } else if (newState.baseLayout.hasOwnProperty(nextBase) || nextBase === Base.Home) {
      if (newState.baseLayout[nextBase] === 1) {
        console.log(`Already someone on ${Base[nextBase]}`)
        newState = moveBase(newState, nextBase, nextBase + 1);
        newState.baseLayout[nextBase] = 0;
      }

      console.log(`Runner keeps running on to ${Base[nextBase]}`)
      newState = moveBase(newState, nextBase, toBase);
  } else {
    throw new Error(`Base does not exist: ${Base[nextBase]}`);
  }

  if (newState.baseLayout.hasOwnProperty(fromBase) && fromBase !== Base.Home) {
    newState.baseLayout[fromBase] = 0;
  }

  return newState;
}

const hitBall = (type: Hit, state: State): State => {
  let newState = { ...state };

  switch (type) {
    case Hit.Homerun:
      newState = moveBase(newState, Base.Home, Base.Home);
      break;
    case Hit.Triple:
      newState = moveBase(newState, Base.Home, Base.Third);
      break;
    case Hit.Double:
      newState = moveBase(newState, Base.Home, Base.Second);
      break;
    case Hit.Single:
      newState = moveBase(newState, Base.Home, Base.First);
      break;
    default:
      throw new Error(`Not a possible hit type: ${type}`);
  }

  return newState;
};

function reducer(state: State, action: { type: string, payload: any }): State {
  switch (action.type) {
    case 'nextInning':
      return { ...state, inning: state.inning + 1 };
    case 'hit':
      return hitBall(action.payload, state)
    default:
      throw new Error();
  }
}

const initialState: State = {
  inning: 0,
  score: [0, 0],
  baseLayout: [0, 0, 0],
  outs: 0,
  strikes: 0,
  balls: 0,
  atBat: 0
};

export const GameProviderWrapper = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  return (
    <GameContext.Provider value={{ ...state, dispatch }}>{children}</GameContext.Provider>
  );
}

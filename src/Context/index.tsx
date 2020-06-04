import * as React from "react";
import { Hit } from "../constants/hitTypes";

export const GameContext = React.createContext();

export type State = {
  inning: number,
  score: [number, number],
  teams: [string, string],
  baseLayout: [number, number, number],
  outs: number,
  strikes: number,
  balls: number,
  atBat: number,
}

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

const hitBall = (type: Hit, state: State, dispatchLogger): State => {
  let newState = { ...state };
  const log = createLogger(dispatchLogger);

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
    case Hit.Single:
      newState = moveBase(log, newState, null, Base.First);
      break;
    default:
      throw new Error(`Not a possible hit type: ${type}`);
  }

  return newState;
};

const reducer = (dispatchLogger) => function reducer(state: State, action: { type: string, payload: any }): State {
  switch (action.type) {
    case 'nextInning':
      return { ...state, inning: state.inning + 1 };
    case 'hit':
      return hitBall(action.payload, state, dispatchLogger);
    case 'startGame':
      return { ...state, teams: action.payload };
    default:
      throw new Error(`No such reducer type as ${action.type}`);
  }
}

function logReducer(state: { announcements: string[] }, action: { type: string, payload: any }): { announcements: string[] } {
  switch (action.type) {
    case 'log':
      console.log(action.payload);
      const newState = { ...state };
      newState.announcements.unshift(action.payload);

      return newState;
    default:
      throw new Error(`No such reducer type as ${action.type}`);
  }
}

const initialState: State = {
  inning: 0,
  score: [0, 0],
  teams: ["A", "B"],
  baseLayout: [0, 0, 0],
  outs: 0,
  strikes: 0,
  balls: 0,
  atBat: 0
};

type Props = {};

export const GameProviderWrapper: React.FunctionComponent<Props> = ({ children }) => {
  const [logState, dispatchLogger] = React.useReducer(logReducer, { announcements: [] });
  const [state, dispatch] = React.useReducer(reducer(dispatchLogger), initialState);

  return (
    <GameContext.Provider value={{
      ...state,
      dispatch,
      log: logState.announcements,
      dispatchLog: dispatchLogger
    }}>
      {children}
    </GameContext.Provider>
  );
}

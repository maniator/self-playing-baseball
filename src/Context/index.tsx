import * as React from "react";
import reducer from "./reducer";
import { Hit } from "../constants/hitTypes";
import { announce } from "../utilities/announce";

export const GameContext = React.createContext();

export type Strategy = "balanced" | "aggressive" | "patient" | "contact" | "power";

export type DecisionType =
  | { kind: "steal"; base: 0 | 1; successPct: number }
  | { kind: "bunt" }
  | { kind: "count30" }
  | { kind: "count02" }
  | { kind: "ibb" };

export type OnePitchModifier = "take" | "swing" | "protect" | "normal" | null;

export interface State {
  inning: number,
  score: [number, number],
  teams: [string, string],
  baseLayout: [number, number, number],
  outs: number,
  strikes: number,
  balls: number,
  atBat: number,
  hitType?: Hit,
  gameOver: boolean,
  pendingDecision: DecisionType | null,
  onePitchModifier: OnePitchModifier,
}

export interface ContextValue extends State {
  dispatch: Function,
  dispatchLog: Function,
}

function logReducer(state: { announcements: string[] }, action: { type: string, payload: any }): { announcements: string[] } {
  switch (action.type) {
    case 'log':
      const message = action.payload;
      console.log(message);
      const newState = { ...state };
      newState.announcements.unshift(message);

      announce(message);

      return newState;
    default:
      throw new Error(`No such reducer type as ${action.type}`);
  }
}

const initialState: State = {
  inning: 1,
  score: [0, 0],
  teams: ["A", "B"],
  baseLayout: [0, 0, 0],
  outs: 0,
  strikes: 0,
  balls: 0,
  atBat: 0,
  gameOver: false,
  pendingDecision: null,
  onePitchModifier: null,
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

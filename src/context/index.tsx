import * as React from "react";

import { Hit } from "@constants/hitTypes";
import { announce } from "@utils/announce";

import reducer from "./reducer";

export type PlayLogEntry = {
  inning: number;
  half: 0 | 1; // 0 = top (away bats), 1 = bottom (home bats)
  batterNum: number; // 1–9
  team: 0 | 1;
  event: Hit; // hit type (includes Walk)
  runs: number; // runs scored on this play
};

export type StrikeoutEntry = {
  team: 0 | 1;
  batterNum: number; // 1–9
};

export const GameContext = React.createContext<ContextValue | undefined>(undefined);

export const useGameContext = (): ContextValue => {
  const ctx = React.useContext(GameContext);
  if (!ctx) throw new Error("useGameContext must be used within GameProviderWrapper");
  return ctx;
};

export type Strategy = "balanced" | "aggressive" | "patient" | "contact" | "power";

export type PlayerCustomization = {
  nickname?: string;
  contactMod?: number;
  powerMod?: number;
  speedMod?: number;
  controlMod?: number;
  velocityMod?: number;
  staminaMod?: number;
};

export type TeamCustomPlayerOverrides = Record<string, PlayerCustomization>;

export type DecisionType =
  | { kind: "steal"; base: 0 | 1; successPct: number }
  | { kind: "bunt" }
  | { kind: "count30" }
  | { kind: "count02" }
  | { kind: "ibb" }
  | { kind: "ibb_or_steal"; base: 0 | 1; successPct: number }
  | { kind: "pinch_hitter" }
  | { kind: "defensive_shift" };

export type OnePitchModifier = "take" | "swing" | "protect" | "normal" | null;

export interface State {
  inning: number;
  score: [number, number];
  teams: [string, string];
  baseLayout: [number, number, number];
  outs: number;
  strikes: number;
  balls: number;
  atBat: number;
  hitType?: Hit;
  gameOver: boolean;
  pendingDecision: DecisionType | null;
  onePitchModifier: OnePitchModifier;
  pitchKey: number;
  decisionLog: string[];
  suppressNextDecision: boolean; // true after an intentional walk; clears on next pitch
  pinchHitterStrategy: Strategy | null; // overrides manager strategy for one batter
  defensiveShift: boolean; // pop-out threshold multiplied by 0.85 when true
  defensiveShiftOffered: boolean; // prevents re-offering shift during the same half-inning
  batterIndex: [number, number]; // 0–8 position in the 9-batter lineup per team
  inningRuns: [number[], number[]]; // runs scored per inning index per team (sparse)
  playLog: PlayLogEntry[]; // record of every hit/walk with batter attribution
  strikeoutLog: StrikeoutEntry[]; // record of every strikeout with batter attribution
  playerOverrides: [TeamCustomPlayerOverrides, TeamCustomPlayerOverrides]; // [away, home]
  lineupOrder: [string[], string[]]; // [away, home] batter IDs in batting order (empty = default)
}

export interface ContextValue extends State {
  dispatch: React.Dispatch<GameAction>;
  dispatchLog: React.Dispatch<LogAction>;
  /** Play-by-play announcement log (most recent first). */
  log: string[];
}

export type LogAction = { type: "log"; payload: string };
export type GameAction = { type: string; payload?: unknown };

function logReducer(
  state: { announcements: string[] },
  action: LogAction,
): { announcements: string[] } {
  switch (action.type) {
    case "log": {
      const message = action.payload;
      announce(message);
      return { ...state, announcements: [message, ...state.announcements] };
    }
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
  pitchKey: 0,
  decisionLog: [],
  suppressNextDecision: false,
  pinchHitterStrategy: null,
  defensiveShift: false,
  defensiveShiftOffered: false,
  batterIndex: [0, 0],
  inningRuns: [[], []],
  playLog: [],
  strikeoutLog: [],
  playerOverrides: [{}, {}] as [TeamCustomPlayerOverrides, TeamCustomPlayerOverrides],
  lineupOrder: [[], []] as [string[], string[]],
};

export const GameProviderWrapper: React.FunctionComponent = ({ children }) => {
  const [logState, dispatchLogger] = React.useReducer(logReducer, { announcements: [] });
  const [state, dispatch] = React.useReducer(reducer(dispatchLogger), initialState);

  return (
    <GameContext.Provider
      value={{
        ...state,
        dispatch,
        log: logState.announcements,
        dispatchLog: dispatchLogger,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

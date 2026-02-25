import * as React from "react";

import { Hit } from "@constants/hitTypes";
import { announce } from "@utils/announce";

import { createFreshGameState } from "./initialState";
import reducer from "./reducer";

export type PlayLogEntry = {
  inning: number;
  half: 0 | 1; // 0 = top (away bats), 1 = bottom (home bats)
  batterNum: number; // 1–9
  team: 0 | 1;
  event: Hit; // hit type (includes Walk)
  runs: number; // runs scored on this play
  /**
   * RBI credited to the batter on this play.
   * Equals runsScored for hits (single/double/triple/homerun) and walks
   * (including bases-loaded walks). Sac bunts and fielder's choice plays
   * are not credited with RBI in this simulator (simplified rule — those
   * plays resolve through outLog, not playLog).
   * Field is optional for backward compatibility with older saved data:
   * `restore_game` backfills missing `rbi` from `runs` when a save is
   * loaded, and stat aggregation then uses `entry.rbi ?? 0` so that only
   * entries that still lack an explicit value default to 0.
   */
  rbi?: number;
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

export type ModPreset = -20 | -10 | -5 | 0 | 5 | 10 | 20;

export type PlayerCustomization = {
  nickname?: string;
  /** Defensive position string (e.g. "C", "LF") — populated for custom-team players. */
  position?: string;
  contactMod?: ModPreset;
  powerMod?: ModPreset;
  speedMod?: ModPreset;
  controlMod?: ModPreset;
  velocityMod?: ModPreset;
  staminaMod?: ModPreset;
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
  outLog: StrikeoutEntry[]; // record of every batter-completed out (K + pop-out + groundout + FC + sac-bunt)
  playerOverrides: [TeamCustomPlayerOverrides, TeamCustomPlayerOverrides]; // [away, home]
  lineupOrder: [string[], string[]]; // [away, home] batter IDs in batting order (empty = default)
  /** Bench player IDs available for substitution per team. [away, home] */
  rosterBench: [string[], string[]];
  /** Pitcher IDs in the bullpen per team. [away, home] */
  rosterPitchers: [string[], string[]];
  /** Index into rosterPitchers of the currently active pitcher per team. [away, home] */
  activePitcherIdx: [number, number];
}

export interface ContextValue extends State {
  dispatch: React.Dispatch<GameAction>;
  dispatchLog: React.Dispatch<LogAction>;
  /** Play-by-play announcement log (most recent first). */
  log: string[];
}

export type LogAction =
  | { type: "log"; payload: string; preprocessor?: (text: string) => string }
  | { type: "reset" };
export type GameAction = { type: string; payload?: unknown };

function logReducer(
  state: { announcements: string[] },
  action: LogAction,
): { announcements: string[] } {
  switch (action.type) {
    case "log": {
      const message = action.payload;
      announce(message, { preprocessor: action.preprocessor });
      return { ...state, announcements: [message, ...state.announcements] };
    }
    case "reset":
      return { announcements: [] };
    default:
      throw new Error(`No such reducer type as ${action.type}`);
  }
}

const initialState: State = createFreshGameState(["A", "B"]);

export const GameProviderWrapper: React.FunctionComponent<{
  onDispatch?: (action: GameAction) => void;
  announcePreprocessor?: (text: string) => string;
}> = ({ children, onDispatch, announcePreprocessor }) => {
  const [logState, dispatchLogger] = React.useReducer(logReducer, { announcements: [] });

  // Use a ref so the wrapped dispatch is stable even if onDispatch identity changes.
  const onDispatchRef = React.useRef(onDispatch);
  onDispatchRef.current = onDispatch;

  // Use a ref so the preprocessor is always-current without re-creating the wrapper.
  const preprocessorRef = React.useRef(announcePreprocessor);
  preprocessorRef.current = announcePreprocessor;

  // Stable injecting dispatcher: reads preprocessorRef on every call, composing
  // with any action-level preprocessor, then forwards to dispatchLogger.
  // Stored in a ref so the *same function identity* is passed to reducer(...)
  // (which captures it once at useReducer initialization) AND exposed as
  // dispatchLog — ensuring all log paths (game reducer + external callers) go
  // through the preprocessor.
  const injectingDispatch = React.useRef<React.Dispatch<LogAction>>((action: LogAction) => {
    if (action.type !== "log") {
      dispatchLogger(action);
      return;
    }
    const globalPre = preprocessorRef.current;
    const actionPre = action.preprocessor;
    let combined = actionPre ?? globalPre;
    if (globalPre && actionPre) {
      combined = (t: string) => actionPre(globalPre(t));
    }
    dispatchLogger({ ...action, preprocessor: combined });
  }).current;

  const [state, rawDispatch] = React.useReducer(reducer(injectingDispatch), initialState);

  const dispatch: React.Dispatch<GameAction> = React.useCallback((action) => {
    onDispatchRef.current?.(action);
    rawDispatch(action);
  }, []);

  return (
    <GameContext.Provider
      value={{
        ...state,
        dispatch,
        log: logState.announcements,
        dispatchLog: injectingDispatch,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

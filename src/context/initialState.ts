import type { PlayLogEntry, State, TeamCustomPlayerOverrides } from "./index";

/**
 * Returns a fresh game state with all fields reset to their starting values.
 * Used for the `reset` action and as the initial state for the context provider.
 */
export const createFreshGameState = (teams: [string, string]): State => ({
  inning: 1,
  score: [0, 0] as [number, number],
  teams,
  baseLayout: [0, 0, 0] as [number, number, number],
  outs: 0,
  strikes: 0,
  balls: 0,
  atBat: 0,
  hitType: undefined,
  gameOver: false,
  pendingDecision: null,
  onePitchModifier: null,
  pitchKey: 0,
  decisionLog: [],
  suppressNextDecision: false,
  pinchHitterStrategy: null,
  defensiveShift: false,
  defensiveShiftOffered: false,
  batterIndex: [0, 0] as [number, number],
  inningRuns: [[], []] as [number[], number[]],
  playLog: [],
  strikeoutLog: [],
  outLog: [],
  playerOverrides: [{}, {}] as [TeamCustomPlayerOverrides, TeamCustomPlayerOverrides],
  lineupOrder: [[], []] as [string[], string[]],
});

/**
 * Backfills optional fields that may be missing on older saves,
 * ensuring backward compatibility when a saved game is restored.
 */
export const backfillRestoredState = (restored: State): State => {
  const playLog: PlayLogEntry[] = (restored.playLog ?? []).map((entry) =>
    entry.rbi !== undefined ? entry : { ...entry, rbi: entry.runs },
  );
  return {
    ...restored,
    playLog,
    playerOverrides: restored.playerOverrides ?? [{}, {}],
    lineupOrder: restored.lineupOrder ?? [[], []],
    strikeoutLog: restored.strikeoutLog ?? [],
    outLog: restored.outLog ?? [],
  };
};

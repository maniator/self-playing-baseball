import type { PlayLogEntry, State, TeamCustomPlayerOverrides } from "./index";

/** Fallback team names used when a very old save is missing the `teams` field. */
const FALLBACK_TEAMS: [string, string] = ["Away", "Home"];

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
 *
 * Uses `createFreshGameState` as the base so any field added to State in the
 * future automatically gets a safe default for saves predating that field.
 * The restored save data is merged on top, overriding the defaults with the
 * actual persisted values.
 *
 * Array/object fields are additionally guarded against explicit null/undefined
 * values, which can appear when a save was written during an older code version
 * that stored null rather than omitting the field entirely.
 */
export const backfillRestoredState = (restored: State): State => {
  // Build a fresh-defaults base using the save's own teams (fall back to a
  // safe placeholder if teams is absent in a very old save).
  const fresh = createFreshGameState(
    Array.isArray(restored.teams) && restored.teams.length === 2 ? restored.teams : FALLBACK_TEAMS,
  );
  // Merge: fresh supplies safe defaults for any field absent in the save;
  // restored values override fresh defaults for fields that are present.
  const base: State = { ...fresh, ...restored };
  // Backfill playLog rbi for entries from saves that predate the rbi field.
  const playLog: PlayLogEntry[] = (base.playLog ?? []).map((entry) =>
    entry.rbi !== undefined ? entry : { ...entry, rbi: entry.runs },
  );
  // Explicitly guard array/object fields against null or explicit undefined
  // that may survive in saves from older code that wrote null instead of [].
  return {
    ...base,
    playLog,
    strikeoutLog: base.strikeoutLog ?? [],
    outLog: base.outLog ?? [],
    playerOverrides: base.playerOverrides ?? [{}, {}],
    lineupOrder: base.lineupOrder ?? [[], []],
    decisionLog: base.decisionLog ?? [],
    inningRuns: base.inningRuns ?? [[], []],
    batterIndex: base.batterIndex ?? [0, 0],
  };
};

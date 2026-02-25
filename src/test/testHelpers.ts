import { vi } from "vitest";

import type { ContextValue, State, TeamCustomPlayerOverrides } from "@context/index";
import * as rngModule from "@utils/rng";

const emptyOverrides: [TeamCustomPlayerOverrides, TeamCustomPlayerOverrides] = [
  Object.freeze({}) as TeamCustomPlayerOverrides,
  Object.freeze({}) as TeamCustomPlayerOverrides,
];

/** Creates a full default State with optional field overrides. */
export const makeState = (overrides: Partial<State> = {}): State => ({
  inning: 1,
  score: [0, 0],
  teams: ["Away", "Home"],
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
  outLog: [],
  playerOverrides: emptyOverrides,
  lineupOrder: [[], []] as [string[], string[]],
  rosterBench: [[], []] as [string[], string[]],
  rosterPitchers: [[], []] as [string[], string[]],
  activePitcherIdx: [0, 0] as [number, number],
  lineupPositions: [[], []] as [string[], string[]],
  pitcherBattersFaced: [0, 0] as [number, number],
  substitutedOut: [[], []] as [string[], string[]],
  baseRunnerIds: [null, null, null] as [string | null, string | null, string | null],
  ...overrides,
});

/** Creates a full default ContextValue with optional field overrides. */
export const makeContextValue = (overrides: Partial<ContextValue> = {}): ContextValue => ({
  inning: 1,
  score: [3, 2],
  teams: ["Away", "Home"],
  baseLayout: [0, 0, 0],
  outs: 1,
  strikes: 2,
  balls: 1,
  atBat: 0,
  gameOver: false,
  pendingDecision: null,
  onePitchModifier: null,
  pitchKey: 0,
  decisionLog: [],
  hitType: undefined,
  log: [],
  dispatch: vi.fn(),
  dispatchLog: vi.fn(),
  suppressNextDecision: false,
  pinchHitterStrategy: null,
  defensiveShift: false,
  defensiveShiftOffered: false,
  batterIndex: [0, 0],
  inningRuns: [[], []],
  playLog: [],
  strikeoutLog: [],
  outLog: [],
  playerOverrides: emptyOverrides,
  lineupOrder: [[], []] as [string[], string[]],
  rosterBench: [[], []] as [string[], string[]],
  rosterPitchers: [[], []] as [string[], string[]],
  activePitcherIdx: [0, 0] as [number, number],
  lineupPositions: [[], []] as [string[], string[]],
  pitcherBattersFaced: [0, 0] as [number, number],
  substitutedOut: [[], []] as [string[], string[]],
  baseRunnerIds: [null, null, null] as [string | null, string | null, string | null],
  ...overrides,
});

/** Creates a log array and a log-function that appends to it. */
export const makeLogs = () => {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);
  return { logs, log };
};

/** Mocks rng.random to return a fixed value for all calls. */
export const mockRandom = (value: number) => vi.spyOn(rngModule, "random").mockReturnValue(value);

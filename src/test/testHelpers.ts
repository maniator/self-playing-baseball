import { vi } from "vitest";

import type {
  ContextValue,
  ResolvedPlayerMods,
  State,
  TeamCustomPlayerOverrides,
} from "@context/index";
import { buildResolvedMods } from "@context/resolvePlayerMods";
import * as rngModule from "@utils/rng";

const emptyOverrides: [TeamCustomPlayerOverrides, TeamCustomPlayerOverrides] = [
  Object.freeze({}) as TeamCustomPlayerOverrides,
  Object.freeze({}) as TeamCustomPlayerOverrides,
];

const emptyResolvedMods: [Record<string, ResolvedPlayerMods>, Record<string, ResolvedPlayerMods>] =
  [{}, {}];

/** Creates a full default State with optional field overrides. */
export const makeState = (overrides: Partial<State> = {}): State => {
  const playerOverrides = overrides.playerOverrides ?? emptyOverrides;
  // Auto-compute resolvedMods from playerOverrides unless explicitly provided.
  const resolvedMods: [Record<string, ResolvedPlayerMods>, Record<string, ResolvedPlayerMods>] =
    overrides.resolvedMods ??
    (overrides.playerOverrides
      ? [buildResolvedMods(playerOverrides[0]), buildResolvedMods(playerOverrides[1])]
      : emptyResolvedMods);
  // Derive teamLabels from teams if not explicitly provided.
  const teams = (overrides.teams ?? ["Away", "Home"]) as [string, string];
  const teamLabels: [string, string] = overrides.teamLabels ?? teams;
  return {
    inning: 1,
    score: [0, 0],
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
    // Derived fields that must be computed after overrides:
    teams,
    teamLabels,
    resolvedMods,
  };
};

/** Creates a full default ContextValue with optional field overrides. */
export const makeContextValue = (overrides: Partial<ContextValue> = {}): ContextValue => {
  const teams = (overrides.teams ?? ["Away", "Home"]) as [string, string];
  const teamLabels: [string, string] = overrides.teamLabels ?? teams;
  return {
    inning: 1,
    score: [3, 2],
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
    resolvedMods: emptyResolvedMods,
    ...overrides,
    // Derived fields that must be computed after overrides:
    teams,
    teamLabels,
  };
};

/** Creates a log array and a log-function that appends to it. */
export const makeLogs = () => {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);
  return { logs, log };
};

/** Mocks rng.random to return a fixed value for all calls. */
export const mockRandom = (value: number) => vi.spyOn(rngModule, "random").mockReturnValue(value);

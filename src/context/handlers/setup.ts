import type {
  GameAction,
  PitcherLogEntry,
  ResolvedPlayerMods,
  State,
  TeamCustomPlayerOverrides,
} from "../index";
import { createPitcherLogEntry, pushPitcherLogEntry } from "../pitcherLog";
import { buildResolvedMods } from "../resolvePlayerMods";

/** Computes the defensive slot assignments for a lineup from player overrides. */
const computeLineupPositions = (order: string[], overrides: TeamCustomPlayerOverrides): string[] =>
  order.map((id) => overrides[id]?.position ?? "");

/**
 * Handles pre-game setup / new-game configuration actions.
 * Returns `undefined` for any action type that is not a setup action,
 * allowing the root reducer to fall through to its own branches.
 */
export const handleSetupAction = (state: State, action: GameAction): State | undefined => {
  switch (action.type) {
    case "setTeams": {
      const p = action.payload as
        | [string, string]
        | {
            teams: [string, string];
            /** Human-readable display names (matched by index). Defaults to `teams` if omitted. */
            teamLabels?: [string, string];
            playerOverrides?: [TeamCustomPlayerOverrides, TeamCustomPlayerOverrides];
            lineupOrder?: [string[], string[]];
            rosterBench?: [string[], string[]];
            rosterPitchers?: [string[], string[]];
            /** Override the starting pitcher index per team. null = use 0 (default). */
            startingPitcherIdx?: [number | null, number | null];
          };
      if (Array.isArray(p)) {
        return { ...state, teams: p, teamLabels: p };
      }
      let lineupPositions: [string[], string[]] = state.lineupPositions;
      if (p.lineupOrder && p.playerOverrides) {
        const computed: [string[], string[]] = [
          computeLineupPositions(p.lineupOrder[0], p.playerOverrides[0]),
          computeLineupPositions(p.lineupOrder[1], p.playerOverrides[1]),
        ];
        const hasAnyPosition =
          computed[0].some((pos) => pos !== "") || computed[1].some((pos) => pos !== "");
        if (hasAnyPosition) {
          lineupPositions = computed;
        }
      }
      const newPlayerOverrides = p.playerOverrides ?? state.playerOverrides;
      const newResolvedMods: [
        Record<string, ResolvedPlayerMods>,
        Record<string, ResolvedPlayerMods>,
      ] = [buildResolvedMods(newPlayerOverrides[0]), buildResolvedMods(newPlayerOverrides[1])];
      // Apply starting pitcher index per team (clamped to valid range; default 0).
      let newActivePitcherIdx: [number, number] = state.activePitcherIdx;
      if (p.startingPitcherIdx && p.rosterPitchers) {
        const clampIdx = (idx: number | null, pitchers: string[]) => {
          if (idx === null || idx === undefined) return 0;
          return idx >= 0 && idx < pitchers.length ? idx : 0;
        };
        newActivePitcherIdx = [
          clampIdx(p.startingPitcherIdx[0], p.rosterPitchers[0]),
          clampIdx(p.startingPitcherIdx[1], p.rosterPitchers[1]),
        ];
      }
      // Compute pitcher log initial entries for each team when pitchers are provided.
      // When rosterPitchers is provided, always start fresh so repeated setTeams dispatches
      // (e.g. changing starting pitcher selection) don't accumulate duplicate entries.
      // When rosterPitchers is not provided, preserve the existing log.
      let newPitcherGameLog: [PitcherLogEntry[], PitcherLogEntry[]] = p.rosterPitchers
        ? [[], []]
        : (state.pitcherGameLog ?? [[], []]);
      if (p.rosterPitchers) {
        // Initialize pitcher log for each team's starting pitcher.
        for (const teamIdx of [0, 1] as const) {
          const pitchers = p.rosterPitchers[teamIdx];
          if (pitchers.length === 0) continue;
          const startingIdx =
            p.startingPitcherIdx?.[teamIdx] !== undefined &&
            p.startingPitcherIdx[teamIdx] !== null &&
            (p.startingPitcherIdx[teamIdx] as number) < pitchers.length
              ? (p.startingPitcherIdx[teamIdx] as number)
              : 0;
          const pitcherId = pitchers[startingIdx];
          // Build a temporary state snapshot for the entry (score/inning at setup time).
          const tempState: State = {
            ...state,
            ...(p.rosterPitchers ? { rosterPitchers: p.rosterPitchers } : {}),
            activePitcherIdx: newActivePitcherIdx,
          };
          const entry = createPitcherLogEntry(teamIdx, pitcherId, tempState);
          newPitcherGameLog = pushPitcherLogEntry(newPitcherGameLog, teamIdx, entry);
        }
      }
      return {
        ...state,
        teams: p.teams,
        teamLabels: p.teamLabels ?? p.teams,
        ...(p.playerOverrides ? { playerOverrides: p.playerOverrides } : {}),
        ...(p.lineupOrder ? { lineupOrder: p.lineupOrder } : {}),
        ...(p.rosterBench ? { rosterBench: p.rosterBench } : {}),
        ...(p.rosterPitchers ? { rosterPitchers: p.rosterPitchers } : {}),
        activePitcherIdx: newActivePitcherIdx,
        lineupPositions,
        resolvedMods: newResolvedMods,
        pitcherGameLog: newPitcherGameLog,
      };
    }
    default:
      return undefined;
  }
};

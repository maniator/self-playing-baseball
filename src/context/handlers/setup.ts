import type { GameAction, ResolvedPlayerMods, State, TeamCustomPlayerOverrides } from "../index";
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
            playerOverrides?: [TeamCustomPlayerOverrides, TeamCustomPlayerOverrides];
            lineupOrder?: [string[], string[]];
            rosterBench?: [string[], string[]];
            rosterPitchers?: [string[], string[]];
          };
      if (Array.isArray(p)) {
        return { ...state, teams: p };
      }
      // Compute lineupPositions from lineupOrder + playerOverrides when both are present
      // and at least one player has a non-empty position. For MLB games, playerOverrides
      // have no .position — producing all-empty-string arrays — so we keep the existing
      // [[], []] default to let PlayerStatsPanel fall back to roster-position lookup.
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
      return {
        ...state,
        teams: p.teams,
        ...(p.playerOverrides ? { playerOverrides: p.playerOverrides } : {}),
        ...(p.lineupOrder ? { lineupOrder: p.lineupOrder } : {}),
        ...(p.rosterBench ? { rosterBench: p.rosterBench } : {}),
        ...(p.rosterPitchers ? { rosterPitchers: p.rosterPitchers } : {}),
        lineupPositions,
        resolvedMods: newResolvedMods,
      };
    }
    default:
      return undefined;
  }
};

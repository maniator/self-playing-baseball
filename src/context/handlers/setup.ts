import type { GameAction, State, TeamCustomPlayerOverrides } from "../index";

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
      // Compute lineupPositions from lineupOrder + playerOverrides when both are present.
      // This records the defensive slot assignment for each batting position at game-start.
      // Substitutions keep the same slot assignments so positions stay unique per slot.
      const lineupPositions: [string[], string[]] =
        p.lineupOrder && p.playerOverrides
          ? [
              computeLineupPositions(p.lineupOrder[0], p.playerOverrides[0]),
              computeLineupPositions(p.lineupOrder[1], p.playerOverrides[1]),
            ]
          : state.lineupPositions;
      return {
        ...state,
        teams: p.teams,
        ...(p.playerOverrides ? { playerOverrides: p.playerOverrides } : {}),
        ...(p.lineupOrder ? { lineupOrder: p.lineupOrder } : {}),
        ...(p.rosterBench ? { rosterBench: p.rosterBench } : {}),
        ...(p.rosterPitchers ? { rosterPitchers: p.rosterPitchers } : {}),
        lineupPositions,
      };
    }
    default:
      return undefined;
  }
};

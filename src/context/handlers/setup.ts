import type { GameAction, State, TeamCustomPlayerOverrides } from "../index";

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
          };
      if (Array.isArray(p)) {
        return { ...state, teams: p };
      }
      return {
        ...state,
        teams: p.teams,
        ...(p.playerOverrides ? { playerOverrides: p.playerOverrides } : {}),
        ...(p.lineupOrder ? { lineupOrder: p.lineupOrder } : {}),
      };
    }
    default:
      return undefined;
  }
};

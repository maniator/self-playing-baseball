import * as React from "react";

import { CustomTeamStore } from "@feat/customTeams/storage/customTeamStore";
import { appLog } from "@shared/utils/logger";

import type { TeamWithRoster } from "@storage/types";

/**
 * Fetches a single team (with assembled roster) directly from the DB by ID.
 *
 * Prefer this over `useCustomTeams()` + array-find in components that already
 * know the specific team ID they need (e.g. game components that read teamId
 * from game state). This avoids loading all teams into memory just to find one.
 *
 * Returns `null` while loading or if the team does not exist.
 */
export function useTeamWithRoster(teamId: string | undefined): TeamWithRoster | null {
  const [team, setTeam] = React.useState<TeamWithRoster | null>(null);
  const prevIdRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    if (!teamId) {
      setTeam(null);
      return;
    }
    let cancelled = false;
    if (prevIdRef.current !== teamId) {
      setTeam(null);
      prevIdRef.current = teamId;
    }
    CustomTeamStore.getCustomTeam(teamId)
      .then((result) => {
        if (!cancelled) setTeam(result);
      })
      .catch((err) => {
        if (!cancelled) {
          appLog.warn("useTeamWithRoster: failed to fetch team", teamId, err);
          setTeam(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  return team;
}

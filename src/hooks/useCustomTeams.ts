import * as React from "react";

import { CustomTeamStore } from "@storage/customTeamStore";
import type { CreateCustomTeamInput, CustomTeamDoc, UpdateCustomTeamInput } from "@storage/types";
import { appLog } from "@utils/logger";

export interface CustomTeamsHook {
  teams: CustomTeamDoc[];
  loading: boolean;
  createTeam: (input: CreateCustomTeamInput) => Promise<string>;
  updateTeam: (id: string, updates: UpdateCustomTeamInput) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  refresh: () => void;
}

/**
 * React hook for accessing saved custom teams.
 *
 * Uses useState + useEffect over CustomTeamStore.  Unlike the save-store hook,
 * custom teams are not on a reactive RxDB live query, so a manual `refresh()`
 * counter is used to re-fetch after mutations.
 *
 * Returns an empty list (loading=false) on DB errors so the UI degrades
 * gracefully in test environments where IndexedDB is unavailable.
 */
export function useCustomTeams(): CustomTeamsHook {
  const [teams, setTeams] = React.useState<CustomTeamDoc[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tick, setTick] = React.useState(0);
  // Only show the loading spinner on the very first fetch.  Subsequent
  // refreshes (after create/update/delete) update teams in-place without
  // hiding the list, so the page stays stable and tests don't time-out
  // waiting for the list to reappear.
  const hasLoaded = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    if (!hasLoaded.current) {
      setLoading(true);
    }
    CustomTeamStore.listCustomTeams()
      .then((list) => {
        if (!cancelled) {
          setTeams(list);
          setLoading(false);
          hasLoaded.current = true;
        }
      })
      .catch(() => {
        if (!cancelled) {
          appLog.warn("Failed to load custom teams");
          setTeams([]);
          setLoading(false);
          hasLoaded.current = true;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const refresh = React.useCallback(() => setTick((t) => t + 1), []);

  const createTeam = React.useCallback(
    async (input: CreateCustomTeamInput): Promise<string> => {
      const id = await CustomTeamStore.createCustomTeam(input);
      refresh();
      return id;
    },
    [refresh],
  );

  const updateTeam = React.useCallback(
    async (id: string, updates: UpdateCustomTeamInput): Promise<void> => {
      await CustomTeamStore.updateCustomTeam(id, updates);
      refresh();
    },
    [refresh],
  );

  const deleteTeam = React.useCallback(
    async (id: string): Promise<void> => {
      await CustomTeamStore.deleteCustomTeam(id);
      refresh();
    },
    [refresh],
  );

  return { teams, loading, createTeam, updateTeam, deleteTeam, refresh };
}

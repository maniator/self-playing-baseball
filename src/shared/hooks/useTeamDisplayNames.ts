import * as React from "react";

import { customTeamToDisplayName } from "@feat/customTeams/adapters/customTeamAdapter";
import { CustomTeamStore } from "@feat/customTeams/storage/customTeamStore";
import { appLog } from "@shared/utils/logger";

/**
 * Fetches display names for a set of team IDs in a single batch.
 *
 * Deduplicates the input IDs and fires one `CustomTeamStore.getCustomTeam()`
 * call per unique ID in parallel (via `Promise.all`), avoiding the N-per-row
 * pattern of calling `useTeamWithRoster` inside a render loop.
 *
 * Returns a `Map<id, displayName>`. Missing / null teams fall back to
 * `"Unknown Team"`. The map is stable (same reference) until the set of
 * unique IDs changes.
 */
export function useTeamDisplayNames(teamIds: string[]): Map<string, string> {
  const [nameMap, setNameMap] = React.useState<Map<string, string>>(new Map());

  // Stringify the deduplicated sorted IDs so we only re-fetch when the set changes.
  const uniqueIds = [...new Set(teamIds)].sort();
  const idsKey = uniqueIds.join(",");

  React.useEffect(() => {
    if (uniqueIds.length === 0) {
      setNameMap(new Map());
      return;
    }
    let cancelled = false;
    Promise.all(
      uniqueIds.map((id) =>
        CustomTeamStore.getCustomTeam(id).catch((err) => {
          appLog.warn("useTeamDisplayNames: failed to fetch team", id, err);
          return null;
        }),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map = new Map<string, string>();
      uniqueIds.forEach((id, i) => {
        const doc = results[i];
        map.set(id, doc ? customTeamToDisplayName(doc) : "Unknown Team");
      });
      setNameMap(map);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return nameMap;
}

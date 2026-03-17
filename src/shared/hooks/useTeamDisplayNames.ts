import * as React from "react";

import { appLog } from "@shared/utils/logger";

import { teamsCollection } from "@storage/db";
import type { TeamRecord } from "@storage/types";

/**
 * Fetches display names for a set of team IDs in a single batch.
 *
 * Deduplicates the input IDs and fetches TeamRecord docs in one batched
 * `findByIds` call, avoiding per-row roster hydration work.
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
    teamsCollection()
      .then((collection) => collection.findByIds(uniqueIds).exec())
      .then((docsMap) => {
        if (cancelled) return;
        const map = new Map<string, string>();
        uniqueIds.forEach((id) => {
          const doc = docsMap.get(id);
          const team = doc?.toJSON() as TeamRecord | undefined;
          map.set(
            id,
            team ? (team.city ? `${team.city} ${team.name}` : team.name) : "Unknown Team",
          );
        });
        setNameMap(map);
      })
      .catch((err) => {
        if (cancelled) return;
        appLog.warn("useTeamDisplayNames: failed to batch-fetch team names", err);
        const map = new Map<string, string>();
        uniqueIds.forEach((id) => map.set(id, "Unknown Team"));
        setNameMap(map);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return nameMap;
}

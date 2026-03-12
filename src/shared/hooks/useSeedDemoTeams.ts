import * as React from "react";

import { DEMO_TEAMS, type DemoTeamDef } from "@feat/customTeams/generation/demoTeams";
import { CustomTeamStore } from "@feat/customTeams/storage/customTeamStore";
import { appLog } from "@shared/utils/logger";

import { generatePlayerId } from "@storage/generateId";
import type { TeamPlayer } from "@storage/types";

/** Map a demo player definition to a TeamPlayer ready for store insertion. */
function mapDemoPlayer(
  p: DemoTeamDef["lineup"][number],
): Pick<TeamPlayer, "id" | "name" | "role" | "batting" | "pitching"> {
  return {
    id: generatePlayerId(),
    name: p.name,
    role: p.role,
    batting: p.batting,
    ...(p.pitching !== undefined && { pitching: p.pitching }),
  };
}

/**
 * Module-level flag — prevents duplicate seeding attempts even if React
 * strict-mode or concurrent rendering mounts RootLayout more than once in
 * the same page-load.
 */
let _seedAttempted = false;

/**
 * Seeds the two demo teams into the custom-teams collection the first time a
 * brand-new user opens the app (empty IndexedDB).  Subsequent launches are
 * no-ops because the module-level flag prevents it from running more than once
 * per page load, and the count check ensures nothing is written when teams
 * already exist.
 */
export function useSeedDemoTeams(): void {
  React.useEffect(() => {
    if (_seedAttempted) return;
    _seedAttempted = true;

    async function seedIfEmpty() {
      const existing = await CustomTeamStore.listCustomTeams({ withRoster: false });
      if (existing.length > 0) return;

      for (const def of DEMO_TEAMS) {
        await CustomTeamStore.createCustomTeam({
          name: def.name,
          city: def.city,
          abbreviation: def.abbreviation,
          source: "generated",
          roster: {
            lineup: def.lineup.map(mapDemoPlayer),
            bench: def.bench.map(mapDemoPlayer),
            pitchers: def.pitchers.map(mapDemoPlayer),
          },
        });
      }
    }

    seedIfEmpty().catch((err) => {
      appLog.warn("useSeedDemoTeams: failed to seed demo teams", err);
    });
  }, []);
}

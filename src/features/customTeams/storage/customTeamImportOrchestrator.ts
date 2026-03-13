import { appLog } from "@shared/utils/logger";

import type { BallgameDb } from "@storage/db";
import type { CustomTeamDoc } from "@storage/types";

import { removePlayerDocs, writePlayerDocs } from "./customTeamPlayerDocs";

/**
 * Orchestrates the upsert of a single team and its player docs during an import.
 * Stores the team doc with empty embedded roster arrays (players live in the
 * `players` collection), then upserts all player docs and removes any stale ones.
 * On failure, rolls back the team upsert so no empty-roster team is left behind.
 */
export async function orchestrateTeamImport(
  db: BallgameDb,
  team: CustomTeamDoc,
  rosterSchemaVersion: number,
): Promise<void> {
  const teamDoc: CustomTeamDoc = {
    ...team,
    roster: { schemaVersion: rosterSchemaVersion, lineup: [], bench: [], pitchers: [] },
  };
  await db.customTeams.upsert(teamDoc);
  try {
    const newDocIds = await writePlayerDocs(db, team.id, team.roster);
    await removePlayerDocs(db, team.id, newDocIds);
  } catch (err) {
    await db.customTeams
      .findOne(team.id)
      .exec()
      .then((d) => d?.remove())
      .catch((rollbackErr) => {
        appLog.warn(`[importCustomTeams] rollback failed for team ${team.id}:`, rollbackErr);
      });
    throw err;
  }
}

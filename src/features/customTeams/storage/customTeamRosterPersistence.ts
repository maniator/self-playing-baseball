import type { BallgameDb } from "@storage/db";
import type { TeamRecord, TeamWithRoster } from "@storage/types";

import { assembleRoster, fetchTeamPlayers } from "./customTeamPlayerDocs";

/**
 * Populates the roster of a team from the `players` collection, returning a
 * legacy TeamWithRoster-shaped object with an assembled `roster` attached.
 */
export async function populateRoster(db: BallgameDb, team: TeamRecord): Promise<TeamWithRoster> {
  const playerDocs = await fetchTeamPlayers(db, team.id);
  const roster = assembleRoster(playerDocs);
  return { ...(team as unknown as TeamWithRoster), roster };
}

import type { BallgameDb } from "@storage/db";
import type { PlayerRecord, TeamRecord } from "@storage/types";

import { FREE_AGENT_TEAM_ID } from "./schemaV1";

export type PlayerConflictResult =
  | { status: "conflict"; conflictingTeamId: string; conflictingTeamName: string }
  | { status: "alreadyOnThisTeam" }
  | { status: "noConflict" };

/**
 * Checks whether a player (identified by globalPlayerId) already exists on
 * another team or on the target team itself.
 *
 * Returns:
 *  - `{ status: "conflict" }` when the player belongs to a different team.
 *  - `{ status: "alreadyOnThisTeam" }` when the player is already on the target team.
 *  - `{ status: "noConflict" }` when the player is not yet assigned anywhere.
 */
export async function resolvePlayerConflict(
  db: BallgameDb,
  globalPlayerId: string,
  targetTeamId: string,
): Promise<PlayerConflictResult> {
  // In v1, the player's `id` IS the globalPlayerId — look up directly.
  const matchingDoc = await db.players.findOne(globalPlayerId).exec();

  if (!matchingDoc) {
    return { status: "noConflict" };
  }

  const matchingPlayerDoc = matchingDoc.toJSON() as unknown as PlayerRecord;
  const matchingPlayerDocs = [matchingPlayerDoc];

  const conflictingMatch = matchingPlayerDocs.find(
    (doc) =>
      doc.teamId !== null &&
      doc.teamId !== undefined &&
      doc.teamId !== FREE_AGENT_TEAM_ID &&
      doc.teamId !== targetTeamId,
  );
  if (conflictingMatch) {
    const owningTeamDoc = conflictingMatch.teamId
      ? await db.teams.findOne(conflictingMatch.teamId).exec()
      : null;
    const owningTeamName =
      (owningTeamDoc?.toJSON() as unknown as TeamRecord | undefined)?.name ?? "another team";
    return {
      status: "conflict",
      conflictingTeamId: conflictingMatch.teamId ?? "",
      conflictingTeamName: owningTeamName,
    };
  }

  const alreadyOnThisTeam = matchingPlayerDoc.teamId === targetTeamId;
  if (alreadyOnThisTeam) {
    return { status: "alreadyOnThisTeam" };
  }

  return { status: "noConflict" };
}

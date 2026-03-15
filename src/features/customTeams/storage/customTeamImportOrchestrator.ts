import { appLog } from "@shared/utils/logger";

import type { BallgameDb } from "@storage/db";
import { generatePlayerId } from "@storage/generateId";
import type { CustomTeamDoc, TeamPlayer, UpdateCustomTeamInput } from "@storage/types";

import { type ImportPlayerResult } from "./customTeamExportBundles";
import { resolvePlayerConflict } from "./customTeamIdentity";
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

/**
 * Performs the cross-team identity check and roster-append for a single-player import.
 * Extracted from `CustomTeamStore.importPlayer` to keep the store method thin.
 *
 * @param db          Live DB instance (used for conflict resolution).
 * @param player      The parsed, sig-stripped player to import.
 * @param targetTeamId  ID of the team to import into.
 * @param targetTeam  Fully-hydrated target team doc (roster already populated).
 * @param section     Roster slot to append the player to.
 * @param updateFn    Callback that persists roster updates (injected to avoid coupling
 *                    this pure orchestration function to the store's `this`).
 */
export async function importPlayerIntoTeam(
  db: BallgameDb,
  player: TeamPlayer & { globalPlayerId: string },
  targetTeamId: string,
  targetTeam: CustomTeamDoc,
  section: "lineup" | "bench" | "pitchers",
  updateFn: (id: string, updates: UpdateCustomTeamInput) => Promise<void>,
): Promise<ImportPlayerResult> {
  // Cross-team identity check
  const conflictResult = await resolvePlayerConflict(db, player.globalPlayerId, targetTeamId);
  if (conflictResult.status === "conflict") {
    return {
      status: "conflict",
      conflictingTeamId: conflictResult.conflictingTeamId,
      conflictingTeamName: conflictResult.conflictingTeamName,
    };
  }
  if (conflictResult.status === "alreadyOnThisTeam") {
    return { status: "alreadyOnThisTeam" };
  }

  // Append to the target section and persist.
  const allTargetIds = new Set([
    ...targetTeam.roster.lineup.map((p) => p.id),
    ...targetTeam.roster.bench.map((p) => p.id),
    ...targetTeam.roster.pitchers.map((p) => p.id),
  ]);
  const playerToInsert: TeamPlayer = allTargetIds.has(player.id)
    ? { ...player, id: generatePlayerId() }
    : player;
  const updatedSection = [...targetTeam.roster[section], playerToInsert];
  await updateFn(targetTeamId, {
    roster: {
      lineup: section === "lineup" ? updatedSection : targetTeam.roster.lineup,
      bench: section === "bench" ? updatedSection : targetTeam.roster.bench,
      pitchers: section === "pitchers" ? updatedSection : targetTeam.roster.pitchers,
    },
  });

  return { status: "success", finalLocalId: playerToInsert.id };
}

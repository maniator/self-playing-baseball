/**
 * GameHistoryStore — persists completed-game records and player batting stats.
 *
 * Critical rules:
 *   - commitCompletedGame is idempotent: calling it multiple times with the same
 *     gameId (save ID) always writes exactly one GameDoc and one stat row per player.
 *   - Loading an already-FINAL save must NOT call this function — the caller
 *     (useGameHistorySync) is responsible for checking the save state before committing.
 *   - Export/import is idempotent: re-importing the same bundle skips existing rows.
 */
import type { BallgameDb } from "./db";
import { getDb } from "./db";
import { fnv1a } from "./hash";
import type {
  ExportedGameHistory,
  GameDoc,
  ImportGameHistoryResult,
  PlayerGameStatDoc,
} from "./types";

/** Schema version written to every new GameDoc / PlayerGameStatDoc row. */
const HISTORY_SCHEMA_VERSION = 1;

/** Signing key for game-history export bundles. */
export const GAME_HISTORY_EXPORT_KEY = "ballgame:gameHistory:v1";

type GetDb = () => Promise<BallgameDb>;

function buildStore(getDbFn: GetDb) {
  /**
   * Writes one GameDoc + N PlayerGameStatDoc rows for a completed game.
   * Safe to call multiple times — if a GameDoc with `gameId` already exists,
   * the entire commit is skipped (no stats rows are written either).
   *
   * @param gameId - the save ID (SaveDoc.id) used as the GameDoc primary key
   */
  async function commitCompletedGame(
    gameId: string,
    gameMeta: Omit<GameDoc, "id" | "schemaVersion">,
    statRows: Omit<PlayerGameStatDoc, "id" | "schemaVersion" | "createdAt">[],
  ): Promise<void> {
    const db = await getDbFn();

    // Idempotency guard: skip if game already committed.
    const existing = await db.games.findOne(gameId).exec();
    if (existing) return;

    const now = Date.now();

    const gameDoc: GameDoc = {
      id: gameId,
      ...gameMeta,
      schemaVersion: HISTORY_SCHEMA_VERSION,
    };

    const statDocs: PlayerGameStatDoc[] = statRows.map((row) => ({
      ...row,
      // Composite PK: `${gameId}:${teamId}:${playerKey}` — globally unique.
      id: `${gameId}:${row.teamId}:${row.playerKey}`,
      createdAt: now,
      schemaVersion: HISTORY_SCHEMA_VERSION,
    }));

    // Write game doc first, then stats. Both are fire-and-mostly-forget in the
    // hook, but here we surface errors to let the caller decide.
    await db.games.insert(gameDoc);
    if (statDocs.length > 0) {
      await db.playerGameStats.bulkInsert(statDocs);
    }
  }

  /**
   * Returns cumulative career batting totals for a set of playerKeys.
   * Sums across all PlayerGameStatDoc rows matching those keys.
   */
  async function getCareerStats(
    playerKeys: string[],
  ): Promise<
    Record<string, PlayerGameStatDoc["batting"] & { gamesPlayed: number; teamId: string }>
  > {
    if (playerKeys.length === 0) return {};
    const db = await getDbFn();

    const results: Record<
      string,
      PlayerGameStatDoc["batting"] & { gamesPlayed: number; teamId: string }
    > = {};

    for (const key of playerKeys) {
      const rows = await db.playerGameStats.find({ selector: { playerKey: key } }).exec();
      if (rows.length === 0) continue;
      const acc = {
        atBats: 0,
        hits: 0,
        walks: 0,
        strikeouts: 0,
        rbi: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        homers: 0,
        gamesPlayed: rows.length,
        teamId: rows[0].teamId,
      };
      for (const row of rows) {
        acc.atBats += row.batting.atBats;
        acc.hits += row.batting.hits;
        acc.walks += row.batting.walks;
        acc.strikeouts += row.batting.strikeouts;
        acc.rbi += row.batting.rbi;
        acc.singles += row.batting.singles;
        acc.doubles += row.batting.doubles;
        acc.triples += row.batting.triples;
        acc.homers += row.batting.homers;
      }
      results[key] = acc;
    }
    return results;
  }

  /** Exports all game history as a signed portable bundle. */
  async function exportGameHistory(): Promise<string> {
    const db = await getDbFn();
    const games = await db.games.find().exec();
    const stats = await db.playerGameStats.find().exec();

    const teamIds = new Set<string>();
    for (const s of stats) {
      // Only custom teams need to be present locally; stock teams are always available.
      if (s.teamId.startsWith("custom:")) teamIds.add(s.teamId);
      if (s.opponentTeamId.startsWith("custom:")) teamIds.add(s.opponentTeamId);
    }

    const payload: ExportedGameHistory["payload"] = {
      games: games.map((g) => g.toJSON() as GameDoc),
      playerGameStats: stats.map((s) => s.toJSON() as PlayerGameStatDoc),
      requiredTeamIds: Array.from(teamIds),
    };

    const sig = fnv1a(GAME_HISTORY_EXPORT_KEY + JSON.stringify(payload));

    const bundle: ExportedGameHistory = {
      type: "gameHistory",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      payload,
      sig,
    };

    return JSON.stringify(bundle, null, 2);
  }

  /**
   * Imports a signed game-history bundle.
   * - Validates signature and format version.
   * - Validates that all required team IDs exist locally.
   * - Merges idempotently: skips any game or stat row whose ID already exists.
   */
  async function importGameHistory(
    json: string,
    existingTeamIds: Set<string>,
  ): Promise<ImportGameHistoryResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error("Invalid JSON in game history bundle.");
    }

    const bundle = parsed as Partial<ExportedGameHistory>;
    if (bundle.type !== "gameHistory") {
      throw new Error(`Unexpected bundle type: ${String(bundle.type ?? "(none)")}`);
    }
    if (bundle.formatVersion !== 1) {
      throw new Error(`Unsupported game history format version: ${String(bundle.formatVersion)}`);
    }
    if (!bundle.payload || typeof bundle.payload !== "object") {
      throw new Error("Game history bundle is missing payload.");
    }

    // Verify signature.
    const expectedSig = fnv1a(GAME_HISTORY_EXPORT_KEY + JSON.stringify(bundle.payload));
    if (bundle.sig !== expectedSig) {
      throw new Error(
        "Game history bundle signature is invalid. The file may have been tampered with.",
      );
    }

    // Validate required teams — only custom: team IDs need local validation;
    // stock (non-custom) teams are always available.
    const requiredTeamIds = (bundle.payload.requiredTeamIds ?? []).filter((id) =>
      id.startsWith("custom:"),
    );
    const missingTeamIds = requiredTeamIds.filter((id) => !existingTeamIds.has(id));
    if (missingTeamIds.length > 0) {
      throw new Error(
        `Cannot import game history: the following teams are missing from your local install. ` +
          `Please import those teams first, then re-import this history bundle.\n` +
          `Missing team IDs: ${missingTeamIds.join(", ")}`,
      );
    }

    const db = await getDbFn();
    const now = Date.now();

    const games = bundle.payload.games ?? [];
    const stats = bundle.payload.playerGameStats ?? [];

    let gamesCreated = 0;
    let gamesSkipped = 0;
    let statsCreated = 0;
    let statsSkipped = 0;

    for (const game of games) {
      const existing = await db.games.findOne(game.id).exec();
      if (existing) {
        gamesSkipped++;
        continue;
      }
      await db.games.insert({ ...game, schemaVersion: HISTORY_SCHEMA_VERSION });
      gamesCreated++;
    }

    for (const stat of stats) {
      const existing = await db.playerGameStats.findOne(stat.id).exec();
      if (existing) {
        statsSkipped++;
        continue;
      }
      await db.playerGameStats.insert({
        ...stat,
        createdAt: stat.createdAt ?? now,
        schemaVersion: HISTORY_SCHEMA_VERSION,
      });
      statsCreated++;
    }

    return { gamesCreated, gamesSkipped, statsCreated, statsSkipped };
  }

  return { commitCompletedGame, getCareerStats, exportGameHistory, importGameHistory };
}

/** Default GameHistoryStore backed by the IndexedDB singleton. */
export const GameHistoryStore = buildStore(getDb);

/**
 * Factory for creating a GameHistoryStore with a custom db getter — useful for tests.
 */
export const makeGameHistoryStore = (getDbFn: GetDb) => buildStore(getDbFn);

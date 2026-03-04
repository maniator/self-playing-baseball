/**
 * GameHistoryStore — persists completed-game records and player batting stats.
 *
 * Critical rules:
 *   - commitCompletedGame is idempotent: calling it multiple times with the same
 *     gameInstanceId always writes exactly one GameDoc and one stat row per player.
 *     If the GameDoc already exists (concurrent insert or prior partial write),
 *     any missing stat rows are still written so no stats are permanently lost.
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

/** Returns true when an RxDB error is a primary-key conflict (concurrent insert). */
function isConflictError(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as { code?: string }).code === "CONFLICT");
}

type GetDb = () => Promise<BallgameDb>;

function buildStore(getDbFn: GetDb) {
  /**
   * Writes one GameDoc + N PlayerGameStatDoc rows for a completed game.
   * Fully idempotent at both the game and stat-row level:
   *   - If a GameDoc with `gameInstanceId` already exists, any missing stat rows
   *     are still written (so a partial write followed by a retry never loses stats).
   *   - Concurrent inserts of the same GameDoc are handled by treating the CONFLICT
   *     error as "already committed" and falling through to the stat-row check.
   *
   * @param gameInstanceId - stable game identity key (State.gameInstanceId, with
   *   legacy fallback to saveId for pre-gameInstanceId saves). Used as GameDoc.id
   *   and as the prefix for PlayerGameStatDoc ids.
   */
  async function commitCompletedGame(
    gameInstanceId: string,
    gameMeta: Omit<GameDoc, "id" | "schemaVersion">,
    statRows: Omit<PlayerGameStatDoc, "id" | "schemaVersion" | "createdAt">[],
  ): Promise<void> {
    const db = await getDbFn();

    // Idempotency guard: skip GameDoc insert if already committed, but always
    // fall through to write any missing stat rows (so a partial write on a
    // prior attempt does not permanently block stat rows from being written).
    const existing = await db.games.findOne(gameInstanceId).exec();

    if (!existing) {
      const gameDoc: GameDoc = {
        id: gameInstanceId,
        ...gameMeta,
        schemaVersion: HISTORY_SCHEMA_VERSION,
      };

      try {
        await db.games.insert(gameDoc);
      } catch (err) {
        // Idempotency under concurrency: if another tab/session inserted this game
        // first, treat the conflict as "already committed" and fall through to
        // write any missing stat rows below.
        if (!isConflictError(err)) {
          throw err;
        }
      }
    }

    if (statRows.length === 0) return;

    const now = Date.now();
    const statDocs: PlayerGameStatDoc[] = statRows.map((row) => ({
      ...row,
      // Composite PK: `${gameInstanceId}:${teamId}:${playerKey}` — globally unique.
      id: `${gameInstanceId}:${row.teamId}:${row.playerKey}`,
      createdAt: now,
      schemaVersion: HISTORY_SCHEMA_VERSION,
    }));

    // Prefetch existing stat IDs to only insert missing rows — makes retries safe.
    const statIds = statDocs.map((s) => s.id);
    const existingStatDocs = await db.playerGameStats.findByIds(statIds).exec();
    const existingStatIds = new Set(existingStatDocs.keys());
    const missingStats = statDocs.filter((s) => !existingStatIds.has(s.id));

    if (missingStats.length > 0) {
      await db.playerGameStats.bulkInsert(missingStats);
    }
  }

  /**
   * Returns cumulative career batting totals for a set of playerKeys.
   * Performs a single bulk query and aggregates in memory.
   */
  async function getCareerStats(
    playerKeys: string[],
  ): Promise<
    Record<string, PlayerGameStatDoc["batting"] & { gamesPlayed: number; teamId: string }>
  > {
    if (playerKeys.length === 0) return {};
    const db = await getDbFn();

    // Single bulk query for all matching playerKeys — avoids N+1 round-trips.
    const allRows = await db.playerGameStats
      .find({ selector: { playerKey: { $in: playerKeys } } })
      .exec();

    const results: Record<
      string,
      PlayerGameStatDoc["batting"] & { gamesPlayed: number; teamId: string }
    > = {};

    for (const row of allRows) {
      const doc = row.toJSON() as PlayerGameStatDoc;
      const existing = results[doc.playerKey];
      if (!existing) {
        results[doc.playerKey] = {
          atBats: doc.batting.atBats,
          hits: doc.batting.hits,
          walks: doc.batting.walks,
          strikeouts: doc.batting.strikeouts,
          rbi: doc.batting.rbi,
          singles: doc.batting.singles,
          doubles: doc.batting.doubles,
          triples: doc.batting.triples,
          homers: doc.batting.homers,
          gamesPlayed: 1,
          teamId: doc.teamId,
        };
      } else {
        existing.atBats += doc.batting.atBats;
        existing.hits += doc.batting.hits;
        existing.walks += doc.batting.walks;
        existing.strikeouts += doc.batting.strikeouts;
        existing.rbi += doc.batting.rbi;
        existing.singles += doc.batting.singles;
        existing.doubles += doc.batting.doubles;
        existing.triples += doc.batting.triples;
        existing.homers += doc.batting.homers;
        existing.gamesPlayed++;
      }
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

    // Prefetch existing game IDs in a single query, then bulk-insert the remainder.
    const gameIds = games.map((g) => g.id);
    const existingGameDocs =
      gameIds.length > 0 ? await db.games.findByIds(gameIds).exec() : new Map();
    const existingGameIds = new Set(existingGameDocs.keys());
    const gamesToInsert = games.filter((g) => !existingGameIds.has(g.id));

    let gamesCreated = 0;
    const gamesSkipped = existingGameIds.size;

    if (gamesToInsert.length > 0) {
      const result = await db.games.bulkInsert(
        gamesToInsert.map((g) => ({ ...g, schemaVersion: HISTORY_SCHEMA_VERSION })),
      );
      gamesCreated = result.success.length;
    }

    // Prefetch existing stat IDs in a single query, then bulk-insert the remainder.
    const statIds = stats.map((s) => s.id);
    const existingStatDocs =
      statIds.length > 0 ? await db.playerGameStats.findByIds(statIds).exec() : new Map();
    const existingStatIds = new Set(existingStatDocs.keys());
    const statsToInsert = stats.filter((s) => !existingStatIds.has(s.id));

    let statsCreated = 0;
    const statsSkipped = existingStatIds.size;

    if (statsToInsert.length > 0) {
      const result = await db.playerGameStats.bulkInsert(
        statsToInsert.map((s) => ({
          ...s,
          createdAt: s.createdAt ?? now,
          schemaVersion: HISTORY_SCHEMA_VERSION,
        })),
      );
      statsCreated = result.success.length;
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

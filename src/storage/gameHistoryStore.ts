/**
 * GameHistoryStore — persists completed-game records, batting stats, and pitcher stats.
 *
 * Critical rules:
 *   - commitCompletedGame is idempotent: calling it multiple times with the same
 *     gameInstanceId always writes exactly one GameDoc and one stat row per player/pitcher.
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
  BattingLeader,
  ExportedGameHistory,
  GameDoc,
  ImportGameHistoryResult,
  PitcherGameStatDoc,
  PitchingLeader,
  PlayerGameStatDoc,
  TeamCareerSummary,
} from "./types";

/** Schema version written to every new GameDoc / stat row. */
const HISTORY_SCHEMA_VERSION = 1;

/** Signing key for game-history export bundles. */
export const GAME_HISTORY_EXPORT_KEY = "ballgame:gameHistory:v1";

/** Returns true when an RxDB error is a primary-key conflict (concurrent insert). */
function isConflictError(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as { code?: string }).code === "CONFLICT");
}

type GetDb = () => Promise<BallgameDb>;

/** Batting stats row type returned by `getTeamCareerBattingStats`. */
export type TeamBattingStatsRow = PlayerGameStatDoc["batting"] & {
  playerKey: string;
  nameAtGameTime: string;
  gamesPlayed: number;
};

/** Pitching stats row type returned by `getTeamCareerPitchingStats`. */
export type TeamPitchingStatsRow = Omit<
  PitcherGameStatDoc,
  "id" | "gameId" | "teamId" | "opponentTeamId" | "pitcherId" | "createdAt" | "schemaVersion"
> & { gamesPlayed: number };

function buildStore(getDbFn: GetDb) {
  /**
   * Writes one GameDoc + N PlayerGameStatDoc rows + M PitcherGameStatDoc rows for a completed game.
   * Fully idempotent at the game, batting-stat, and pitcher-stat row level.
   */
  async function commitCompletedGame(
    gameInstanceId: string,
    gameMeta: Omit<GameDoc, "id" | "schemaVersion">,
    statRows: Omit<PlayerGameStatDoc, "id" | "schemaVersion" | "createdAt">[],
    pitcherRows: Omit<PitcherGameStatDoc, "id" | "schemaVersion" | "createdAt">[] = [],
  ): Promise<void> {
    const db = await getDbFn();

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
        if (!isConflictError(err)) {
          throw err;
        }
      }
    }

    const now = Date.now();

    // Write batting stat rows.
    if (statRows.length > 0) {
      const statDocs: PlayerGameStatDoc[] = statRows.map((row) => ({
        ...row,
        id: `${gameInstanceId}:${row.teamId}:${row.playerKey}`,
        createdAt: now,
        schemaVersion: HISTORY_SCHEMA_VERSION,
      }));

      const statIds = statDocs.map((s) => s.id);
      const existingStatDocs = await db.playerGameStats.findByIds(statIds).exec();
      const existingStatIds = new Set(existingStatDocs.keys());
      const missingStats = statDocs.filter((s) => !existingStatIds.has(s.id));

      if (missingStats.length > 0) {
        await db.playerGameStats.bulkInsert(missingStats);
      }
    }

    // Write pitcher stat rows.
    if (pitcherRows.length > 0) {
      const pitcherDocs: PitcherGameStatDoc[] = pitcherRows.map((row) => ({
        ...row,
        id: `${gameInstanceId}:${row.teamId}:${row.pitcherKey}`,
        createdAt: now,
        schemaVersion: HISTORY_SCHEMA_VERSION,
      }));

      const pitcherIds = pitcherDocs.map((p) => p.id);
      const existingPitcherDocs = await db.pitcherGameStats.findByIds(pitcherIds).exec();
      const existingPitcherIds = new Set(existingPitcherDocs.keys());
      const missingPitchers = pitcherDocs.filter((p) => !existingPitcherIds.has(p.id));

      if (missingPitchers.length > 0) {
        await db.pitcherGameStats.bulkInsert(missingPitchers);
      }
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

  /**
   * Returns all batting stat rows for a single playerKey, ordered by createdAt ascending.
   * Used for the player career page game-by-game log.
   */
  async function getPlayerCareerBatting(playerKey: string): Promise<PlayerGameStatDoc[]> {
    const db = await getDbFn();
    const rows = await db.playerGameStats
      .find({ selector: { playerKey }, sort: [{ createdAt: "asc" }] })
      .exec();
    return rows.map((r) => r.toJSON() as PlayerGameStatDoc);
  }

  /**
   * Returns all pitching stat rows for a single pitcherKey, ordered by createdAt ascending.
   * Used for the player career page game-by-game log.
   */
  async function getPlayerCareerPitching(pitcherKey: string): Promise<PitcherGameStatDoc[]> {
    const db = await getDbFn();
    const rows = await db.pitcherGameStats
      .find({ selector: { pitcherKey }, sort: [{ createdAt: "asc" }] })
      .exec();
    return rows.map((r) => r.toJSON() as PitcherGameStatDoc);
  }

  /**
   * Returns cumulative career batting stats for all players associated with a team.
   * Queries by teamId.
   */
  async function getTeamCareerBattingStats(teamId: string): Promise<TeamBattingStatsRow[]> {
    const db = await getDbFn();
    const rows = await db.playerGameStats.find({ selector: { teamId } }).exec();

    const aggregated: Record<string, TeamBattingStatsRow> = {};

    for (const row of rows) {
      const doc = row.toJSON() as PlayerGameStatDoc;
      const key = doc.playerKey;
      if (!aggregated[key]) {
        aggregated[key] = {
          playerKey: key,
          nameAtGameTime: doc.nameAtGameTime,
          gamesPlayed: 0,
          atBats: 0,
          hits: 0,
          walks: 0,
          strikeouts: 0,
          rbi: 0,
          singles: 0,
          doubles: 0,
          triples: 0,
          homers: 0,
        };
      }
      const agg = aggregated[key];
      agg.gamesPlayed++;
      agg.atBats += doc.batting.atBats;
      agg.hits += doc.batting.hits;
      agg.walks += doc.batting.walks;
      agg.strikeouts += doc.batting.strikeouts;
      agg.rbi += doc.batting.rbi;
      agg.singles += doc.batting.singles;
      agg.doubles += doc.batting.doubles;
      agg.triples += doc.batting.triples;
      agg.homers += doc.batting.homers;
    }

    return Object.values(aggregated);
  }

  /**
   * Returns cumulative career pitching stats for all pitchers associated with a team.
   * Queries by teamId.
   */
  async function getTeamCareerPitchingStats(teamId: string): Promise<TeamPitchingStatsRow[]> {
    const db = await getDbFn();
    const rows = await db.pitcherGameStats.find({ selector: { teamId } }).exec();

    const aggregated: Record<string, TeamPitchingStatsRow> = {};

    for (const row of rows) {
      const doc = row.toJSON() as PitcherGameStatDoc;
      const key = doc.pitcherKey;
      if (!aggregated[key]) {
        aggregated[key] = {
          pitcherKey: key,
          nameAtGameTime: doc.nameAtGameTime,
          gamesPlayed: 0,
          outsPitched: 0,
          battersFaced: 0,
          hitsAllowed: 0,
          walksAllowed: 0,
          strikeoutsRecorded: 0,
          homersAllowed: 0,
          runsAllowed: 0,
          earnedRuns: 0,
          saves: 0,
          holds: 0,
          blownSaves: 0,
        };
      }
      const agg = aggregated[key];
      agg.gamesPlayed++;
      agg.outsPitched += doc.outsPitched;
      agg.battersFaced += doc.battersFaced;
      agg.hitsAllowed += doc.hitsAllowed;
      agg.walksAllowed += doc.walksAllowed;
      agg.strikeoutsRecorded += doc.strikeoutsRecorded;
      agg.homersAllowed += doc.homersAllowed;
      agg.runsAllowed += doc.runsAllowed;
      agg.earnedRuns += doc.earnedRuns;
      agg.saves += doc.saves;
      agg.holds += doc.holds;
      agg.blownSaves += doc.blownSaves;
    }

    return Object.values(aggregated);
  }

  /** Exports all game history (batting + pitching) as a signed portable bundle. */
  async function exportGameHistory(): Promise<string> {
    const db = await getDbFn();
    const games = await db.games.find().exec();
    const stats = await db.playerGameStats.find().exec();
    const pitcherStats = await db.pitcherGameStats.find().exec();

    const teamIds = new Set<string>();
    for (const s of stats) {
      if (s.teamId.startsWith("custom:")) teamIds.add(s.teamId);
      if (s.opponentTeamId.startsWith("custom:")) teamIds.add(s.opponentTeamId);
    }
    for (const s of pitcherStats) {
      if (s.teamId.startsWith("custom:")) teamIds.add(s.teamId);
      if (s.opponentTeamId.startsWith("custom:")) teamIds.add(s.opponentTeamId);
    }

    const payload: ExportedGameHistory["payload"] = {
      games: games.map((g) => g.toJSON() as GameDoc),
      playerGameStats: stats.map((s) => s.toJSON() as PlayerGameStatDoc),
      pitcherGameStats: pitcherStats.map((s) => s.toJSON() as PitcherGameStatDoc),
      requiredTeamIds: Array.from(teamIds),
    };

    const sig = fnv1a(GAME_HISTORY_EXPORT_KEY + JSON.stringify(payload));

    const bundle: ExportedGameHistory = {
      type: "gameHistory",
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      payload,
      sig,
    };

    return JSON.stringify(bundle, null, 2);
  }

  /**
   * Imports a signed game-history bundle.
   * - Validates signature and format version (accepts v1 and v2).
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
    if (bundle.formatVersion !== 1 && bundle.formatVersion !== 2) {
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
    const pitcherStats = bundle.payload.pitcherGameStats ?? [];

    // Games.
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

    // Batting stats.
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

    // Pitcher stats.
    const pitcherIds = pitcherStats.map((p) => p.id);
    const existingPitcherDocs =
      pitcherIds.length > 0 ? await db.pitcherGameStats.findByIds(pitcherIds).exec() : new Map();
    const existingPitcherIds = new Set(existingPitcherDocs.keys());
    const pitchersToInsert = pitcherStats.filter((p) => !existingPitcherIds.has(p.id));

    let pitcherStatsCreated = 0;
    const pitcherStatsSkipped = existingPitcherIds.size;

    if (pitchersToInsert.length > 0) {
      const result = await db.pitcherGameStats.bulkInsert(
        pitchersToInsert.map((p) => ({
          ...p,
          createdAt: p.createdAt ?? now,
          schemaVersion: HISTORY_SCHEMA_VERSION,
        })),
      );
      pitcherStatsCreated = result.success.length;
    }

    return {
      gamesCreated,
      gamesSkipped,
      statsCreated,
      statsSkipped,
      pitcherStatsCreated,
      pitcherStatsSkipped,
    };
  }

  /**
   * Returns aggregate career team stats from completed games (W/L/T, RS/RA, streak, last10).
   * Games are computed by matching teamId against homeTeamId or awayTeamId.
   * Tied games (rs === ra) are tracked separately and excluded from win-percentage calculation.
   */
  async function getTeamCareerSummary(teamId: string): Promise<TeamCareerSummary> {
    const db = await getDbFn();
    const rows = await db.games
      .find({
        selector: { $or: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
        sort: [{ playedAt: "asc" }],
      })
      .exec();

    const docs = rows.map((r) => r.toJSON() as GameDoc);

    let wins = 0;
    let losses = 0;
    let ties = 0;
    let runsScored = 0;
    let runsAllowed = 0;

    // Track each game's result ("W", "L", or "T") in chronological order.
    const gameResults: ("W" | "L" | "T")[] = [];

    for (const doc of docs) {
      const isHome = doc.homeTeamId === teamId;
      const rs = isHome ? doc.homeScore : doc.awayScore;
      const ra = isHome ? doc.awayScore : doc.homeScore;
      runsScored += rs;
      runsAllowed += ra;
      if (rs > ra) {
        wins++;
        gameResults.push("W");
      } else if (rs < ra) {
        losses++;
        gameResults.push("L");
      } else {
        ties++;
        gameResults.push("T");
      }
    }

    const gamesPlayed = wins + losses + ties;
    // Win % excludes tied games (standard baseball convention).
    const decidedGames = wins + losses;
    const winPct = decidedGames === 0 ? 0 : wins / decidedGames;
    const runDiff = runsScored - runsAllowed;
    const rsPerGame = gamesPlayed === 0 ? 0 : runsScored / gamesPlayed;
    const raPerGame = gamesPlayed === 0 ? 0 : runsAllowed / gamesPlayed;

    // Compute current streak from the end of the gameResults array.
    let streak = "-";
    if (gameResults.length > 0) {
      const last = gameResults[gameResults.length - 1];
      let count = 0;
      for (let i = gameResults.length - 1; i >= 0 && gameResults[i] === last; i--) count++;
      streak = last + count;
    }

    // Compute last-10 record.
    const last10Games = gameResults.slice(-10);
    const last10Wins = last10Games.filter((r) => r === "W").length;
    const last10Losses = last10Games.filter((r) => r === "L").length;
    const last10Ties = last10Games.filter((r) => r === "T").length;

    return {
      gamesPlayed,
      wins,
      losses,
      ties,
      winPct,
      runsScored,
      runsAllowed,
      runDiff,
      rsPerGame,
      raPerGame,
      streak,
      last10: { wins: last10Wins, losses: last10Losses, ties: last10Ties },
    };
  }

  /**
   * Returns batting leaders (HR, AVG, RBI) for a team.
   * Players below the AB threshold are excluded from the AVG leader calculation.
   * Tie-breaking: value desc, then gamesPlayed desc, then name asc.
   *
   * Pass `options.rows` (pre-fetched from `getTeamCareerBattingStats`) to skip
   * a redundant DB query when the caller already has the rows.
   */
  async function getTeamBattingLeaders(
    teamId: string,
    options: {
      minAbForAvg?: number;
      rows?: TeamBattingStatsRow[];
    } = {},
  ): Promise<{
    hrLeader: BattingLeader | null;
    avgLeader: BattingLeader | null;
    rbiLeader: BattingLeader | null;
  }> {
    const minAb = options.minAbForAvg ?? MIN_AB_FOR_AVG_LEADER;
    const rows = options.rows ?? (await getTeamCareerBattingStats(teamId));

    const pickLeader = (
      candidates: TeamBattingStatsRow[],
      valueFn: (r: TeamBattingStatsRow) => number,
    ): BattingLeader | null => {
      if (candidates.length === 0) return null;
      const sorted = [...candidates].sort((a, b) => {
        const diff = valueFn(b) - valueFn(a);
        if (diff !== 0) return diff;
        const gDiff = b.gamesPlayed - a.gamesPlayed;
        if (gDiff !== 0) return gDiff;
        return a.nameAtGameTime.localeCompare(b.nameAtGameTime, "en");
      });
      const top = sorted[0];
      return {
        playerKey: top.playerKey,
        nameAtGameTime: top.nameAtGameTime,
        value: valueFn(top),
        gamesPlayed: top.gamesPlayed,
      };
    };

    const hrLeader = pickLeader(rows, (r) => r.homers);
    const rbiLeader = pickLeader(rows, (r) => r.rbi);
    const avgCandidates = rows.filter((r) => r.atBats >= minAb);
    const avgLeader = pickLeader(avgCandidates, (r) => (r.atBats === 0 ? 0 : r.hits / r.atBats));

    return { hrLeader, avgLeader, rbiLeader };
  }

  /**
   * Returns pitching leaders (ERA, SV, K) for a team.
   * Players below the outs threshold are excluded from the ERA leader calculation.
   * Tie-breaking: value desc (ERA: asc), then gamesPlayed desc, then name asc.
   *
   * Pass `options.rows` (pre-fetched from `getTeamCareerPitchingStats`) to skip
   * a redundant DB query when the caller already has the rows.
   */
  async function getTeamPitchingLeaders(
    teamId: string,
    options: {
      minOutsForEra?: number;
      rows?: TeamPitchingStatsRow[];
    } = {},
  ): Promise<{
    eraLeader: PitchingLeader | null;
    savesLeader: PitchingLeader | null;
    strikeoutsLeader: PitchingLeader | null;
  }> {
    const minOuts = options.minOutsForEra ?? MIN_OUTS_FOR_ERA_LEADER;
    const rows = options.rows ?? (await getTeamCareerPitchingStats(teamId));

    const pickPitchingLeader = (
      candidates: TeamPitchingStatsRow[],
      valueFn: (r: TeamPitchingStatsRow) => number,
      sortAsc = false,
    ): PitchingLeader | null => {
      if (candidates.length === 0) return null;
      const sorted = [...candidates].sort((a, b) => {
        const aVal = valueFn(a);
        const bVal = valueFn(b);
        const diff = sortAsc ? aVal - bVal : bVal - aVal;
        if (diff !== 0) return diff;
        const gDiff = b.gamesPlayed - a.gamesPlayed;
        if (gDiff !== 0) return gDiff;
        return a.nameAtGameTime.localeCompare(b.nameAtGameTime, "en");
      });
      const top = sorted[0];
      return {
        pitcherKey: top.pitcherKey,
        nameAtGameTime: top.nameAtGameTime,
        value: valueFn(top),
        gamesPlayed: top.gamesPlayed,
      };
    };

    const eraCandidates = rows.filter((r) => r.outsPitched >= minOuts);
    const eraLeader = pickPitchingLeader(
      eraCandidates,
      // ERA formula: (earnedRuns * 27) / outsPitched — this is equivalent to the
      // standard baseball formula (earnedRuns * 9) / IP because 3 outs = 1 IP.
      // Using outs directly avoids a division then multiplication by 3.
      // Mirrors computeERA in computePitcherGameStats.ts.
      (r) => (r.outsPitched === 0 ? Infinity : (r.earnedRuns * 27) / r.outsPitched),
      true, // lower ERA is better
    );
    const savesLeader = pickPitchingLeader(rows, (r) => r.saves);
    const strikeoutsLeader = pickPitchingLeader(rows, (r) => r.strikeoutsRecorded);

    return { eraLeader, savesLeader, strikeoutsLeader };
  }

  return {
    commitCompletedGame,
    getCareerStats,
    getPlayerCareerBatting,
    getPlayerCareerPitching,
    getTeamCareerBattingStats,
    getTeamCareerPitchingStats,
    getTeamCareerSummary,
    getTeamBattingLeaders,
    getTeamPitchingLeaders,
    exportGameHistory,
    importGameHistory,
  };
}

/** Minimum AB required for a player to qualify as the AVG leader. */
export const MIN_AB_FOR_AVG_LEADER = 20;
/** Minimum outs pitched required for a player to qualify as the ERA leader (30 outs = 10.0 IP). */
export const MIN_OUTS_FOR_ERA_LEADER = 30;

/** Default GameHistoryStore backed by the IndexedDB singleton. */
export const GameHistoryStore = buildStore(getDb);

/**
 * Factory for creating a GameHistoryStore with a custom db getter — useful for tests.
 */
export const makeGameHistoryStore = (getDbFn: GetDb) => buildStore(getDbFn);

import "fake-indexeddb/auto";

import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { _createTestDb, type BallgameDb } from "./db";
import { makeGameHistoryStore } from "./gameHistoryStore";
import type { GameDoc, PitcherGameStatDoc, PlayerGameStatDoc } from "./types";

let db: BallgameDb;
let store: ReturnType<typeof makeGameHistoryStore>;

beforeEach(async () => {
  db = await _createTestDb(getRxStorageMemory());
  store = makeGameHistoryStore(() => Promise.resolve(db));
});

afterEach(async () => {
  await db.close();
});

const gameMeta: Omit<GameDoc, "id" | "schemaVersion"> = {
  playedAt: Date.now(),
  seed: "abc123",
  rngState: 42,
  homeTeamId: "Yankees",
  awayTeamId: "Mets",
  homeScore: 5,
  awayScore: 3,
  innings: 9,
};

const makeStatRow = (
  gameId: string,
  playerId: string,
): Omit<PlayerGameStatDoc, "id" | "schemaVersion" | "createdAt"> => ({
  gameId,
  teamId: "Yankees",
  opponentTeamId: "Mets",
  playerKey: `Yankees:${playerId}`,
  playerId,
  nameAtGameTime: "Test Player",
  role: "batter",
  batting: {
    atBats: 4,
    hits: 2,
    walks: 0,
    strikeouts: 1,
    rbi: 1,
    singles: 1,
    doubles: 1,
    triples: 0,
    homers: 0,
  },
});

describe("GameHistoryStore.commitCompletedGame", () => {
  it("writes a GameDoc and stat rows on first call", async () => {
    await store.commitCompletedGame("game_001", gameMeta, [makeStatRow("game_001", "p1")]);

    const game = await db.games.findOne("game_001").exec();
    expect(game).not.toBeNull();
    expect(game?.homeScore).toBe(5);
    expect(game?.awayScore).toBe(3);
    expect(game?.innings).toBe(9);

    const stat = await db.playerGameStats.findOne("game_001:Yankees:Yankees:p1").exec();
    expect(stat).not.toBeNull();
    expect(stat?.batting.hits).toBe(2);
  });

  it("is idempotent — calling twice does not create duplicate rows", async () => {
    await store.commitCompletedGame("game_002", gameMeta, [makeStatRow("game_002", "p1")]);
    // Second call with same gameId should be a no-op
    await store.commitCompletedGame("game_002", gameMeta, [makeStatRow("game_002", "p1")]);

    const games = await db.games.find().exec();
    expect(games.length).toBe(1);

    const stats = await db.playerGameStats.find().exec();
    expect(stats.length).toBe(1);
  });

  it("writes separate docs for different games", async () => {
    await store.commitCompletedGame("game_003a", gameMeta, [makeStatRow("game_003a", "p1")]);
    await store.commitCompletedGame("game_003b", gameMeta, [makeStatRow("game_003b", "p1")]);

    const games = await db.games.find().exec();
    expect(games.length).toBe(2);
  });

  it("handles zero stat rows gracefully", async () => {
    await store.commitCompletedGame("game_004", gameMeta, []);
    const game = await db.games.findOne("game_004").exec();
    expect(game).not.toBeNull();
    const stats = await db.playerGameStats.find().exec();
    expect(stats.length).toBe(0);
  });
});

describe("GameHistoryStore.getCareerStats", () => {
  it("returns empty object when no history exists", async () => {
    const result = await store.getCareerStats(["Yankees:p1"]);
    expect(result).toEqual({});
  });

  it("sums batting stats across multiple games", async () => {
    await store.commitCompletedGame("game_c1", gameMeta, [makeStatRow("game_c1", "p1")]);
    await store.commitCompletedGame("game_c2", gameMeta, [makeStatRow("game_c2", "p1")]);

    const result = await store.getCareerStats(["Yankees:p1"]);
    expect(result["Yankees:p1"]).toBeDefined();
    expect(result["Yankees:p1"].hits).toBe(4); // 2 + 2
    expect(result["Yankees:p1"].atBats).toBe(8); // 4 + 4
    expect(result["Yankees:p1"].gamesPlayed).toBe(2);
  });

  it("returns empty for player keys with no rows", async () => {
    const result = await store.getCareerStats(["Yankees:nobody"]);
    expect(result["Yankees:nobody"]).toBeUndefined();
  });
});

describe("GameHistoryStore export/import", () => {
  it("exports and re-imports history (idempotent)", async () => {
    await store.commitCompletedGame("game_e1", gameMeta, [makeStatRow("game_e1", "p1")]);

    const json = await store.exportGameHistory();
    expect(json).toContain("gameHistory");
    expect(json).toContain("game_e1");

    // Team IDs referenced by the stats
    const existingTeamIds = new Set(["Yankees", "Mets"]);

    const result1 = await store.importGameHistory(json, existingTeamIds);
    expect(result1.gamesSkipped).toBe(1); // game_e1 already exists
    expect(result1.statsSkipped).toBe(1);
    expect(result1.gamesCreated).toBe(0);

    // Re-import should still skip
    const result2 = await store.importGameHistory(json, existingTeamIds);
    expect(result2.gamesSkipped).toBe(1);
  });

  it("imports new games from bundle", async () => {
    // Build a bundle manually
    const { fnv1a } = await import("./hash");
    const { GAME_HISTORY_EXPORT_KEY } = await import("./gameHistoryStore");
    const gameDoc: GameDoc = {
      id: "game_import_1",
      playedAt: Date.now(),
      seed: "xyz",
      rngState: null,
      homeTeamId: "Yankees",
      awayTeamId: "Mets",
      homeScore: 2,
      awayScore: 1,
      innings: 9,
      schemaVersion: 1,
    };
    const payload = {
      games: [gameDoc],
      playerGameStats: [],
      requiredTeamIds: ["Yankees", "Mets"],
    };
    const sig = fnv1a(GAME_HISTORY_EXPORT_KEY + JSON.stringify(payload));
    const bundle = JSON.stringify({
      type: "gameHistory",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      payload,
      sig,
    });

    const result = await store.importGameHistory(bundle, new Set(["Yankees", "Mets"]));
    expect(result.gamesCreated).toBe(1);
    expect(result.gamesSkipped).toBe(0);

    const game = await db.games.findOne("game_import_1").exec();
    expect(game).not.toBeNull();
  });

  it("rejects bundles with missing custom team IDs", async () => {
    const { fnv1a } = await import("./hash");
    const { GAME_HISTORY_EXPORT_KEY } = await import("./gameHistoryStore");
    const payload = {
      games: [],
      playerGameStats: [],
      // Only custom: team IDs are validated; stock teams always pass.
      requiredTeamIds: ["custom:ct_missingteam"],
    };
    const sig = fnv1a(GAME_HISTORY_EXPORT_KEY + JSON.stringify(payload));
    const bundle = JSON.stringify({
      type: "gameHistory",
      formatVersion: 1,
      exportedAt: "x",
      payload,
      sig,
    });

    await expect(store.importGameHistory(bundle, new Set())).rejects.toThrow(
      "Cannot import game history",
    );
  });

  it("rejects tampered bundles", async () => {
    const bundle = JSON.stringify({
      type: "gameHistory",
      formatVersion: 1,
      exportedAt: "x",
      payload: { games: [], playerGameStats: [], requiredTeamIds: [] },
      sig: "00000000",
    });
    await expect(store.importGameHistory(bundle, new Set())).rejects.toThrow(
      "signature is invalid",
    );
  });

  it("rejects unknown format versions", async () => {
    const bundle = JSON.stringify({ type: "gameHistory", formatVersion: 99, payload: {} });
    await expect(store.importGameHistory(bundle, new Set())).rejects.toThrow(
      "Unsupported game history format version",
    );
  });

  it("rejects wrong bundle types", async () => {
    const bundle = JSON.stringify({ type: "customTeams", formatVersion: 1, payload: {} });
    await expect(store.importGameHistory(bundle, new Set())).rejects.toThrow(
      "Unexpected bundle type",
    );
  });

  it("rejects invalid JSON", async () => {
    await expect(store.importGameHistory("not json {}", new Set())).rejects.toThrow("Invalid JSON");
  });
});

describe("GameHistoryStore — gameInstanceId deduplication across save slots", () => {
  it("finishing the same game from two different save slots writes only one GameDoc", async () => {
    // Two save slots (saveA, saveB) represent mid-game snapshots of the SAME game run.
    // Both carry the same gameInstanceId.
    const sharedGameInstanceId = "game_instance_shared";
    const saveIdA = "save_slot_a";
    const saveIdB = "save_slot_b";

    // Slot A finishes first.
    await store.commitCompletedGame(
      sharedGameInstanceId,
      { ...gameMeta, committedBySaveId: saveIdA },
      [makeStatRow(sharedGameInstanceId, "p1")],
    );

    // Slot B finishes the same game (same gameInstanceId). Should be a no-op.
    await store.commitCompletedGame(
      sharedGameInstanceId,
      { ...gameMeta, committedBySaveId: saveIdB },
      [makeStatRow(sharedGameInstanceId, "p1")],
    );

    const allGames = await db.games.find().exec();
    expect(allGames.length).toBe(1);
    expect(allGames[0].committedBySaveId).toBe(saveIdA); // first commit wins

    const allStats = await db.playerGameStats.find().exec();
    expect(allStats.length).toBe(1); // no duplicate stat row

    // Career totals should reflect exactly one game's worth of stats.
    const career = await store.getCareerStats(["Yankees:p1"]);
    expect(career["Yankees:p1"].gamesPlayed).toBe(1);
    expect(career["Yankees:p1"].hits).toBe(2); // not 4 (would be 4 if double-counted)
  });
});

// ---------------------------------------------------------------------------
// Pitcher stat helpers
// ---------------------------------------------------------------------------

const makePitcherRow = (
  gameId: string,
  pitcherId: string,
  overrides: Partial<Omit<PitcherGameStatDoc, "id" | "schemaVersion" | "createdAt">> = {},
): Omit<PitcherGameStatDoc, "id" | "schemaVersion" | "createdAt"> => ({
  gameId,
  teamId: "Yankees",
  opponentTeamId: "Mets",
  pitcherKey: `Yankees:${pitcherId}`,
  pitcherId,
  nameAtGameTime: "Test Pitcher",
  outsPitched: 9,
  battersFaced: 12,
  hitsAllowed: 3,
  walksAllowed: 1,
  strikeoutsRecorded: 5,
  homersAllowed: 0,
  runsAllowed: 1,
  earnedRuns: 1,
  saves: 0,
  holds: 0,
  blownSaves: 0,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Pitcher stats — commitCompletedGame writes pitcher rows
// ---------------------------------------------------------------------------

describe("commitCompletedGame — pitcher stats", () => {
  it("writes pitcher rows to pitcherGameStats collection", async () => {
    const gameId = "game_pitcher_1";
    await store.commitCompletedGame(
      gameId,
      { ...gameMeta },
      [makeStatRow(gameId, "b1")],
      [makePitcherRow(gameId, "p1")],
    );

    const pitchers = await db.pitcherGameStats.find().exec();
    expect(pitchers).toHaveLength(1);
    expect(pitchers[0].pitcherId).toBe("p1");
    expect(pitchers[0].outsPitched).toBe(9);
    expect(pitchers[0].saves).toBe(0);
  });

  it("is idempotent for pitcher rows — no duplicates on second commit", async () => {
    const gameId = "game_pitcher_2";
    const pitcherRow = makePitcherRow(gameId, "p1", { saves: 1 });

    await store.commitCompletedGame(gameId, { ...gameMeta }, [], [pitcherRow]);
    // Re-commit should not create a duplicate.
    await store.commitCompletedGame(gameId, { ...gameMeta }, [], [pitcherRow]);

    const pitchers = await db.pitcherGameStats.find().exec();
    expect(pitchers).toHaveLength(1);
    expect(pitchers[0].saves).toBe(1);
  });

  it("writes pitcher rows even when batting stat rows are empty", async () => {
    const gameId = "game_pitcher_only";
    await store.commitCompletedGame(
      gameId,
      { ...gameMeta },
      [],
      [
        makePitcherRow(gameId, "p1"),
        makePitcherRow(gameId, "p2", {
          teamId: "Mets",
          opponentTeamId: "Yankees",
          pitcherKey: "Mets:p2",
        }),
      ],
    );

    const pitchers = await db.pitcherGameStats.find().exec();
    expect(pitchers).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getTeamCareerBattingStats
// ---------------------------------------------------------------------------

describe("getTeamCareerBattingStats", () => {
  it("returns empty array for team with no history", async () => {
    const result = await store.getTeamCareerBattingStats("NonExistentTeam");
    expect(result).toHaveLength(0);
  });

  it("aggregates batting stats across multiple games for a team", async () => {
    const game1 = "game_batting_1";
    const game2 = "game_batting_2";
    await store.commitCompletedGame(game1, { ...gameMeta }, [makeStatRow(game1, "b1")]);
    await store.commitCompletedGame(game2, { ...gameMeta, playedAt: Date.now() + 1 }, [
      makeStatRow(game2, "b1"),
    ]);

    const result = await store.getTeamCareerBattingStats("Yankees");
    expect(result).toHaveLength(1); // one player
    const player = result[0];
    expect(player.gamesPlayed).toBe(2);
    expect(player.hits).toBe(4); // 2 hits × 2 games
    expect(player.atBats).toBe(8); // 4 AB × 2 games
    expect(player.rbi).toBe(2);
  });

  it("returns separate rows for different players on the same team", async () => {
    const gameId = "game_batting_3";
    await store.commitCompletedGame(gameId, { ...gameMeta }, [
      makeStatRow(gameId, "b1"),
      makeStatRow(gameId, "b2"),
    ]);

    const result = await store.getTeamCareerBattingStats("Yankees");
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getTeamCareerPitchingStats
// ---------------------------------------------------------------------------

describe("getTeamCareerPitchingStats", () => {
  it("returns empty array for team with no pitching history", async () => {
    const result = await store.getTeamCareerPitchingStats("NonExistentTeam");
    expect(result).toHaveLength(0);
  });

  it("aggregates pitching stats across multiple games", async () => {
    const game1 = "game_pitching_1";
    const game2 = "game_pitching_2";
    await store.commitCompletedGame(game1, { ...gameMeta }, [], [makePitcherRow(game1, "p1")]);
    await store.commitCompletedGame(
      game2,
      { ...gameMeta, playedAt: Date.now() + 1 },
      [],
      [makePitcherRow(game2, "p1", { saves: 1 })],
    );

    const result = await store.getTeamCareerPitchingStats("Yankees");
    expect(result).toHaveLength(1);
    const pitcher = result[0];
    expect(pitcher.gamesPlayed).toBe(2);
    expect(pitcher.outsPitched).toBe(18); // 9 × 2
    expect(pitcher.saves).toBe(1); // from game2
    expect(pitcher.strikeoutsRecorded).toBe(10); // 5 × 2
  });

  it("returns separate rows for different pitchers on same team", async () => {
    const gameId = "game_pitching_2p";
    await store.commitCompletedGame(
      gameId,
      { ...gameMeta },
      [],
      [
        makePitcherRow(gameId, "p1"),
        makePitcherRow(gameId, "p2", { pitcherKey: "Yankees:p2", pitcherId: "p2" }),
      ],
    );

    const result = await store.getTeamCareerPitchingStats("Yankees");
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getPlayerCareerBatting + getPlayerCareerPitching
// ---------------------------------------------------------------------------

describe("getPlayerCareerBatting", () => {
  it("returns empty array when player has no history", async () => {
    const result = await store.getPlayerCareerBatting("Yankees:nobody");
    expect(result).toHaveLength(0);
  });

  it("returns per-game rows ordered by createdAt", async () => {
    const game1 = "game_player_bat_1";
    const game2 = "game_player_bat_2";
    await store.commitCompletedGame(game1, { ...gameMeta }, [makeStatRow(game1, "p1")]);
    // Small delay to ensure different createdAt values.
    await new Promise((r) => setTimeout(r, 5));
    await store.commitCompletedGame(game2, { ...gameMeta, playedAt: Date.now() + 1 }, [
      makeStatRow(game2, "p1"),
    ]);

    const result = await store.getPlayerCareerBatting("Yankees:p1");
    expect(result).toHaveLength(2);
    expect(result[0].gameId).toBe(game1);
    expect(result[1].gameId).toBe(game2);
  });
});

describe("getPlayerCareerPitching", () => {
  it("returns empty array when pitcher has no history", async () => {
    const result = await store.getPlayerCareerPitching("Yankees:nobody");
    expect(result).toHaveLength(0);
  });

  it("returns per-game rows for a pitcher", async () => {
    const game1 = "game_player_pitch_1";
    await store.commitCompletedGame(
      game1,
      { ...gameMeta },
      [],
      [makePitcherRow(game1, "p1", { saves: 1, outsPitched: 9 })],
    );

    const result = await store.getPlayerCareerPitching("Yankees:p1");
    expect(result).toHaveLength(1);
    expect(result[0].saves).toBe(1);
    expect(result[0].outsPitched).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// Idempotency: same gameInstanceId from two different save slots
// ---------------------------------------------------------------------------

describe("idempotency: pitcher stats from duplicate save slots", () => {
  it("does not double-count pitcher rows when same gameInstanceId committed twice", async () => {
    const sharedGameInstanceId = "shared_game_pitcher";
    const saveIdA = "save_slot_A";
    const saveIdB = "save_slot_B";

    // Save A commits first.
    await store.commitCompletedGame(
      sharedGameInstanceId,
      { ...gameMeta, committedBySaveId: saveIdA },
      [],
      [makePitcherRow(sharedGameInstanceId, "p1", { outsPitched: 27, saves: 1 })],
    );

    // Save B (same gameInstanceId) commits second — should be a no-op for pitcher row.
    await store.commitCompletedGame(
      sharedGameInstanceId,
      { ...gameMeta, committedBySaveId: saveIdB },
      [],
      [makePitcherRow(sharedGameInstanceId, "p1", { outsPitched: 27, saves: 1 })],
    );

    const allPitchers = await db.pitcherGameStats.find().exec();
    expect(allPitchers).toHaveLength(1); // no duplicate

    // Career stats should reflect exactly one game.
    const career = await store.getTeamCareerPitchingStats("Yankees");
    expect(career).toHaveLength(1);
    expect(career[0].saves).toBe(1); // not 2
    expect(career[0].outsPitched).toBe(27); // not 54
  });
});

// ---------------------------------------------------------------------------
// Export / import — pitcherGameStats included in bundle
// ---------------------------------------------------------------------------

describe("exportGameHistory / importGameHistory — pitcher stats", () => {
  it("exported bundle includes pitcherGameStats array", async () => {
    const gameId = "game_export_pitcher";
    await store.commitCompletedGame(
      gameId,
      { ...gameMeta },
      [makeStatRow(gameId, "b1")],
      [makePitcherRow(gameId, "p1", { saves: 1 })],
    );

    const json = await store.exportGameHistory();
    const parsed = JSON.parse(json);
    expect(parsed.formatVersion).toBe(2);
    expect(Array.isArray(parsed.payload.pitcherGameStats)).toBe(true);
    expect(parsed.payload.pitcherGameStats).toHaveLength(1);
    expect(parsed.payload.pitcherGameStats[0].saves).toBe(1);
  });

  it("importGameHistory imports pitcher rows from bundle", async () => {
    const gameId = "game_import_pitcher";
    await store.commitCompletedGame(gameId, { ...gameMeta }, [], [makePitcherRow(gameId, "p1")]);

    const json = await store.exportGameHistory();

    // Fresh DB for import.
    const db2 = await _createTestDb(getRxStorageMemory());
    const store2 = makeGameHistoryStore(() => Promise.resolve(db2));

    const result = await store2.importGameHistory(json, new Set());
    expect(result.pitcherStatsCreated).toBe(1);
    expect(result.pitcherStatsSkipped).toBe(0);

    const pitchers = await db2.pitcherGameStats.find().exec();
    expect(pitchers).toHaveLength(1);

    await db2.close();
  });

  it("import is idempotent for pitcher rows", async () => {
    const gameId = "game_import_pitcher_idem";
    await store.commitCompletedGame(gameId, { ...gameMeta }, [], [makePitcherRow(gameId, "p1")]);
    const json = await store.exportGameHistory();

    const db2 = await _createTestDb(getRxStorageMemory());
    const store2 = makeGameHistoryStore(() => Promise.resolve(db2));

    const result1 = await store2.importGameHistory(json, new Set());
    const result2 = await store2.importGameHistory(json, new Set());

    expect(result1.pitcherStatsCreated).toBe(1);
    expect(result2.pitcherStatsCreated).toBe(0); // skipped on second import
    expect(result2.pitcherStatsSkipped).toBe(1);

    const pitchers = await db2.pitcherGameStats.find().exec();
    expect(pitchers).toHaveLength(1); // no duplicates

    await db2.close();
  });
});

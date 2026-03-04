import "fake-indexeddb/auto";

import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { _createTestDb, type BallgameDb } from "./db";
import { makeGameHistoryStore } from "./gameHistoryStore";
import type { GameDoc, PlayerGameStatDoc } from "./types";

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

import { _createTestDb, type BallgameDb } from "@storage/db";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { _buildFetchMlbTeams, AL_FALLBACK, NL_FALLBACK } from "./mlbTeams";

let db: BallgameDb;
let fetchMlbTeams: ReturnType<typeof _buildFetchMlbTeams>;

beforeEach(async () => {
  db = await _createTestDb(getRxStorageMemory());
  fetchMlbTeams = _buildFetchMlbTeams(() => Promise.resolve(db));
  vi.restoreAllMocks();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await db.close();
});

describe("fetchMlbTeams", () => {
  it("returns fallback data when fetch fails and DB is empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await fetchMlbTeams();
    expect(result.al).toEqual(AL_FALLBACK);
    expect(result.nl).toEqual(NL_FALLBACK);
  });

  it("returns parsed API data and persists each team to RxDB on success", async () => {
    const mockTeams = [
      { id: 147, name: "New York Yankees", abbreviation: "NYY", league: { id: 103 } },
      { id: 110, name: "Baltimore Orioles", abbreviation: "BAL", league: { id: 103 } },
      { id: 121, name: "New York Mets", abbreviation: "NYM", league: { id: 104 } },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ teams: mockTeams }) }),
    );

    const result = await fetchMlbTeams();
    expect(result.al).toHaveLength(2);
    expect(result.nl).toHaveLength(1);
    // AL teams sorted alphabetically
    expect(result.al[0].name).toBe("Baltimore Orioles");
    expect(result.al[1].name).toBe("New York Yankees");

    // Each team stored as its own RxDB document keyed by numeric ID
    const yankeesDoc = await db.teams.findOne("147").exec();
    expect(yankeesDoc).not.toBeNull();
    expect(yankeesDoc?.numericId).toBe(147);
    expect(yankeesDoc?.league).toBe("al");

    const metsDoc = await db.teams.findOne("121").exec();
    expect(metsDoc).not.toBeNull();
    expect(metsDoc?.league).toBe("nl");
  });

  it("returns cached data without fetching when cache is fresh", async () => {
    const now = Date.now();
    await db.teams.bulkInsert([
      {
        id: "147",
        numericId: 147,
        name: "New York Yankees",
        abbreviation: "NYY",
        league: "al",
        cachedAt: now,
        schemaVersion: 1,
      },
      {
        id: "121",
        numericId: 121,
        name: "New York Mets",
        abbreviation: "NYM",
        league: "nl",
        cachedAt: now,
        schemaVersion: 1,
      },
    ]);

    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchMlbTeams();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.al[0].name).toBe("New York Yankees");
    expect(result.nl[0].name).toBe("New York Mets");
    // MlbTeam.id is the numeric ID
    expect(result.al[0].id).toBe(147);
  });

  it("re-fetches when cache is stale (older than 1 day)", async () => {
    const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
    await db.teams.bulkInsert([
      {
        id: "147",
        numericId: 147,
        name: "Cached Yankees",
        abbreviation: "NYY",
        league: "al",
        cachedAt: staleTimestamp,
        schemaVersion: 1,
      },
    ]);

    const freshTeams = [
      { id: 147, name: "New York Yankees", abbreviation: "NYY", league: { id: 103 } },
      { id: 121, name: "New York Mets", abbreviation: "NYM", league: { id: 104 } },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ teams: freshTeams }) }),
    );

    const result = await fetchMlbTeams();
    expect(result.al[0].name).toBe("New York Yankees"); // fresh name, not "Cached Yankees"
  });

  it("falls back to stale RxDB data when fetch fails", async () => {
    const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000;
    await db.teams.bulkInsert([
      {
        id: "147",
        numericId: 147,
        name: "Stale Yankees",
        abbreviation: "NYY",
        league: "al",
        cachedAt: staleTimestamp,
        schemaVersion: 1,
      },
    ]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await fetchMlbTeams();
    expect(result.al[0].name).toBe("Stale Yankees");
  });

  it("does not save to DB when API returns empty leagues", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ teams: [] }) }),
    );
    await fetchMlbTeams();
    const count = await db.teams.count().exec();
    expect(count).toBe(0);
  });

  it("returns fallback data when API returns non-2xx status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const result = await fetchMlbTeams();
    expect(result.al).toEqual(AL_FALLBACK);
    expect(result.nl).toEqual(NL_FALLBACK);
  });

  it("deletes removed teams from RxDB when API no longer includes them", async () => {
    const now = Date.now() - 25 * 60 * 60 * 1000; // stale so re-fetch triggers
    // Pre-populate DB with a team that won't be in the new API response
    await db.teams.bulkInsert([
      {
        id: "999",
        numericId: 999,
        name: "Defunct Team",
        abbreviation: "DEF",
        league: "al",
        cachedAt: now,
        schemaVersion: 1,
      },
    ]);

    const freshTeams = [
      { id: 147, name: "New York Yankees", abbreviation: "NYY", league: { id: 103 } },
      { id: 121, name: "New York Mets", abbreviation: "NYM", league: { id: 104 } },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ teams: freshTeams }) }),
    );

    await fetchMlbTeams();

    const defunct = await db.teams.findOne("999").exec();
    expect(defunct).toBeNull();
    expect(await db.teams.findOne("147").exec()).not.toBeNull();
  });

  it("AL_FALLBACK has 15 teams", () => {
    expect(AL_FALLBACK).toHaveLength(15);
  });

  it("NL_FALLBACK has 15 teams", () => {
    expect(NL_FALLBACK).toHaveLength(15);
  });
});

it("returns API data even when the DB write throws (saveToDb catch branch)", async () => {
  // Stub bulkUpsert to throw — the catch in saveToDb should swallow it.
  vi.spyOn(db.teams, "bulkUpsert").mockRejectedValue(new Error("DB write failed"));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          teams: [
            { id: 147, name: "New York Yankees", abbreviation: "NYY", league: { id: 103 } },
            { id: 121, name: "New York Mets", abbreviation: "NYM", league: { id: 104 } },
          ],
        }),
    }),
  );
  // fetchMlbTeams should still resolve with the API data even though the DB write failed
  const result = await fetchMlbTeams();
  expect(result.al[0].name).toBe("New York Yankees");
  expect(result.nl[0].name).toBe("New York Mets");
});

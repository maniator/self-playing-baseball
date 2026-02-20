import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AL_FALLBACK, fetchMlbTeams, NL_FALLBACK } from "./mlbTeams";

const CACHE_KEY = "mlbTeamsCache";

describe("fetchMlbTeams", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns fallback data when fetch fails and no cache", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await fetchMlbTeams();
    expect(result.al).toEqual(AL_FALLBACK);
    expect(result.nl).toEqual(NL_FALLBACK);
  });

  it("returns parsed API data and saves to cache on success", async () => {
    const mockTeams = [
      { id: 147, name: "New York Yankees", abbreviation: "NYY", league: { id: 103 } },
      { id: 121, name: "New York Mets", abbreviation: "NYM", league: { id: 104 } },
      { id: 110, name: "Baltimore Orioles", abbreviation: "BAL", league: { id: 103 } },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: () => Promise.resolve({ teams: mockTeams }) }),
    );

    const result = await fetchMlbTeams();
    expect(result.al).toHaveLength(2);
    expect(result.nl).toHaveLength(1);
    // AL teams should be sorted alphabetically
    expect(result.al[0].name).toBe("Baltimore Orioles");
    expect(result.al[1].name).toBe("New York Yankees");

    // Should be cached in localStorage
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
    expect(cached).not.toBeNull();
    expect(cached.al).toHaveLength(2);
  });

  it("returns cached data without fetching when cache is fresh", async () => {
    const cachedData = {
      al: [{ id: 147, name: "New York Yankees", abbreviation: "NYY" }],
      nl: [{ id: 121, name: "New York Mets", abbreviation: "NYM" }],
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));

    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchMlbTeams();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.al[0].name).toBe("New York Yankees");
    expect(result.nl[0].name).toBe("New York Mets");
  });

  it("re-fetches when cache is stale (older than 1 day)", async () => {
    const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
    const cachedData = {
      al: [{ id: 147, name: "Cached Yankees", abbreviation: "NYY" }],
      nl: [{ id: 121, name: "Cached Mets", abbreviation: "NYM" }],
      timestamp: staleTimestamp,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));

    const freshTeams = [
      { id: 147, name: "New York Yankees", abbreviation: "NYY", league: { id: 103 } },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: () => Promise.resolve({ teams: freshTeams }) }),
    );

    const result = await fetchMlbTeams();
    expect(result.al[0].name).toBe("New York Yankees");
  });

  it("falls back to stale cache when fetch fails", async () => {
    const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000;
    const cachedData = {
      al: [{ id: 147, name: "Stale Yankees", abbreviation: "NYY" }],
      nl: [],
      timestamp: staleTimestamp,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await fetchMlbTeams();
    expect(result.al[0].name).toBe("Stale Yankees");
  });

  it("does not save cache when API returns empty leagues", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: () => Promise.resolve({ teams: [] }) }),
    );
    await fetchMlbTeams();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("AL_FALLBACK has 15 teams", () => {
    expect(AL_FALLBACK).toHaveLength(15);
  });

  it("NL_FALLBACK has 15 teams", () => {
    expect(NL_FALLBACK).toHaveLength(15);
  });
});

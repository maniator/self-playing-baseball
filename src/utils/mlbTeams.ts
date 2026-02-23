import type { BallgameDb } from "@storage/db";
import { getDb } from "@storage/db";
import type { TeamDoc } from "@storage/types";

export type MlbTeam = { id: number; name: string; abbreviation: string };

// League IDs from the MLB Stats API
const AL_ID = 103;
const NL_ID = 104;

// Baked-in fallback (alphabetical within each league)
export const AL_FALLBACK: MlbTeam[] = [
  { id: 133, name: "Athletics", abbreviation: "ATH" },
  { id: 110, name: "Baltimore Orioles", abbreviation: "BAL" },
  { id: 111, name: "Boston Red Sox", abbreviation: "BOS" },
  { id: 145, name: "Chicago White Sox", abbreviation: "CWS" },
  { id: 114, name: "Cleveland Guardians", abbreviation: "CLE" },
  { id: 116, name: "Detroit Tigers", abbreviation: "DET" },
  { id: 117, name: "Houston Astros", abbreviation: "HOU" },
  { id: 118, name: "Kansas City Royals", abbreviation: "KC" },
  { id: 108, name: "Los Angeles Angels", abbreviation: "LAA" },
  { id: 142, name: "Minnesota Twins", abbreviation: "MIN" },
  { id: 147, name: "New York Yankees", abbreviation: "NYY" },
  { id: 136, name: "Seattle Mariners", abbreviation: "SEA" },
  { id: 139, name: "Tampa Bay Rays", abbreviation: "TB" },
  { id: 140, name: "Texas Rangers", abbreviation: "TEX" },
  { id: 141, name: "Toronto Blue Jays", abbreviation: "TOR" },
];

export const NL_FALLBACK: MlbTeam[] = [
  { id: 109, name: "Arizona Diamondbacks", abbreviation: "ARI" },
  { id: 144, name: "Atlanta Braves", abbreviation: "ATL" },
  { id: 112, name: "Chicago Cubs", abbreviation: "CHC" },
  { id: 113, name: "Cincinnati Reds", abbreviation: "CIN" },
  { id: 115, name: "Colorado Rockies", abbreviation: "COL" },
  { id: 119, name: "Los Angeles Dodgers", abbreviation: "LAD" },
  { id: 146, name: "Miami Marlins", abbreviation: "MIA" },
  { id: 158, name: "Milwaukee Brewers", abbreviation: "MIL" },
  { id: 121, name: "New York Mets", abbreviation: "NYM" },
  { id: 143, name: "Philadelphia Phillies", abbreviation: "PHI" },
  { id: 134, name: "Pittsburgh Pirates", abbreviation: "PIT" },
  { id: 135, name: "San Diego Padres", abbreviation: "SD" },
  { id: 137, name: "San Francisco Giants", abbreviation: "SF" },
  { id: 138, name: "St. Louis Cardinals", abbreviation: "STL" },
  { id: 120, name: "Washington Nationals", abbreviation: "WSH" },
];

/**
 * All known teams combined for synchronous abbreviation lookup.
 * Searched by `getTeamAbbreviation` without any DB/network access.
 */
const ALL_TEAMS: MlbTeam[] = [...AL_FALLBACK, ...NL_FALLBACK];

/**
 * Returns the 2–3-character MLB abbreviation for a given full team name, or
 * `undefined` when the name is not found in the combined fallback list.
 *
 * Useful for compact/mobile display where space is limited.
 *
 * @example
 * getTeamAbbreviation("New York Yankees") // "NYY"
 * getTeamAbbreviation("Custom Team")      // undefined
 */
export function getTeamAbbreviation(teamName: string): string | undefined {
  return ALL_TEAMS.find((t) => t.name === teamName)?.abbreviation;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const SCHEMA_VERSION = 1;

const sortByName = (a: MlbTeam, b: MlbTeam) => a.name.localeCompare(b.name);

type ApiTeam = { id: number; name: string; abbreviation: string; league?: { id: number } };
type GetDb = () => Promise<BallgameDb>;

function toMlbTeam(d: TeamDoc): MlbTeam {
  return { id: d.numericId, name: d.name, abbreviation: d.abbreviation };
}

function toTeamDoc(t: MlbTeam, league: "al" | "nl", now: number): TeamDoc {
  return {
    id: String(t.id),
    numericId: t.id,
    name: t.name,
    abbreviation: t.abbreviation,
    league,
    cachedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
}

function buildFetcher(getDbFn: GetDb) {
  /** Read cached teams from RxDB. Returns null when the cache is empty or stale. */
  async function loadFromDb(ignoreAge = false): Promise<{ al: MlbTeam[]; nl: MlbTeam[] } | null> {
    try {
      const db = await getDbFn();
      const all = await db.teams.find().exec();
      if (all.length === 0) return null;
      if (!ignoreAge) {
        const oldest = Math.min(...all.map((d) => d.cachedAt));
        if (Date.now() - oldest >= CACHE_TTL_MS) return null;
      }
      const al = all
        .filter((d) => d.league === "al")
        .map(toMlbTeam)
        .sort(sortByName);
      const nl = all
        .filter((d) => d.league === "nl")
        .map(toMlbTeam)
        .sort(sortByName);
      return { al, nl };
    } catch {
      return null;
    }
  }

  /**
   * Persist teams to RxDB: upserts all current teams and deletes any whose
   * IDs are no longer present (e.g. contracted teams).
   */
  async function saveToDb(al: MlbTeam[], nl: MlbTeam[]): Promise<void> {
    try {
      const db = await getDbFn();
      const now = Date.now();
      const incoming = [
        ...al.map((t) => toTeamDoc(t, "al", now)),
        ...nl.map((t) => toTeamDoc(t, "nl", now)),
      ];
      const newIds = new Set(incoming.map((d) => d.id));
      // Upsert first — if this fails we haven't deleted anything yet.
      await db.teams.bulkUpsert(incoming);
      // Remove teams that no longer exist in the API response.
      const existing = await db.teams.find().exec();
      await Promise.all(existing.filter((d) => !newIds.has(d.id)).map((d) => d.remove()));
    } catch {
      // Swallow DB errors — teams were already returned to the caller.
    }
  }

  return async function fetchMlbTeams(): Promise<{ al: MlbTeam[]; nl: MlbTeam[] }> {
    const cached = await loadFromDb();
    if (cached) return cached;

    try {
      const resp = await fetch("https://statsapi.mlb.com/api/v1/teams?sportId=1");
      if (!resp.ok) throw new Error(`MLB teams request failed with status ${resp.status}`);
      const data = (await resp.json()) as { teams: ApiTeam[] };
      const toTeam = (t: ApiTeam): MlbTeam => ({
        id: t.id,
        name: t.name,
        abbreviation: t.abbreviation,
      });
      const al = data.teams
        .filter((t) => t.league?.id === AL_ID)
        .map(toTeam)
        .sort(sortByName);
      const nl = data.teams
        .filter((t) => t.league?.id === NL_ID)
        .map(toTeam)
        .sort(sortByName);
      if (al.length === 0 || nl.length === 0)
        throw new Error("MLB teams data missing league information");
      await saveToDb(al, nl);
      return { al, nl };
    } catch {
      // Fall back to stale DB data, then hardcoded fallback.
      const stale = await loadFromDb(true);
      if (stale) return stale;
      return { al: AL_FALLBACK, nl: NL_FALLBACK };
    }
  };
}

/** Default fetchMlbTeams backed by the IndexedDB singleton. */
export const fetchMlbTeams = buildFetcher(getDb);

/**
 * Factory exposed for tests — pass an in-memory DB getter to get an isolated
 * fetchMlbTeams that writes to the injected database.
 */
export const _buildFetchMlbTeams = buildFetcher;

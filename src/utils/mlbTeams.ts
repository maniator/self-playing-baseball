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

const CACHE_KEY = "mlbTeamsCache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

type TeamsCache = { al: MlbTeam[]; nl: MlbTeam[]; timestamp: number };

function loadCache(): TeamsCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TeamsCache;
  } catch {
    return null;
  }
}

function saveCache(al: MlbTeam[], nl: MlbTeam[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ al, nl, timestamp: Date.now() }));
  } catch {
    // ignore storage errors
  }
}

type ApiTeam = { id: number; name: string; abbreviation: string; league?: { id: number } };

export async function fetchMlbTeams(): Promise<{ al: MlbTeam[]; nl: MlbTeam[] }> {
  const cached = loadCache();
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { al: cached.al, nl: cached.nl };
  }
  try {
    const resp = await fetch("https://statsapi.mlb.com/api/v1/teams?sportId=1");
    const data = (await resp.json()) as { teams: ApiTeam[] };
    const sort = (a: MlbTeam, b: MlbTeam) => a.name.localeCompare(b.name);
    const toTeam = (t: ApiTeam): MlbTeam => ({
      id: t.id,
      name: t.name,
      abbreviation: t.abbreviation,
    });
    const al = data.teams
      .filter((t) => t.league?.id === AL_ID)
      .map(toTeam)
      .sort(sort);
    const nl = data.teams
      .filter((t) => t.league?.id === NL_ID)
      .map(toTeam)
      .sort(sort);
    if (al.length === 0 || nl.length === 0) {
      // If league filtering yields no teams for either league, treat as an error so we can fall back.
      throw new Error("MLB teams data missing league information");
    }
    if (al.length > 0 && nl.length > 0) saveCache(al, nl);
    return { al, nl };
  } catch {
    if (cached) return { al: cached.al, nl: cached.nl };
    return { al: AL_FALLBACK, nl: NL_FALLBACK };
  }
}

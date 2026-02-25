import { BATTING_POSITIONS } from "@utils/roster";

import { HITTER_STAT_CAP, PITCHER_STAT_CAP } from "../statBudget";

export interface GeneratedPlayer {
  id: string;
  name: string;
  role: "batter" | "pitcher";
  position?: string;
  handedness?: "R" | "L" | "S";
  batting: { contact: number; power: number; speed: number };
  pitching?: { velocity: number; control: number; movement: number };
  pitchingRole?: "SP" | "RP" | "SP/RP";
}

export interface CustomTeamDraft {
  name: string;
  /** 2–3 char generated abbreviation derived from city + nickname. */
  abbreviation: string;
  city: string;
  nickname: string;
  roster: {
    lineup: GeneratedPlayer[];
    bench: GeneratedPlayer[];
    pitchers: GeneratedPlayer[];
  };
}

const CITIES = [
  "Austin",
  "Boston",
  "Charlotte",
  "Denver",
  "Detroit",
  "Indianapolis",
  "Jacksonville",
  "Las Vegas",
  "Memphis",
  "Nashville",
  "Orlando",
  "Portland",
  "Sacramento",
  "San Antonio",
  "Tampa",
];

const NICKNAMES = [
  "Aces",
  "Bears",
  "Comets",
  "Dynamo",
  "Eagles",
  "Foxes",
  "Giants",
  "Hawks",
  "Iron",
  "Jets",
  "Kings",
  "Lions",
  "Marlins",
  "Navigators",
  "Owls",
  "Pioneers",
  "Raiders",
  "Rockets",
  "Stallions",
  "Thunder",
  "Titans",
  "Vipers",
  "Wolves",
];

const FIRST_NAMES = [
  "Aaron",
  "Ben",
  "Carlos",
  "Danny",
  "Eric",
  "Frank",
  "Gary",
  "Henry",
  "Ivan",
  "Jake",
  "Karl",
  "Leo",
  "Marcus",
  "Nathan",
  "Oscar",
  "Pete",
  "Quinn",
  "Ray",
  "Sam",
  "Tom",
  "Upton",
  "Victor",
  "Wade",
  "Xavier",
  "Yogi",
  "Zane",
];

const LAST_NAMES = [
  "Adams",
  "Baker",
  "Cole",
  "Davis",
  "Evans",
  "Ford",
  "Grant",
  "Hill",
  "Irwin",
  "Jones",
  "Kent",
  "Lane",
  "Moore",
  "Nash",
  "Owen",
  "Park",
  "Quinn",
  "Reed",
  "Scott",
  "Turner",
  "Urban",
  "Vega",
  "Walsh",
  "Xiong",
  "Young",
  "Zavala",
];

const makeMulberry32 = (a: number): (() => number) => {
  return (): number => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const seedToNumber = (seed: string | number): number => {
  if (typeof seed === "number") return seed >>> 0;
  const parsed = parseInt(seed, 36);
  if (Number.isFinite(parsed)) return parsed >>> 0;
  return seed.split("").reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0) >>> 0;
};

const randInt = (rng: () => number, min: number, max: number): number =>
  Math.floor(rng() * (max - min + 1)) + min;

const pickFrom = <T>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];

export function generateDefaultCustomTeamDraft(seed: string | number): CustomTeamDraft {
  const rng = makeMulberry32(seedToNumber(seed));

  const city = pickFrom(rng, CITIES);
  const nickname = pickFrom(rng, NICKNAMES);

  /** Pick a batting handedness: 65% R, 25% L, 10% S. */
  const pickHandedness = (): "R" | "L" | "S" => {
    const r = rng();
    if (r < 0.65) return "R";
    if (r < 0.9) return "L";
    return "S";
  };

  const lineup: GeneratedPlayer[] = Array.from({ length: 9 }, (_, i) => ({
    id: `p_${seed}_L${i}`,
    name: `${pickFrom(rng, FIRST_NAMES)} ${pickFrom(rng, LAST_NAMES)}`,
    role: "batter" as const,
    position: BATTING_POSITIONS[i] ?? "DH",
    handedness: pickHandedness(),
    // Each stat is bounded so max sum = 3 × maxPerStat ≤ HITTER_STAT_CAP.
    batting: {
      contact: randInt(rng, 20, Math.floor(HITTER_STAT_CAP / 3)),
      power: randInt(rng, 20, Math.floor(HITTER_STAT_CAP / 3)),
      speed: randInt(rng, 20, Math.floor(HITTER_STAT_CAP / 3)),
    },
  }));

  const bench: GeneratedPlayer[] = Array.from({ length: 2 }, (_, i) => ({
    id: `p_${seed}_B${i}`,
    name: `${pickFrom(rng, FIRST_NAMES)} ${pickFrom(rng, LAST_NAMES)}`,
    role: "batter" as const,
    // Bench players get utility positions (OF spots or C) in rotation
    position: (["LF", "CF", "C"] as const)[i % 3],
    handedness: pickHandedness(),
    // Each stat is bounded so max sum = 3 × maxPerStat ≤ HITTER_STAT_CAP.
    batting: {
      contact: randInt(rng, 20, Math.floor(HITTER_STAT_CAP / 3)),
      power: randInt(rng, 20, Math.floor(HITTER_STAT_CAP / 3)),
      speed: randInt(rng, 20, Math.floor(HITTER_STAT_CAP / 3)),
    },
  }));

  const pitchers: GeneratedPlayer[] = Array.from({ length: 3 }, (_, i) => ({
    id: `p_${seed}_P${i}`,
    name: `${pickFrom(rng, FIRST_NAMES)} ${pickFrom(rng, LAST_NAMES)}`,
    role: "pitcher" as const,
    position: i === 0 ? "SP" : "RP",
    pitchingRole: (i === 0 ? "SP" : "RP") as "SP" | "RP",
    handedness: pickHandedness(),
    batting: {
      contact: randInt(rng, 20, Math.floor(HITTER_STAT_CAP / 3)),
      power: randInt(rng, 20, Math.floor(HITTER_STAT_CAP / 3)),
      speed: randInt(rng, 20, Math.floor(HITTER_STAT_CAP / 3)),
    },
    // Each stat is bounded so max sum = 3 × maxPerStat ≤ PITCHER_STAT_CAP − 1.
    pitching: {
      velocity: randInt(rng, 25, Math.floor((PITCHER_STAT_CAP - 1) / 3)),
      control: randInt(rng, 25, Math.floor((PITCHER_STAT_CAP - 1) / 3)),
      movement: randInt(rng, 25, Math.floor((PITCHER_STAT_CAP - 1) / 3)),
    },
  }));

  return {
    name: nickname,
    abbreviation: makeAbbreviation(city, nickname),
    city,
    nickname,
    roster: { lineup, bench, pitchers },
  };
}

/**
 * Derives a deterministic 2–3 char abbreviation from city + nickname.
 * Strategy:
 * - 3+ word city: first letter of each of the first 3 words.
 * - 2-word city: first letter of each word + first letter of nickname.
 * - Single-word city: first 2 letters of city + first letter of nickname.
 */
export function makeAbbreviation(city: string, nickname: string): string {
  const cityWords = city.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const nickChar = nickname.trim().toUpperCase()[0] ?? "X";
  if (cityWords.length >= 3) {
    return cityWords
      .slice(0, 3)
      .map((w) => w[0])
      .join("");
  }
  if (cityWords.length === 2) {
    return cityWords.map((w) => w[0]).join("") + nickChar;
  }
  // Single-word city: first 2 letters of city + first letter of nickname
  const c = cityWords[0] ?? "X";
  return (c.slice(0, 2) + nickname.trim().toUpperCase()[0]).slice(0, 3);
}

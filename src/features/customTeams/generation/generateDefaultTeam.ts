export interface GeneratedPlayer {
  id: string;
  name: string;
  role: "batter" | "pitcher";
  batting: { contact: number; power: number; speed: number };
  pitching?: { velocity: number; control: number; movement: number };
}

export interface CustomTeamDraft {
  name: string;
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

  const lineup: GeneratedPlayer[] = Array.from({ length: 9 }, (_, i) => ({
    id: `p_${seed}_L${i}`,
    name: `${pickFrom(rng, FIRST_NAMES)} ${pickFrom(rng, LAST_NAMES)}`,
    role: "batter" as const,
    batting: {
      contact: randInt(rng, 40, 80),
      power: randInt(rng, 40, 80),
      speed: randInt(rng, 40, 80),
    },
  }));

  const bench: GeneratedPlayer[] = Array.from({ length: 2 }, (_, i) => ({
    id: `p_${seed}_B${i}`,
    name: `${pickFrom(rng, FIRST_NAMES)} ${pickFrom(rng, LAST_NAMES)}`,
    role: "batter" as const,
    batting: {
      contact: randInt(rng, 40, 80),
      power: randInt(rng, 40, 80),
      speed: randInt(rng, 40, 80),
    },
  }));

  const pitchers: GeneratedPlayer[] = Array.from({ length: 3 }, (_, i) => ({
    id: `p_${seed}_P${i}`,
    name: `${pickFrom(rng, FIRST_NAMES)} ${pickFrom(rng, LAST_NAMES)}`,
    role: "pitcher" as const,
    batting: {
      contact: randInt(rng, 20, 50),
      power: randInt(rng, 20, 50),
      speed: randInt(rng, 20, 50),
    },
    pitching: {
      velocity: randInt(rng, 40, 80),
      control: randInt(rng, 40, 80),
      movement: randInt(rng, 40, 80),
    },
  }));

  return { name: nickname, city, nickname, roster: { lineup, bench, pitchers } };
}

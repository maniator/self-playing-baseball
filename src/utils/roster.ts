export type BaseStats = {
  contact: number;
  power: number;
  speed: number;
  control: number;
  velocity: number;
  stamina: number;
};

export type Player = {
  id: string;
  name: string;
  position: string;
  isPitcher: boolean;
  baseStats: BaseStats;
};

export type Roster = {
  batters: Player[];
  pitcher: Player;
};

const BATTING_POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"] as const;

const POSITION_NAMES: Record<string, string> = {
  C: "Catcher",
  "1B": "First Baseman",
  "2B": "Second Baseman",
  "3B": "Third Baseman",
  SS: "Shortstop",
  LF: "Left Fielder",
  CF: "Center Fielder",
  RF: "Right Fielder",
  DH: "Designated Hitter",
};

// Position-archetype base stats (0–100 scale). Batters have 0 for pitcher stats; pitcher vice versa.
const BATTER_BASE_STATS: Record<string, Pick<BaseStats, "contact" | "power" | "speed">> = {
  C: { contact: 60, power: 55, speed: 40 },
  "1B": { contact: 58, power: 70, speed: 35 },
  "2B": { contact: 70, power: 50, speed: 65 },
  "3B": { contact: 62, power: 65, speed: 50 },
  SS: { contact: 65, power: 50, speed: 70 },
  LF: { contact: 60, power: 65, speed: 55 },
  CF: { contact: 65, power: 55, speed: 75 },
  RF: { contact: 58, power: 65, speed: 58 },
  DH: { contact: 58, power: 72, speed: 38 },
};

/**
 * Generates a deterministic 9-batter roster + 1 starting pitcher for the given team.
 * Player IDs are stable as long as the team name doesn't change.
 */
export const generateRoster = (teamName: string): Roster => {
  const slug =
    teamName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "team";
  const batters: Player[] = BATTING_POSITIONS.map((pos, i) => {
    const { contact, power, speed } = BATTER_BASE_STATS[pos] ?? {
      contact: 60,
      power: 60,
      speed: 60,
    };
    return {
      id: `${slug}_b${i}`,
      name: POSITION_NAMES[pos] ?? pos,
      position: pos,
      isPitcher: false,
      baseStats: { contact, power, speed, control: 0, velocity: 0, stamina: 0 },
    };
  });
  const pitcher: Player = {
    id: `${slug}_p0`,
    name: "Starting Pitcher",
    position: "SP",
    isPitcher: true,
    baseStats: { contact: 0, power: 0, speed: 0, control: 65, velocity: 62, stamina: 60 },
  };
  return { batters, pitcher };
};

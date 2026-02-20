export type Player = {
  id: string;
  name: string;
  position: string;
  isPitcher: boolean;
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
  const batters: Player[] = BATTING_POSITIONS.map((pos, i) => ({
    id: `${slug}_b${i}`,
    name: POSITION_NAMES[pos] ?? pos,
    position: pos,
    isPitcher: false,
  }));
  const pitcher: Player = {
    id: `${slug}_p0`,
    name: "Starting Pitcher",
    position: "SP",
    isPitcher: true,
  };
  return { batters, pitcher };
};

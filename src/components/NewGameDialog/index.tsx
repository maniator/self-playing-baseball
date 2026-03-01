import type { TeamCustomPlayerOverrides } from "@context/index";

export type PlayerOverrides = {
  away: TeamCustomPlayerOverrides;
  home: TeamCustomPlayerOverrides;
  awayOrder: string[];
  homeOrder: string[];
  awayBench?: string[];
  homeBench?: string[];
  awayPitchers?: string[];
  homePitchers?: string[];
  /**
   * Starting pitcher index into awayPitchers/homePitchers for each team.
   * null = use index 0 (default). Only meaningful for managed custom-team games.
   */
  startingPitcherIdx?: [number | null, number | null];
};

/** Returns SP-eligible pitchers from a roster, preserving their original index. */
export const getSpEligiblePitchers = (
  pitchers: { id: string; name: string; pitchingRole?: "SP" | "RP" | "SP/RP" }[],
): Array<{ id: string; name: string; pitchingRole?: "SP" | "RP" | "SP/RP"; idx: number }> =>
  pitchers
    .map((p, i) => ({ ...p, idx: i }))
    .filter((p) => !p.pitchingRole || p.pitchingRole === "SP" || p.pitchingRole === "SP/RP");

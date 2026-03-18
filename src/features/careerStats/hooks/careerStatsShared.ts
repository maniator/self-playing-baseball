import { computeERA, computeWHIP, formatIP } from "@feat/careerStats/utils/computePitcherGameStats";

import type { BatterGameStatRecord } from "@storage/types";

export type BattingRow = BatterGameStatRecord["batting"] & {
  playerKey: string;
  nameAtGameTime: string;
  gamesPlayed: number;
};

export type PitchingRow = {
  pitcherKey: string;
  nameAtGameTime: string;
  gamesPlayed: number;
  outsPitched: number;
  battersFaced: number;
  hitsAllowed: number;
  walksAllowed: number;
  strikeoutsRecorded: number;
  homersAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  saves: number;
  holds: number;
  blownSaves: number;
};

export type CareerStatsTab = "batting" | "pitching";
export type SortDir = "asc" | "desc";

export type BattingSortKey =
  | keyof Pick<
      BattingRow,
      | "nameAtGameTime"
      | "gamesPlayed"
      | "atBats"
      | "hits"
      | "doubles"
      | "triples"
      | "homers"
      | "walks"
      | "strikeouts"
      | "rbi"
    >
  | "avg";

export type PitchingSortKey =
  | keyof Pick<
      PitchingRow,
      | "nameAtGameTime"
      | "gamesPlayed"
      | "outsPitched"
      | "hitsAllowed"
      | "walksAllowed"
      | "strikeoutsRecorded"
      | "homersAllowed"
      | "runsAllowed"
      | "earnedRuns"
      | "saves"
      | "holds"
      | "blownSaves"
    >
  | "era"
  | "whip";

export function formatOutsAsIP(outs: number): string {
  return formatIP(outs);
}

export function formatAVG(hits: number, atBats: number): string {
  if (atBats === 0) return ".---";
  const avg = hits / atBats;
  return avg.toFixed(3).replace(/^0/, "");
}

export function formatERA(earnedRuns: number, outsPitched: number): string {
  const era = computeERA(earnedRuns, outsPitched);
  if (era === null) return "—";
  return era.toFixed(2);
}

export function formatWHIP(walksAllowed: number, hitsAllowed: number, outsPitched: number): string {
  const whip = computeWHIP(walksAllowed, hitsAllowed, outsPitched);
  if (whip === null) return "—";
  return whip.toFixed(2);
}

export function formatWinPct(winPct: number): string {
  return winPct.toFixed(3).replace(/^0/, "");
}

export function formatRPG(rpg: number): string {
  return rpg.toFixed(2);
}

export function sortIndicator(key: string, activeKey: string, dir: SortDir): string {
  if (key !== activeKey) return "";
  return dir === "asc" ? " ↑" : " ↓";
}

export function ariaSortValue(
  key: string,
  activeKey: string,
  dir: SortDir,
): "ascending" | "descending" | "none" {
  if (key !== activeKey) return "none";
  return dir === "asc" ? "ascending" : "descending";
}

import * as React from "react";

import {
  DetailContainer,
  DetailEmptyState,
  DetailHeadingRow,
  DetailPlayerName,
  DetailSubLabel,
  DetailToggle,
  StatCell,
  StatLabel,
  StatsGrid,
  StatValue,
} from "./styles";

export type BatterStat = {
  atBats: number;
  hits: number;
  walks: number;
  strikeouts: number;
  rbi: number;
  singles: number;
  doubles: number;
  triples: number;
  homers: number;
  /** Sacrifice flies: PA where a caught fly drove in a run. Counts as PA but not AB. */
  sacFlies: number;
};

interface Props {
  slot: number | null;
  name: string;
  teamName: string;
  /** Position abbreviation (e.g. "1B", "SS"). Empty string if unknown. */
  position: string;
  stats: BatterStat | null;
  onClear: () => void;
}

/**
 * Format rate stats in .000 style (e.g., 0.350 → ".350", 1.100 → "1.100").
 * Handles NaN/Infinity safely by returning ".000".
 */
const fmtRate = (value: number): string => {
  if (!Number.isFinite(value)) return ".000";
  const formatted = value.toFixed(3);
  // Remove leading zero for values in [0, 1) (e.g., "0.350" → ".350")
  if (value >= 0 && value < 1) {
    return formatted.substring(1);
  }
  return formatted;
};

const PlayerDetails: React.FunctionComponent<Props> = ({
  slot,
  name,
  teamName,
  position,
  stats,
  onClear,
}) => {
  // Show empty state if no slot or no stats
  if (slot == null || stats == null) {
    return (
      <DetailContainer>
        <DetailHeadingRow>
          <span>Player Details</span>
        </DetailHeadingRow>
        <DetailEmptyState>
          Select a batter in Batting Stats to view expanded stats.
        </DetailEmptyState>
      </DetailContainer>
    );
  }

  // Calculate rate stats
  const avg = stats.atBats > 0 ? stats.hits / stats.atBats : 0;
  // PA = AB + BB + SF (sac flies count as PA but not AB)
  const pa = stats.atBats + stats.walks + stats.sacFlies;
  const obp = pa > 0 ? (stats.hits + stats.walks) / pa : 0;
  const totalBases = stats.singles + 2 * stats.doubles + 3 * stats.triples + 4 * stats.homers;
  const slg = stats.atBats > 0 ? totalBases / stats.atBats : 0;
  const ops = obp + slg;

  return (
    <DetailContainer>
      <DetailHeadingRow>
        <span>Player Details</span>
        <DetailToggle onClick={onClear} aria-label="Clear player selection">
          ✕
        </DetailToggle>
      </DetailHeadingRow>

      <DetailPlayerName>{name}</DetailPlayerName>
      <DetailSubLabel>
        {teamName} · {position ? `${position} · ` : ""}#{slot} in lineup · This game
      </DetailSubLabel>

      {/* Counting stats */}
      <StatsGrid $cols={5}>
        <StatCell>
          <StatLabel>AB</StatLabel>
          <StatValue>{stats.atBats || "–"}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>H</StatLabel>
          <StatValue>{stats.hits || "–"}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>BB</StatLabel>
          <StatValue>{stats.walks || "–"}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>K</StatLabel>
          <StatValue>{stats.strikeouts || "–"}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>RBI</StatLabel>
          <StatValue>{stats.rbi || "–"}</StatValue>
        </StatCell>
      </StatsGrid>

      {/* Base hit breakdown */}
      <StatsGrid $cols={4}>
        <StatCell>
          <StatLabel>1B</StatLabel>
          <StatValue>{stats.singles || "–"}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>2B</StatLabel>
          <StatValue>{stats.doubles || "–"}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>3B</StatLabel>
          <StatValue>{stats.triples || "–"}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>HR</StatLabel>
          <StatValue>{stats.homers || "–"}</StatValue>
        </StatCell>
      </StatsGrid>

      {/* Rate stats */}
      <StatsGrid $cols={4}>
        <StatCell>
          <StatLabel>AVG</StatLabel>
          <StatValue>{fmtRate(avg)}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>OBP</StatLabel>
          <StatValue>{fmtRate(obp)}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>SLG</StatLabel>
          <StatValue>{fmtRate(slg)}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>OPS</StatLabel>
          <StatValue>{fmtRate(ops)}</StatValue>
        </StatCell>
      </StatsGrid>
    </DetailContainer>
  );
};

export default PlayerDetails;

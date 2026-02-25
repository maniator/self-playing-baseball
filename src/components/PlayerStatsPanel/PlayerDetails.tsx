import * as React from "react";

import styled from "styled-components";

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

const Container = styled.div`
  margin-top: 12px;
  padding: 10px;
  background: #0d1117;
  border: 1px solid #222;
  border-radius: 4px;
`;

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #888;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #333;
`;

const Toggle = styled.button`
  background: none;
  border: none;
  color: #555;
  font-size: 11px;
  cursor: pointer;
  padding: 0 2px;
  &:hover {
    color: #aaa;
  }
`;

const EmptyState = styled.div`
  color: #444;
  font-size: 11px;
  padding: 8px 0;
  text-align: center;
`;

const PlayerName = styled.div`
  color: #6ab0e0;
  font-weight: 700;
  font-size: 12px;
  margin-bottom: 2px;
`;

const SubLabel = styled.div`
  color: #555;
  font-size: 10px;
  margin-bottom: 10px;
`;

const StatsGrid = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols}, 1fr);
  gap: 6px;
  margin-bottom: 8px;
`;

const StatCell = styled.div`
  text-align: center;
`;

const StatLabel = styled.div`
  color: #555;
  font-size: 10px;
  text-transform: uppercase;
  margin-bottom: 2px;
`;

const StatValue = styled.div`
  color: #e0f0ff;
  font-size: 12px;
  font-weight: 600;
`;

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
      <Container>
        <HeadingRow>
          <span>Player Details</span>
        </HeadingRow>
        <EmptyState>Select a batter in Batting Stats to view expanded stats.</EmptyState>
      </Container>
    );
  }

  // Calculate rate stats
  const avg = stats.atBats > 0 ? stats.hits / stats.atBats : 0;
  const pa = stats.atBats + stats.walks;
  const obp = pa > 0 ? (stats.hits + stats.walks) / pa : 0;
  const totalBases = stats.singles + 2 * stats.doubles + 3 * stats.triples + 4 * stats.homers;
  const slg = stats.atBats > 0 ? totalBases / stats.atBats : 0;
  const ops = obp + slg;

  return (
    <Container>
      <HeadingRow>
        <span>Player Details</span>
        <Toggle onClick={onClear} aria-label="Clear player selection">
          ✕
        </Toggle>
      </HeadingRow>

      <PlayerName>{name}</PlayerName>
      <SubLabel>
        {teamName} · {position ? `${position} · ` : ""}#{slot} in lineup · This game
      </SubLabel>

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
    </Container>
  );
};

export default PlayerDetails;

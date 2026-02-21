import * as React from "react";

import styled from "styled-components";

import { Hit } from "@constants/hitTypes";
import type { PlayLogEntry, StrikeoutEntry } from "@context/index";
import { useGameContext } from "@context/index";
import { generateRoster } from "@utils/roster";

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #888;
  margin-bottom: 6px;
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

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
`;

const TabBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  background: ${({ $active }) => ($active ? "#1a3a5a" : "transparent")};
  border: 1px solid ${({ $active }) => ($active ? "#4a8abe" : "#333")};
  color: ${({ $active }) => ($active ? "#cce8ff" : "#666")};
  border-radius: 4px;
  padding: 3px 6px;
  font-family: inherit;
  font-size: 10px;
  cursor: pointer;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
`;

const Th = styled.th`
  color: #555;
  font-weight: 600;
  text-align: right;
  padding: 2px 4px;
  border-bottom: 1px solid #222;
  &:first-child {
    text-align: left;
    width: auto;
  }
`;

const Td = styled.td<{ $highlight?: boolean }>`
  text-align: right;
  padding: 2px 4px;
  color: ${({ $highlight }) => ($highlight ? "#e0f0ff" : "#888")};
  &:first-child {
    text-align: left;
    color: #6ab0e0;
    font-weight: 700;
  }
`;

type BatterStat = { atBats: number; hits: number; walks: number; strikeouts: number };

const computeStats = (
  team: 0 | 1,
  playLog: PlayLogEntry[],
  strikeoutLog: StrikeoutEntry[],
  outLog: StrikeoutEntry[],
): Record<number, BatterStat> => {
  const stats: Record<number, BatterStat> = {};
  for (let i = 1; i <= 9; i++) {
    stats[i] = { atBats: 0, hits: 0, walks: 0, strikeouts: 0 };
  }
  for (const entry of playLog) {
    if (entry.team !== team) continue;
    if (entry.event === Hit.Walk) {
      stats[entry.batterNum].walks++;
    } else {
      stats[entry.batterNum].hits++;
    }
  }
  for (const entry of strikeoutLog) {
    if (entry.team !== team) continue;
    stats[entry.batterNum].strikeouts++;
  }
  // AB = H + outLog entries (outLog includes K + regular outs; walks are excluded from AB)
  for (const entry of outLog) {
    if (entry.team !== team) continue;
    stats[entry.batterNum].atBats++;
  }
  for (let i = 1; i <= 9; i++) {
    stats[i].atBats += stats[i].hits;
  }
  return stats;
};

const PlayerStatsPanel: React.FunctionComponent = () => {
  const { playLog, strikeoutLog, outLog, teams, lineupOrder, playerOverrides } = useGameContext();
  const [collapsed, setCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<0 | 1>(0);

  const stats = computeStats(activeTab, playLog, strikeoutLog, outLog);

  // Build slot→name map for the active team
  const slotNames = React.useMemo(() => {
    const roster = generateRoster(teams[activeTab]);
    const order =
      lineupOrder[activeTab].length > 0 ? lineupOrder[activeTab] : roster.batters.map((p) => p.id);
    const idToPlayer = new Map(roster.batters.map((p) => [p.id, p]));
    const overrides = playerOverrides[activeTab];
    return order.slice(0, 9).map((id, idx) => {
      const player = idToPlayer.get(id);
      const nickname = overrides[id]?.nickname?.trim();
      return nickname || player?.name || `Batter ${idx + 1}`;
    });
  }, [teams, activeTab, lineupOrder, playerOverrides]);

  return (
    <div data-testid="player-stats-panel">
      <HeadingRow>
        <span>Batting Stats</span>
        <Toggle
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand batting stats" : "Collapse batting stats"}
        >
          {collapsed ? "▶ show" : "▼ hide"}
        </Toggle>
      </HeadingRow>
      {!collapsed && (
        <>
          <Tabs>
            <TabBtn $active={activeTab === 0} type="button" onClick={() => setActiveTab(0)}>
              ▲ {teams[0]}
            </TabBtn>
            <TabBtn $active={activeTab === 1} type="button" onClick={() => setActiveTab(1)}>
              ▼ {teams[1]}
            </TabBtn>
          </Tabs>
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>AB</Th>
                <Th>H</Th>
                <Th>BB</Th>
                <Th>K</Th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                const s = stats[num];
                return (
                  <tr key={num}>
                    <Td>{slotNames[num - 1] ?? num}</Td>
                    <Td $highlight={s.atBats > 0}>{s.atBats || "–"}</Td>
                    <Td $highlight={s.hits > 0}>{s.hits || "–"}</Td>
                    <Td $highlight={s.walks > 0}>{s.walks || "–"}</Td>
                    <Td $highlight={s.strikeouts > 0}>{s.strikeouts || "–"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </>
      )}
    </div>
  );
};

export default PlayerStatsPanel;

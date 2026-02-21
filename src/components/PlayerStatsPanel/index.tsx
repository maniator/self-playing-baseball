import * as React from "react";

import styled from "styled-components";

import { Hit } from "@constants/hitTypes";
import type { PlayLogEntry, StrikeoutEntry } from "@context/index";
import { useGameContext } from "@context/index";

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
    width: 28px;
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

type BatterStat = { hits: number; walks: number; strikeouts: number };

const computeStats = (
  team: 0 | 1,
  playLog: PlayLogEntry[],
  strikeoutLog: StrikeoutEntry[],
): Record<number, BatterStat> => {
  const stats: Record<number, BatterStat> = {};
  for (let i = 1; i <= 9; i++) {
    stats[i] = { hits: 0, walks: 0, strikeouts: 0 };
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
  return stats;
};

const PlayerStatsPanel: React.FunctionComponent = () => {
  const { playLog, strikeoutLog, teams } = useGameContext();
  const [collapsed, setCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<0 | 1>(0);

  const stats = computeStats(activeTab, playLog, strikeoutLog);
  const hasActivity =
    playLog.some((e) => e.team === activeTab) || strikeoutLog.some((e) => e.team === activeTab);

  return (
    <>
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
          {!hasActivity ? (
            <div style={{ color: "#555", fontSize: "12px", padding: "4px 0" }}>No at-bats yet.</div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
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
                      <Td>{num}</Td>
                      <Td $highlight={s.hits > 0}>{s.hits || "–"}</Td>
                      <Td $highlight={s.walks > 0}>{s.walks || "–"}</Td>
                      <Td $highlight={s.strikeouts > 0}>{s.strikeouts || "–"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </>
      )}
    </>
  );
};

export default PlayerStatsPanel;

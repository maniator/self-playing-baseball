import * as React from "react";

import { resolveTeamLabel } from "@features/customTeams/adapters/customTeamAdapter";
import styled from "styled-components";

import { Hit } from "@constants/hitTypes";
import type { PlayLogEntry, StrikeoutEntry } from "@context/index";
import { useGameContext } from "@context/index";
import { useCustomTeams } from "@hooks/useCustomTeams";
import { appLog } from "@utils/logger";
import { generateRoster } from "@utils/roster";

import PlayerDetails, { type BatterStat } from "./PlayerDetails";

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

const Tr = styled.tr<{ $selected?: boolean }>`
  cursor: pointer;
  background: ${({ $selected }) => ($selected ? "rgba(106,176,224,0.12)" : "transparent")};
  &:hover {
    background: ${({ $selected }) =>
      $selected ? "rgba(106,176,224,0.18)" : "rgba(255,255,255,0.04)"};
  }
  &:focus-visible {
    outline: 1px solid #6ab0e0;
    outline-offset: -1px;
  }
`;

/**
 * RBI rule (simplified simulator):
 *   - hits (single/double/triple/homerun) and walks: rbi = runsScored on the play
 *   - sac bunt and fielder's choice: not credited with RBI (resolved via outLog)
 *   - older saves without an explicit rbi field are backfilled from runs at
 *     restore time (`restore_game`); stat aggregation falls back to 0 via
 *     `entry.rbi ?? 0` only for entries that are still absent after backfill
 */
const computeStats = (
  team: 0 | 1,
  playLog: PlayLogEntry[],
  strikeoutLog: StrikeoutEntry[],
  outLog: StrikeoutEntry[],
): Record<number, BatterStat> => {
  const stats: Record<number, BatterStat> = {};
  for (let i = 1; i <= 9; i++) {
    stats[i] = {
      atBats: 0,
      hits: 0,
      walks: 0,
      strikeouts: 0,
      rbi: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      homers: 0,
    };
  }
  for (const entry of playLog) {
    if (entry.team !== team) continue;
    if (entry.event === Hit.Walk) {
      stats[entry.batterNum].walks++;
    } else {
      stats[entry.batterNum].hits++;
      if (entry.event === Hit.Single) stats[entry.batterNum].singles++;
      else if (entry.event === Hit.Double) stats[entry.batterNum].doubles++;
      else if (entry.event === Hit.Triple) stats[entry.batterNum].triples++;
      else if (entry.event === Hit.Homerun) stats[entry.batterNum].homers++;
    }
    stats[entry.batterNum].rbi += entry.rbi ?? 0;
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

/**
 * Dev-mode invariant: verify batting-order PA consistency and that K ≤ AB.
 *
 * An earlier lineup slot must never have *fewer* plate appearances (AB + BB)
 * than a later slot — regardless of walk counts.  If it does, stat attribution
 * is broken.  K > AB is a separate hard impossibility (strikeouts always count
 * as official at-bats).
 *
 * Plate appearances here means AB + BB only (walks are the only non-AB PA
 * type modelled in this simulator — no sac flies, HBP, or CI).
 *
 * Only runs when import.meta.env.DEV is true; completely dead-code-eliminated
 * in production builds.
 */
const warnBattingStatsInvariant = (
  stats: Record<number, BatterStat>,
  team: 0 | 1,
  teamName: string,
): void => {
  if (!import.meta.env.DEV) return;
  for (let slot = 1; slot <= 9; slot++) {
    const s = stats[slot];
    const pa = s.atBats + s.walks;
    // K > AB is truly impossible — strikeouts always count as official at-bats.
    if (s.strikeouts > s.atBats) {
      appLog.warn(
        `[BattingStats] IMPOSSIBLE: slot ${slot} team=${team} (${teamName}) ` +
          `K=${s.strikeouts} > AB=${s.atBats}`,
      );
    }
    // Earlier batter must not have fewer PAs than the next batter.
    if (slot < 9) {
      const nextPA = stats[slot + 1].atBats + stats[slot + 1].walks;
      if (pa < nextPA) {
        appLog.warn(
          `[BattingStats] PA ordering violation: slot ${slot} PA=${pa} < slot ${slot + 1} PA=${nextPA} ` +
            `team=${team} (${teamName}). ` +
            `Note: AB can legitimately differ due to walks — check PA, not AB.`,
        );
      }
    }
  }
};

const PlayerStatsPanel: React.FunctionComponent<{ activeTeam?: 0 | 1 }> = ({ activeTeam = 0 }) => {
  const { playLog, strikeoutLog, outLog, teams, lineupOrder, playerOverrides } = useGameContext();
  const { teams: customTeams } = useCustomTeams();
  const [collapsed, setCollapsed] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState<number | null>(null);
  const teamDisplayName = resolveTeamLabel(teams[activeTeam], customTeams);

  React.useEffect(() => {
    setSelectedSlot(null);
  }, [activeTeam]);

  const stats = computeStats(activeTeam, playLog, strikeoutLog, outLog);
  warnBattingStatsInvariant(stats, activeTeam, teamDisplayName);

  const handleRowSelect = (slot: number) => {
    setSelectedSlot((prev) => (prev === slot ? null : slot));
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, slot: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowSelect(slot);
    }
  };

  // Build slot→name map for the active team
  const slotNames = React.useMemo(() => {
    const roster = generateRoster(teams[activeTeam]);
    const order =
      lineupOrder[activeTeam].length > 0
        ? lineupOrder[activeTeam]
        : roster.batters.map((p) => p.id);
    const idToPlayer = new Map(roster.batters.map((p) => [p.id, p]));
    const overrides = playerOverrides[activeTeam];
    return order.slice(0, 9).map((id, idx) => {
      const player = idToPlayer.get(id);
      const nickname = overrides[id]?.nickname?.trim();
      return nickname || player?.name || `Batter ${idx + 1}`;
    });
  }, [teams, activeTeam, lineupOrder, playerOverrides]);

  const selectedStats = selectedSlot != null ? stats[selectedSlot] : null;
  const selectedName =
    selectedSlot != null ? slotNames[selectedSlot - 1] || `Batter ${selectedSlot}` : "";

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
          <Table data-testid="batting-stats-table">
            <thead>
              <tr>
                <Th>#</Th>
                <Th>AB</Th>
                <Th>H</Th>
                <Th>BB</Th>
                <Th>K</Th>
                <Th>RBI</Th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                const s = stats[num];
                return (
                  <Tr
                    key={num}
                    $selected={selectedSlot === num}
                    onClick={() => handleRowSelect(num)}
                    onKeyDown={(e) => handleRowKeyDown(e, num)}
                    tabIndex={0}
                    role="row"
                    aria-selected={selectedSlot === num}
                    data-testid={`batter-row-${num}`}
                  >
                    <Td>{slotNames[num - 1] ?? num}</Td>
                    <Td $highlight={s.atBats > 0}>{s.atBats || "–"}</Td>
                    <Td $highlight={s.hits > 0}>{s.hits || "–"}</Td>
                    <Td $highlight={s.walks > 0}>{s.walks || "–"}</Td>
                    <Td $highlight={s.strikeouts > 0}>{s.strikeouts || "–"}</Td>
                    <Td $highlight={s.rbi > 0}>{s.rbi || "–"}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          <PlayerDetails
            slot={selectedSlot}
            name={selectedName}
            teamName={teamDisplayName}
            stats={selectedStats}
            onClear={() => setSelectedSlot(null)}
          />
        </>
      )}
    </div>
  );
};

export default PlayerStatsPanel;

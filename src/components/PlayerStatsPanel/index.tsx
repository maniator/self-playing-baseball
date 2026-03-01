/// <reference types="vite/client" />
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
/** Returns a blank batting stat record. */
const emptyBatterStat = (): BatterStat => ({
  atBats: 0,
  hits: 0,
  walks: 0,
  strikeouts: 0,
  rbi: 0,
  singles: 0,
  doubles: 0,
  triples: 0,
  homers: 0,
});

/**
 * Returns the stat key for a log entry.
 *
 * Entries carry `playerId` so stats are grouped by player rather than
 * by batting-order slot. This means a substitute's stat line starts at zero and
 * the replaced player's stats stay under their own ID.
 *
 * Older entries (no `playerId`) fall back to a slot-number string key
 * (`"slot:1"` … `"slot:9"`) so the legacy slot-based grouping still works for
 * older saves.
 */
const statKey = (entry: { playerId?: string; batterNum: number }): string =>
  entry.playerId ?? `slot:${entry.batterNum}`;

const computeStats = (
  team: 0 | 1,
  playLog: PlayLogEntry[],
  strikeoutLog: StrikeoutEntry[],
  outLog: StrikeoutEntry[],
): Record<string, BatterStat> => {
  const stats: Record<string, BatterStat> = {};
  const getOrCreate = (key: string): BatterStat => {
    if (!stats[key]) stats[key] = emptyBatterStat();
    return stats[key];
  };
  for (const entry of playLog) {
    if (entry.team !== team) continue;
    const s = getOrCreate(statKey(entry));
    if (entry.event === Hit.Walk) {
      s.walks++;
    } else {
      s.hits++;
      if (entry.event === Hit.Single) s.singles++;
      else if (entry.event === Hit.Double) s.doubles++;
      else if (entry.event === Hit.Triple) s.triples++;
      else if (entry.event === Hit.Homerun) s.homers++;
    }
    s.rbi += entry.rbi ?? 0;
  }
  for (const entry of strikeoutLog) {
    if (entry.team !== team) continue;
    getOrCreate(statKey(entry)).strikeouts++;
  }
  // AB = H + outLog entries (outLog includes K + regular outs; walks are excluded from AB)
  for (const entry of outLog) {
    if (entry.team !== team) continue;
    getOrCreate(statKey(entry)).atBats++;
  }
  // AB must also include hits (reached-base events are not in outLog)
  for (const key of Object.keys(stats)) {
    stats[key].atBats += stats[key].hits;
  }
  return stats;
};

/**
 * Dev-mode invariant: verify that K ≤ AB for each player's stat record.
 *
 * Note: the previous slot-ordering invariant (slot N must have ≥ PAs as slot N+1)
 * no longer applies once we track stats by player ID — after a substitution the
 * replaced player's ID is no longer in any active slot, so slot-order PA checks
 * would produce false positives.
 *
 * Only runs when import.meta.env.DEV is true; completely dead-code-eliminated
 * in production builds.
 */
const warnBattingStatsInvariant = (
  stats: Record<string, BatterStat>,
  team: 0 | 1,
  teamName: string,
): void => {
  if (!import.meta.env.DEV) return;
  for (const [key, s] of Object.entries(stats)) {
    if (s.strikeouts > s.atBats) {
      appLog.warn(
        `[BattingStats] IMPOSSIBLE: key=${key} team=${team} (${teamName}) ` +
          `K=${s.strikeouts} > AB=${s.atBats}`,
      );
    }
  }
};

const PlayerStatsPanel: React.FunctionComponent<{ activeTeam?: 0 | 1 }> = ({ activeTeam = 0 }) => {
  const { playLog, strikeoutLog, outLog, teams, lineupOrder, playerOverrides, lineupPositions } =
    useGameContext();
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

  // Build slot→position map for the active team.
  // lineupPositions holds the in-game defensive slot assignment set at game-start
  // (which stays fixed on substitution, preventing duplicate positions after a sub).
  // Falls back to per-player natural positions for stock teams / older saves where
  // lineupPositions is empty.
  const slotPositions = React.useMemo(() => {
    const storedPositions = lineupPositions[activeTeam];
    if (storedPositions.length > 0) {
      return storedPositions.slice(0, 9);
    }
    // Fallback: derive from roster natural positions (stock teams / older saves).
    const teamId = teams[activeTeam];
    const roster = generateRoster(teamId);
    const order =
      lineupOrder[activeTeam].length > 0
        ? lineupOrder[activeTeam]
        : roster.batters.map((p) => p.id);
    const idToGenerated = new Map(roster.batters.map((p) => [p.id, p.position]));

    let customPositions: Map<string, string> | undefined;
    if (teamId.startsWith("custom:")) {
      const customId = teamId.slice("custom:".length);
      const doc = customTeams.find((t) => t.id === customId);
      if (doc) {
        const all = [...doc.roster.lineup, ...(doc.roster.bench ?? [])];
        customPositions = new Map(all.map((p) => [p.id, p.position ?? ""]));
      }
    }

    return order.slice(0, 9).map((id) => customPositions?.get(id) ?? idToGenerated.get(id) ?? "");
  }, [lineupPositions, teams, activeTeam, lineupOrder, customTeams]);

  // Look up stats for a slot by player ID falling back to slot-number string key
  // (legacy saves where playerId was not recorded). Always returns a defined BatterStat.
  const getSlotStats = React.useCallback(
    (slotNum: number): BatterStat => {
      const playerId = lineupOrder[activeTeam][slotNum - 1];
      return (
        (playerId ? stats[playerId] : undefined) ?? stats[`slot:${slotNum}`] ?? emptyBatterStat()
      );
    },
    [stats, lineupOrder, activeTeam],
  );

  const selectedStats = selectedSlot != null ? getSlotStats(selectedSlot) : null;
  const selectedName =
    selectedSlot != null ? slotNames[selectedSlot - 1] || `Batter ${selectedSlot}` : "";
  const selectedPosition = selectedSlot != null ? (slotPositions[selectedSlot - 1] ?? "") : "";

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
                <Th>Pos</Th>
                <Th>AB</Th>
                <Th>H</Th>
                <Th>BB</Th>
                <Th>K</Th>
                <Th>RBI</Th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                const s = getSlotStats(num);
                return (
                  <Tr
                    key={num}
                    $selected={selectedSlot === num}
                    onClick={() => handleRowSelect(num)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLTableRowElement>) => handleRowKeyDown(e, num)}
                    tabIndex={0}
                    role="row"
                    aria-selected={selectedSlot === num}
                    data-testid={`batter-row-${num}`}
                  >
                    <Td>{slotNames[num - 1] ?? num}</Td>
                    <Td>{slotPositions[num - 1] || "–"}</Td>
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
            position={selectedPosition}
            stats={selectedStats}
            onClear={() => setSelectedSlot(null)}
          />
        </>
      )}
    </div>
  );
};

export default PlayerStatsPanel;

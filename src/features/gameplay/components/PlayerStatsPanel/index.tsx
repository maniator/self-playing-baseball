/// <reference types="vite/client" />
import * as React from "react";

import { GameHistoryStore } from "@feat/careerStats/storage/gameHistoryStore";
import { resolveTeamLabel } from "@feat/customTeams/adapters/customTeamAdapter";
import { useGameContext } from "@feat/gameplay/context/index";
import { useCustomTeams } from "@shared/hooks/useCustomTeams";
import { appLog } from "@shared/utils/logger";
import { generateRoster } from "@shared/utils/roster";
import {
  computeBattingStatsFromLogs,
  emptyBatterStat,
} from "@shared/utils/stats/computeBattingStatsFromLogs";

import PlayerDetails, { type BatterStat } from "./PlayerDetails";
import {
  ModeToggle,
  PanelHeadingRow,
  PanelToggle,
  StatsTable,
  StatsTableTd,
  StatsTableTh,
  StatsTableTr,
} from "./styles";

/**
 * RBI rule (simplified simulator):
 *   - hits (single/double/triple/homerun) and walks: rbi = runsScored on the play
 *   - sac bunt and fielder's choice: not credited with RBI (resolved via outLog)
 *   - older saves without an explicit rbi field are backfilled from runs at
 *     restore time (`restore_game`); stat aggregation falls back to 0 via
 *     `entry.rbi ?? 0` only for entries that are still absent after backfill
 */

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
  const [statsMode, setStatsMode] = React.useState<"game" | "career">("game");
  const [persistedCareerStats, setPersistedCareerStats] = React.useState<
    Record<string, BatterStat>
  >({});
  const teamDisplayName = resolveTeamLabel(teams[activeTeam], customTeams);

  React.useEffect(() => {
    setSelectedSlot(null);
  }, [activeTeam]);

  const gameStats = computeBattingStatsFromLogs(activeTeam, playLog, strikeoutLog, outLog);
  warnBattingStatsInvariant(gameStats, activeTeam, teamDisplayName);

  // Build the roster order and player-to-name map for this team.
  const roster = React.useMemo(() => generateRoster(teams[activeTeam]), [teams, activeTeam]);
  const lineupIds = React.useMemo(
    () =>
      lineupOrder[activeTeam].length > 0
        ? lineupOrder[activeTeam]
        : roster.batters.map((p) => p.id),
    [lineupOrder, activeTeam, roster],
  );

  // Fetch persisted career stats (from previously COMPLETED games, NOT the current game)
  // whenever the mode switches to "career" or the team/lineup changes.
  // The current game's stats are merged on top (see `stats` below) so the Career view
  // updates live during gameplay — not just after a FINAL commit.
  React.useEffect(() => {
    if (statsMode !== "career") return;
    let cancelled = false;
    const teamId = teams[activeTeam];

    // Build per-player career query keys.
    // For custom team players: use globalPlayerId (team-independent) when available,
    // so career stats follow the player across team moves.
    // For stock team players: fall back to "${teamId}:${playerId}" (team-scoped).
    let customTeamDoc: (typeof customTeams)[number] | undefined;
    if (teamId.startsWith("custom:")) {
      const customId = teamId.slice("custom:".length);
      customTeamDoc = customTeams.find((t) => t.id === customId);
    }
    const allRosterPlayers = customTeamDoc
      ? [
          ...customTeamDoc.roster.lineup,
          ...customTeamDoc.roster.bench,
          ...customTeamDoc.roster.pitchers,
        ]
      : [];

    const playerKeys = lineupIds.slice(0, 9).map((id) => {
      const player = allRosterPlayers.find((p) => p.id === id);
      return player?.globalPlayerId ?? `${teamId}:${id}`;
    });

    GameHistoryStore.getCareerStats(playerKeys)
      .then((results) => {
        if (cancelled) return;
        // Re-key by lineup player ID for consistent slot lookup.
        // The career result is keyed by playerKey (globalPlayerId or teamId:playerId).
        // Build a reverse lookup: playerKey → lineup player ID.
        const byPlayerId: Record<string, BatterStat> = {};
        lineupIds.slice(0, 9).forEach((id, idx) => {
          const pk = playerKeys[idx];
          if (results[pk]) byPlayerId[id] = results[pk];
        });
        setPersistedCareerStats(byPlayerId);
      })
      .catch((err) => {
        if (cancelled) return;
        appLog.error("PlayerStatsPanel: failed to load career stats", err);
      });
    return () => {
      cancelled = true;
    };
  }, [statsMode, teams, activeTeam, lineupIds, customTeams]);

  // Career mode = persisted history (prior completed games) + current game so far.
  // This updates live during gameplay (gameStats re-computes on every playLog change)
  // while only writing to DB once at FINAL.
  const careerStats = React.useMemo((): Record<string, BatterStat> => {
    if (statsMode !== "career") return {};
    const merged: Record<string, BatterStat> = { ...persistedCareerStats };
    for (const [playerId, cur] of Object.entries(gameStats)) {
      const prev = merged[playerId];
      if (!prev) {
        merged[playerId] = { ...cur };
      } else {
        merged[playerId] = {
          atBats: prev.atBats + cur.atBats,
          hits: prev.hits + cur.hits,
          walks: prev.walks + cur.walks,
          strikeouts: prev.strikeouts + cur.strikeouts,
          rbi: prev.rbi + cur.rbi,
          singles: prev.singles + cur.singles,
          doubles: prev.doubles + cur.doubles,
          triples: prev.triples + cur.triples,
          homers: prev.homers + cur.homers,
          sacFlies: (prev.sacFlies ?? 0) + (cur.sacFlies ?? 0),
        };
      }
    }
    return merged;
  }, [statsMode, persistedCareerStats, gameStats]);

  const stats = statsMode === "career" ? careerStats : gameStats;

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
    const idToPlayer = new Map(roster.batters.map((p) => [p.id, p]));
    const overrides = playerOverrides[activeTeam];
    return lineupIds.slice(0, 9).map((id, idx) => {
      const player = idToPlayer.get(id);
      const nickname = overrides[id]?.nickname?.trim();
      return nickname || player?.name || `Batter ${idx + 1}`;
    });
  }, [roster, activeTeam, lineupIds, playerOverrides]);

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

    return lineupIds
      .slice(0, 9)
      .map((id) => customPositions?.get(id) ?? idToGenerated.get(id) ?? "");
  }, [lineupPositions, teams, activeTeam, lineupIds, roster, customTeams]);

  // Look up stats for a slot by player ID falling back to slot-number string key
  // (legacy saves where playerId was not recorded). Always returns a defined BatterStat.
  const getSlotStats = React.useCallback(
    (slotNum: number): BatterStat => {
      const playerId = lineupIds[slotNum - 1];
      return (
        (playerId ? stats[playerId] : undefined) ?? stats[`slot:${slotNum}`] ?? emptyBatterStat()
      );
    },
    [stats, lineupIds],
  );

  const selectedStats = selectedSlot != null ? getSlotStats(selectedSlot) : null;
  const selectedName =
    selectedSlot != null ? slotNames[selectedSlot - 1] || `Batter ${selectedSlot}` : "";
  const selectedPosition = selectedSlot != null ? (slotPositions[selectedSlot - 1] ?? "") : "";

  return (
    <div data-testid="player-stats-panel">
      <PanelHeadingRow>
        <span>Batting Stats</span>
        <span>
          <ModeToggle
            $active={statsMode === "game"}
            onClick={() => setStatsMode("game")}
            aria-label="Show this game stats"
            aria-pressed={statsMode === "game"}
            data-testid="stats-mode-game"
          >
            This game
          </ModeToggle>
          <ModeToggle
            $active={statsMode === "career"}
            onClick={() => setStatsMode("career")}
            aria-label="Show career stats"
            aria-pressed={statsMode === "career"}
            data-testid="stats-mode-career"
          >
            Career
          </ModeToggle>
          <PanelToggle
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand batting stats" : "Collapse batting stats"}
          >
            {collapsed ? "▶ show" : "▼ hide"}
          </PanelToggle>
        </span>
      </PanelHeadingRow>
      {!collapsed && (
        <>
          <StatsTable data-testid="batting-stats-table">
            <thead>
              <tr>
                <StatsTableTh>#</StatsTableTh>
                <StatsTableTh>Pos</StatsTableTh>
                <StatsTableTh>AB</StatsTableTh>
                <StatsTableTh>H</StatsTableTh>
                <StatsTableTh>BB</StatsTableTh>
                <StatsTableTh>K</StatsTableTh>
                <StatsTableTh>RBI</StatsTableTh>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                const s = getSlotStats(num);
                return (
                  <StatsTableTr
                    key={num}
                    $selected={selectedSlot === num}
                    onClick={() => handleRowSelect(num)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLTableRowElement>) =>
                      handleRowKeyDown(e, num)
                    }
                    tabIndex={0}
                    role="row"
                    aria-selected={selectedSlot === num}
                    data-testid={`batter-row-${num}`}
                  >
                    <StatsTableTd>{slotNames[num - 1] ?? num}</StatsTableTd>
                    <StatsTableTd>{slotPositions[num - 1] || "–"}</StatsTableTd>
                    <StatsTableTd $highlight={s.atBats > 0}>{s.atBats || "–"}</StatsTableTd>
                    <StatsTableTd $highlight={s.hits > 0}>{s.hits || "–"}</StatsTableTd>
                    <StatsTableTd $highlight={s.walks > 0}>{s.walks || "–"}</StatsTableTd>
                    <StatsTableTd $highlight={s.strikeouts > 0}>{s.strikeouts || "–"}</StatsTableTd>
                    <StatsTableTd $highlight={s.rbi > 0}>{s.rbi || "–"}</StatsTableTd>
                  </StatsTableTr>
                );
              })}
            </tbody>
          </StatsTable>
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

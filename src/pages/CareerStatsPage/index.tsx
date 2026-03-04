/**
 * CareerStatsPage — /stats
 *
 * Displays career batting and pitching totals for a selected custom team.
 * Players link through to their individual career page (/players/:playerKey).
 */
import * as React from "react";

import { resolveTeamLabel } from "@features/customTeams/adapters/customTeamAdapter";
import { useNavigate } from "react-router";

import { BackBtn, PageHeader } from "@components/PageLayout/styles";
import { useCustomTeams } from "@hooks/useCustomTeams";
import { getDb } from "@storage/db";
import { GameHistoryStore } from "@storage/gameHistoryStore";
import type { PlayerGameStatDoc } from "@storage/types";
import { computeERA, computeWHIP, formatIP } from "@utils/stats/computePitcherGameStats";

import {
  CareerContainer,
  EmptyState,
  PageTitle,
  PlayerLink,
  StatsTable,
  TabBar,
  TabBtn,
  TableWrapper,
  Td,
  TeamSelect,
  TeamSelectLabel,
  TeamSelectorRow,
  Th,
} from "./styles";

type BattingRow = PlayerGameStatDoc["batting"] & {
  playerKey: string;
  nameAtGameTime: string;
  gamesPlayed: number;
};

type PitchingRow = {
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

type Tab = "batting" | "pitching";
type SortDir = "asc" | "desc";
type BattingSortKey =
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
type PitchingSortKey =
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

/** Formats a batting average: H/AB to 3 decimal places, or ".---" when AB=0. */
function formatAVG(hits: number, atBats: number): string {
  if (atBats === 0) return ".---";
  const avg = hits / atBats;
  return avg.toFixed(3).replace(/^0/, "");
}

/** Formats ERA: "0.00" or "—" when 0 IP. */
function formatERA(earnedRuns: number, outsPitched: number): string {
  const era = computeERA(earnedRuns, outsPitched);
  if (era === null) return "—";
  return era.toFixed(2);
}

/** Formats WHIP: "0.00" or "—" when 0 IP. */
function formatWHIP(walksAllowed: number, hitsAllowed: number, outsPitched: number): string {
  const whip = computeWHIP(walksAllowed, hitsAllowed, outsPitched);
  if (whip === null) return "—";
  return whip.toFixed(2);
}

/** Returns ↑ / ↓ / "" indicator for a sortable column header. */
function sortIndicator(key: string, activeKey: string, dir: SortDir): string {
  if (key !== activeKey) return "";
  return dir === "asc" ? " ↑" : " ↓";
}

const CareerStatsPage: React.FunctionComponent = () => {
  const navigate = useNavigate();
  const { teams: customTeams, loading: teamsLoading } = useCustomTeams();

  const [activeTab, setActiveTab] = React.useState<Tab>("batting");
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>("");
  const [teamsWithHistory, setTeamsWithHistory] = React.useState<string[]>([]);
  const [battingRows, setBattingRows] = React.useState<BattingRow[]>([]);
  const [pitchingRows, setPitchingRows] = React.useState<PitchingRow[]>([]);
  const [dataLoading, setDataLoading] = React.useState(false);
  const [battingSort, setBattingSort] = React.useState<{ key: BattingSortKey; dir: SortDir }>({
    key: "gamesPlayed",
    dir: "desc",
  });
  const [pitchingSort, setPitchingSort] = React.useState<{ key: PitchingSortKey; dir: SortDir }>({
    key: "gamesPlayed",
    dir: "desc",
  });

  const toggleBattingSort = (key: BattingSortKey) => {
    setBattingSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );
  };
  const togglePitchingSort = (key: PitchingSortKey) => {
    setPitchingSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );
  };

  const handleBattingThClick = React.useCallback(
    (e: React.MouseEvent<HTMLTableCellElement>) => {
      const key = (e.currentTarget as HTMLElement).dataset.sortKey as BattingSortKey | undefined;
      if (key) toggleBattingSort(key);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [battingSort],
  );

  const handlePitchingThClick = React.useCallback(
    (e: React.MouseEvent<HTMLTableCellElement>) => {
      const key = (e.currentTarget as HTMLElement).dataset.sortKey as PitchingSortKey | undefined;
      if (key) togglePitchingSort(key);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pitchingSort],
  );

  const sortedBattingRows = React.useMemo(() => {
    const { key, dir } = battingSort;
    return [...battingRows].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      if (key === "avg") {
        aVal = a.atBats === 0 ? -1 : a.hits / a.atBats;
        bVal = b.atBats === 0 ? -1 : b.hits / b.atBats;
      } else if (key === "nameAtGameTime") {
        aVal = a.nameAtGameTime;
        bVal = b.nameAtGameTime;
      } else {
        aVal = a[key] as number;
        bVal = b[key] as number;
      }
      if (aVal < bVal) return dir === "asc" ? -1 : 1;
      if (aVal > bVal) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [battingRows, battingSort]);

  const sortedPitchingRows = React.useMemo(() => {
    const { key, dir } = pitchingSort;
    return [...pitchingRows].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      if (key === "era") {
        aVal = a.outsPitched === 0 ? Infinity : (a.earnedRuns * 27) / a.outsPitched;
        bVal = b.outsPitched === 0 ? Infinity : (b.earnedRuns * 27) / b.outsPitched;
      } else if (key === "whip") {
        aVal =
          a.outsPitched === 0 ? Infinity : ((a.walksAllowed + a.hitsAllowed) * 3) / a.outsPitched;
        bVal =
          b.outsPitched === 0 ? Infinity : ((b.walksAllowed + b.hitsAllowed) * 3) / b.outsPitched;
      } else if (key === "nameAtGameTime") {
        aVal = a.nameAtGameTime;
        bVal = b.nameAtGameTime;
      } else {
        aVal = a[key] as number;
        bVal = b[key] as number;
      }
      if (aVal < bVal) return dir === "asc" ? -1 : 1;
      if (aVal > bVal) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [pitchingRows, pitchingSort]);

  // Build the full list of selectable team IDs:
  // union of custom teams + any team IDs found in game history.
  const selectableTeamIds = React.useMemo<string[]>(() => {
    const customIds = customTeams.map((t) => `custom:${t.id}`);
    const union = new Set([...customIds, ...teamsWithHistory]);
    return Array.from(union);
  }, [customTeams, teamsWithHistory]);

  // Fetch all distinct team IDs that appear in game history.
  React.useEffect(() => {
    let cancelled = false;
    async function loadTeamIds() {
      try {
        const db = await getDb();
        const [batting, pitching] = await Promise.all([
          db.playerGameStats.find().exec(),
          db.pitcherGameStats.find().exec(),
        ]);
        if (cancelled) return;
        const ids = new Set<string>();
        for (const row of batting) ids.add(row.toJSON().teamId);
        for (const row of pitching) ids.add(row.toJSON().teamId);
        setTeamsWithHistory(Array.from(ids));
      } catch {
        // Silently degrade — history just won't include non-custom teams.
      }
    }
    void loadTeamIds();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-select the first team once we have options.
  React.useEffect(() => {
    if (!teamsLoading && selectableTeamIds.length > 0 && selectedTeamId === "") {
      setSelectedTeamId(selectableTeamIds[0]);
    }
  }, [teamsLoading, selectableTeamIds, selectedTeamId]);

  // Fetch stats when selected team changes.
  React.useEffect(() => {
    if (!selectedTeamId) {
      setBattingRows([]);
      setPitchingRows([]);
      return;
    }
    let cancelled = false;
    setDataLoading(true);
    async function loadStats() {
      try {
        const [batting, pitching] = await Promise.all([
          GameHistoryStore.getTeamCareerBattingStats(selectedTeamId),
          GameHistoryStore.getTeamCareerPitchingStats(selectedTeamId),
        ]);
        if (cancelled) return;
        setBattingRows(batting);
        setPitchingRows(pitching);
      } catch {
        if (!cancelled) {
          setBattingRows([]);
          setPitchingRows([]);
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [selectedTeamId]);

  const isEmpty =
    !dataLoading && selectedTeamId !== "" && battingRows.length === 0 && pitchingRows.length === 0;

  // When there are no teams at all (fresh install, no history) show a special message.
  const noTeams = !teamsLoading && selectableTeamIds.length === 0;

  return (
    <CareerContainer data-testid="career-stats-page">
      <PageHeader>
        <BackBtn type="button" onClick={() => navigate("/")} aria-label="Go back to home">
          ← Back
        </BackBtn>
      </PageHeader>

      <PageTitle>📊 Career Stats</PageTitle>

      {noTeams ? (
        <EmptyState data-testid="career-stats-no-teams">
          No teams yet. Create a team and play a completed game to see career stats.
        </EmptyState>
      ) : (
        <>
          <TeamSelectorRow>
            <TeamSelectLabel htmlFor="career-stats-team-select">Team:</TeamSelectLabel>
            <TeamSelect
              id="career-stats-team-select"
              data-testid="career-stats-team-select"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              {selectableTeamIds.map((id) => (
                <option key={id} value={id}>
                  {resolveTeamLabel(id, customTeams)}
                </option>
              ))}
            </TeamSelect>
          </TeamSelectorRow>

          <TabBar>
            <TabBtn
              type="button"
              $active={activeTab === "batting"}
              onClick={() => setActiveTab("batting")}
              data-testid="career-stats-batting-tab"
            >
              Batting
            </TabBtn>
            <TabBtn
              type="button"
              $active={activeTab === "pitching"}
              onClick={() => setActiveTab("pitching")}
              data-testid="career-stats-pitching-tab"
            >
              Pitching
            </TabBtn>
          </TabBar>

          {isEmpty && (
            <EmptyState data-testid="career-stats-empty">
              No completed games yet for this team.
            </EmptyState>
          )}

          {!isEmpty && activeTab === "batting" && battingRows.length > 0 && (
            <TableWrapper>
              <StatsTable>
                <thead>
                  <tr>
                    <Th $sortable data-sort-key="nameAtGameTime" onClick={handleBattingThClick}>
                      Name{sortIndicator("nameAtGameTime", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="gamesPlayed" onClick={handleBattingThClick}>
                      G{sortIndicator("gamesPlayed", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="atBats" onClick={handleBattingThClick}>
                      AB{sortIndicator("atBats", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="hits" onClick={handleBattingThClick}>
                      H{sortIndicator("hits", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="doubles" onClick={handleBattingThClick}>
                      2B{sortIndicator("doubles", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="triples" onClick={handleBattingThClick}>
                      3B{sortIndicator("triples", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="homers" onClick={handleBattingThClick}>
                      HR{sortIndicator("homers", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="walks" onClick={handleBattingThClick}>
                      BB{sortIndicator("walks", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="strikeouts" onClick={handleBattingThClick}>
                      K{sortIndicator("strikeouts", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="rbi" onClick={handleBattingThClick}>
                      RBI{sortIndicator("rbi", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="avg" onClick={handleBattingThClick}>
                      AVG{sortIndicator("avg", battingSort.key, battingSort.dir)}
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBattingRows.map((row) => (
                    <tr key={row.playerKey}>
                      <Td>
                        <PlayerLink
                          type="button"
                          onClick={() =>
                            navigate(
                              `/players/${encodeURIComponent(row.playerKey)}?team=${encodeURIComponent(selectedTeamId)}`,
                            )
                          }
                        >
                          {row.nameAtGameTime}
                        </PlayerLink>
                      </Td>
                      <Td>{row.gamesPlayed}</Td>
                      <Td>{row.atBats}</Td>
                      <Td>{row.hits}</Td>
                      <Td>{row.doubles}</Td>
                      <Td>{row.triples}</Td>
                      <Td>{row.homers}</Td>
                      <Td>{row.walks}</Td>
                      <Td>{row.strikeouts}</Td>
                      <Td>{row.rbi}</Td>
                      <Td>{formatAVG(row.hits, row.atBats)}</Td>
                    </tr>
                  ))}
                </tbody>
              </StatsTable>
            </TableWrapper>
          )}

          {!isEmpty && activeTab === "pitching" && pitchingRows.length > 0 && (
            <TableWrapper>
              <StatsTable>
                <thead>
                  <tr>
                    <Th $sortable data-sort-key="nameAtGameTime" onClick={handlePitchingThClick}>
                      Name{sortIndicator("nameAtGameTime", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="gamesPlayed" onClick={handlePitchingThClick}>
                      G{sortIndicator("gamesPlayed", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="outsPitched" onClick={handlePitchingThClick}>
                      IP{sortIndicator("outsPitched", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="hitsAllowed" onClick={handlePitchingThClick}>
                      H{sortIndicator("hitsAllowed", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="walksAllowed" onClick={handlePitchingThClick}>
                      BB{sortIndicator("walksAllowed", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="strikeoutsRecorded"
                      onClick={handlePitchingThClick}
                    >
                      K{sortIndicator("strikeoutsRecorded", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="homersAllowed" onClick={handlePitchingThClick}>
                      HR{sortIndicator("homersAllowed", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="runsAllowed" onClick={handlePitchingThClick}>
                      R{sortIndicator("runsAllowed", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="earnedRuns" onClick={handlePitchingThClick}>
                      ER{sortIndicator("earnedRuns", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="era" onClick={handlePitchingThClick}>
                      ERA{sortIndicator("era", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="whip" onClick={handlePitchingThClick}>
                      WHIP{sortIndicator("whip", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="saves" onClick={handlePitchingThClick}>
                      SV{sortIndicator("saves", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="holds" onClick={handlePitchingThClick}>
                      HLD{sortIndicator("holds", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th $sortable data-sort-key="blownSaves" onClick={handlePitchingThClick}>
                      BS{sortIndicator("blownSaves", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPitchingRows.map((row) => (
                    <tr key={row.pitcherKey}>
                      <Td>
                        <PlayerLink
                          type="button"
                          onClick={() =>
                            navigate(
                              `/players/${encodeURIComponent(row.pitcherKey)}?team=${encodeURIComponent(selectedTeamId)}`,
                            )
                          }
                        >
                          {row.nameAtGameTime}
                        </PlayerLink>
                      </Td>
                      <Td>{row.gamesPlayed}</Td>
                      <Td>{formatIP(row.outsPitched)}</Td>
                      <Td>{row.hitsAllowed}</Td>
                      <Td>{row.walksAllowed}</Td>
                      <Td>{row.strikeoutsRecorded}</Td>
                      <Td>{row.homersAllowed}</Td>
                      <Td>{row.runsAllowed}</Td>
                      <Td>{row.earnedRuns}</Td>
                      <Td>{formatERA(row.earnedRuns, row.outsPitched)}</Td>
                      <Td>{formatWHIP(row.walksAllowed, row.hitsAllowed, row.outsPitched)}</Td>
                      <Td>{row.saves}</Td>
                      <Td>{row.holds}</Td>
                      <Td>{row.blownSaves}</Td>
                    </tr>
                  ))}
                </tbody>
              </StatsTable>
            </TableWrapper>
          )}
        </>
      )}
    </CareerContainer>
  );
};

export default CareerStatsPage;

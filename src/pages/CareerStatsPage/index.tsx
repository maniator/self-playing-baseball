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
import {
  GameHistoryStore,
  MIN_AB_FOR_AVG_LEADER,
  MIN_OUTS_FOR_ERA_LEADER,
} from "@storage/gameHistoryStore";
import type {
  BattingLeader,
  PitchingLeader,
  PlayerGameStatDoc,
  TeamCareerSummary,
} from "@storage/types";
import { computeERA, computeWHIP, formatIP } from "@utils/stats/computePitcherGameStats";

import {
  CareerContainer,
  EmptyState,
  LeaderCard,
  LeaderCardPlaceholder,
  LeaderCardsRow,
  LeaderName,
  LeaderPlaceholderText,
  LeadersGroupLabel,
  LeaderStatLabel,
  LeaderValue,
  PageTitle,
  PlayerLink,
  StatsTable,
  SummaryCell,
  SummaryCellLabel,
  SummaryCellValue,
  SummaryGrid,
  SummaryHeading,
  TabBar,
  TabBtn,
  TableWrapper,
  Td,
  TeamSelect,
  TeamSelectLabel,
  TeamSelectorRow,
  TeamSummarySection,
  Th,
} from "./styles";

/** Converts a raw outs count to an innings-pitched display string (e.g. 30 → "10.0"). */
function formatOutsAsIP(outs: number): string {
  return formatIP(outs);
}

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

/** Formats win percentage to 3 decimal places, e.g. ".667". */
function formatWinPct(winPct: number): string {
  return winPct.toFixed(3).replace(/^0/, "");
}

/** Formats runs per game to 2 decimal places. */
function formatRPG(rpg: number): string {
  return rpg.toFixed(2);
}

/** Returns ↑ / ↓ / "" indicator for a sortable column header. */
function sortIndicator(key: string, activeKey: string, dir: SortDir): string {
  if (key !== activeKey) return "";
  return dir === "asc" ? " ↑" : " ↓";
}

/** Returns the aria-sort value for a sortable column header. */
function ariaSortValue(
  key: string,
  activeKey: string,
  dir: SortDir,
): "ascending" | "descending" | "none" {
  if (key !== activeKey) return "none";
  return dir === "asc" ? "ascending" : "descending";
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
  const [teamSummary, setTeamSummary] = React.useState<TeamCareerSummary | null>(null);
  const [hrLeader, setHrLeader] = React.useState<BattingLeader | null>(null);
  const [avgLeader, setAvgLeader] = React.useState<BattingLeader | null>(null);
  const [rbiLeader, setRbiLeader] = React.useState<BattingLeader | null>(null);
  const [eraLeader, setEraLeader] = React.useState<PitchingLeader | null>(null);
  const [savesLeader, setSavesLeader] = React.useState<PitchingLeader | null>(null);
  const [strikeoutsLeader, setStrikeoutsLeader] = React.useState<PitchingLeader | null>(null);
  const [battingSort, setBattingSort] = React.useState<{ key: BattingSortKey; dir: SortDir }>({
    key: "gamesPlayed",
    dir: "desc",
  });
  const [pitchingSort, setPitchingSort] = React.useState<{ key: PitchingSortKey; dir: SortDir }>({
    key: "gamesPlayed",
    dir: "desc",
  });

  const toggleBattingSort = React.useCallback((key: BattingSortKey) => {
    setBattingSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );
  }, []);

  const togglePitchingSort = React.useCallback((key: PitchingSortKey) => {
    setPitchingSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );
  }, []);

  const handleBattingThClick = React.useCallback(
    (e: React.MouseEvent<HTMLTableCellElement>) => {
      const key = (e.currentTarget as HTMLElement).dataset.sortKey as BattingSortKey | undefined;
      if (key) toggleBattingSort(key);
    },
    [toggleBattingSort],
  );

  const handlePitchingThClick = React.useCallback(
    (e: React.MouseEvent<HTMLTableCellElement>) => {
      const key = (e.currentTarget as HTMLElement).dataset.sortKey as PitchingSortKey | undefined;
      if (key) togglePitchingSort(key);
    },
    [togglePitchingSort],
  );

  const handleBattingThKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTableCellElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const key = (e.currentTarget as HTMLElement).dataset.sortKey as BattingSortKey | undefined;
        if (key) toggleBattingSort(key);
      }
    },
    [toggleBattingSort],
  );

  const handlePitchingThKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTableCellElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const key = (e.currentTarget as HTMLElement).dataset.sortKey as PitchingSortKey | undefined;
        if (key) togglePitchingSort(key);
      }
    },
    [togglePitchingSort],
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
      setTeamSummary(null);
      setHrLeader(null);
      setAvgLeader(null);
      setRbiLeader(null);
      setEraLeader(null);
      setSavesLeader(null);
      setStrikeoutsLeader(null);
      return;
    }
    let cancelled = false;
    setDataLoading(true);
    async function loadStats() {
      try {
        // Fetch batting stats, pitching stats, and team summary in parallel.
        // Then pass the already-fetched rows to the leader functions to avoid
        // redundant DB queries (batting + pitching rows are re-used for leaders).
        const [batting, pitching, summary] = await Promise.all([
          GameHistoryStore.getTeamCareerBattingStats(selectedTeamId),
          GameHistoryStore.getTeamCareerPitchingStats(selectedTeamId),
          GameHistoryStore.getTeamCareerSummary(selectedTeamId),
        ]);
        const [battingLeaders, pitchingLeaders] = await Promise.all([
          GameHistoryStore.getTeamBattingLeaders(selectedTeamId, { rows: batting }),
          GameHistoryStore.getTeamPitchingLeaders(selectedTeamId, { rows: pitching }),
        ]);
        if (cancelled) return;
        setBattingRows(batting);
        setPitchingRows(pitching);
        setTeamSummary(summary);
        setHrLeader(battingLeaders.hrLeader);
        setAvgLeader(battingLeaders.avgLeader);
        setRbiLeader(battingLeaders.rbiLeader);
        setEraLeader(pitchingLeaders.eraLeader);
        setSavesLeader(pitchingLeaders.savesLeader);
        setStrikeoutsLeader(pitchingLeaders.strikeoutsLeader);
      } catch {
        if (!cancelled) {
          setBattingRows([]);
          setPitchingRows([]);
          setTeamSummary(null);
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

          {/* Team Summary + Leaders panel */}
          {!dataLoading && teamSummary && (
            <TeamSummarySection data-testid="team-summary-section">
              <SummaryHeading>Team Summary</SummaryHeading>
              <SummaryGrid data-testid="team-summary-grid">
                <SummaryCell>
                  <SummaryCellLabel>GP</SummaryCellLabel>
                  <SummaryCellValue data-testid="summary-gp">
                    {teamSummary.gamesPlayed}
                  </SummaryCellValue>
                </SummaryCell>
                <SummaryCell>
                  <SummaryCellLabel>W-L</SummaryCellLabel>
                  <SummaryCellValue data-testid="summary-wl">
                    {teamSummary.wins}-{teamSummary.losses}
                    {teamSummary.ties > 0 ? `-${teamSummary.ties}` : ""}
                  </SummaryCellValue>
                </SummaryCell>
                <SummaryCell>
                  <SummaryCellLabel>WIN%</SummaryCellLabel>
                  <SummaryCellValue data-testid="summary-winpct">
                    {formatWinPct(teamSummary.winPct)}
                  </SummaryCellValue>
                </SummaryCell>
                <SummaryCell>
                  <SummaryCellLabel>RS</SummaryCellLabel>
                  <SummaryCellValue data-testid="summary-rs">
                    {teamSummary.runsScored}
                  </SummaryCellValue>
                </SummaryCell>
                <SummaryCell>
                  <SummaryCellLabel>RA</SummaryCellLabel>
                  <SummaryCellValue data-testid="summary-ra">
                    {teamSummary.runsAllowed}
                  </SummaryCellValue>
                </SummaryCell>
                <SummaryCell>
                  <SummaryCellLabel>DIFF</SummaryCellLabel>
                  <SummaryCellValue data-testid="summary-diff">
                    {teamSummary.runDiff > 0 ? "+" : ""}
                    {teamSummary.runDiff}
                  </SummaryCellValue>
                </SummaryCell>
                <SummaryCell>
                  <SummaryCellLabel>RS/G</SummaryCellLabel>
                  <SummaryCellValue data-testid="summary-rspg">
                    {formatRPG(teamSummary.rsPerGame)}
                  </SummaryCellValue>
                </SummaryCell>
                <SummaryCell>
                  <SummaryCellLabel>RA/G</SummaryCellLabel>
                  <SummaryCellValue data-testid="summary-rapg">
                    {formatRPG(teamSummary.raPerGame)}
                  </SummaryCellValue>
                </SummaryCell>
                <SummaryCell>
                  <SummaryCellLabel>STREAK</SummaryCellLabel>
                  <SummaryCellValue data-testid="summary-streak">
                    {teamSummary.streak}
                  </SummaryCellValue>
                </SummaryCell>
                <SummaryCell>
                  <SummaryCellLabel>LAST 10</SummaryCellLabel>
                  <SummaryCellValue data-testid="summary-last10">
                    {teamSummary.last10.wins}-{teamSummary.last10.losses}
                    {teamSummary.last10.ties > 0 ? `-${teamSummary.last10.ties}` : ""}
                  </SummaryCellValue>
                </SummaryCell>
              </SummaryGrid>

              <LeadersGroupLabel>Batting Leaders</LeadersGroupLabel>
              <LeaderCardsRow data-testid="batting-leaders-row">
                {hrLeader ? (
                  <LeaderCard
                    type="button"
                    data-testid="hr-leader-card"
                    onClick={() =>
                      navigate(
                        `/players/${encodeURIComponent(hrLeader.playerKey)}?team=${encodeURIComponent(selectedTeamId)}`,
                      )
                    }
                  >
                    <LeaderStatLabel>HR</LeaderStatLabel>
                    <LeaderValue>{hrLeader.value}</LeaderValue>
                    <LeaderName>{hrLeader.nameAtGameTime}</LeaderName>
                  </LeaderCard>
                ) : (
                  <LeaderCardPlaceholder>
                    <LeaderPlaceholderText>HR — no data</LeaderPlaceholderText>
                  </LeaderCardPlaceholder>
                )}
                {avgLeader ? (
                  <LeaderCard
                    type="button"
                    data-testid="avg-leader-card"
                    onClick={() =>
                      navigate(
                        `/players/${encodeURIComponent(avgLeader.playerKey)}?team=${encodeURIComponent(selectedTeamId)}`,
                      )
                    }
                  >
                    <LeaderStatLabel>
                      AVG{" "}
                      <span aria-label={`minimum ${MIN_AB_FOR_AVG_LEADER} at-bats required`}>
                        (min {MIN_AB_FOR_AVG_LEADER} AB)
                      </span>
                    </LeaderStatLabel>
                    <LeaderValue>{avgLeader.value.toFixed(3).replace(/^0/, "")}</LeaderValue>
                    <LeaderName>{avgLeader.nameAtGameTime}</LeaderName>
                  </LeaderCard>
                ) : (
                  <LeaderCardPlaceholder>
                    <LeaderPlaceholderText>AVG — no qualifier</LeaderPlaceholderText>
                  </LeaderCardPlaceholder>
                )}
                {rbiLeader ? (
                  <LeaderCard
                    type="button"
                    data-testid="rbi-leader-card"
                    onClick={() =>
                      navigate(
                        `/players/${encodeURIComponent(rbiLeader.playerKey)}?team=${encodeURIComponent(selectedTeamId)}`,
                      )
                    }
                  >
                    <LeaderStatLabel>RBI</LeaderStatLabel>
                    <LeaderValue>{rbiLeader.value}</LeaderValue>
                    <LeaderName>{rbiLeader.nameAtGameTime}</LeaderName>
                  </LeaderCard>
                ) : (
                  <LeaderCardPlaceholder>
                    <LeaderPlaceholderText>RBI — no data</LeaderPlaceholderText>
                  </LeaderCardPlaceholder>
                )}
              </LeaderCardsRow>

              <LeadersGroupLabel>Pitching Leaders</LeadersGroupLabel>
              <LeaderCardsRow data-testid="pitching-leaders-row">
                {eraLeader ? (
                  <LeaderCard
                    type="button"
                    data-testid="era-leader-card"
                    onClick={() =>
                      navigate(
                        `/players/${encodeURIComponent(eraLeader.pitcherKey)}?team=${encodeURIComponent(selectedTeamId)}`,
                      )
                    }
                  >
                    <LeaderStatLabel>
                      ERA (min {formatOutsAsIP(MIN_OUTS_FOR_ERA_LEADER)} IP)
                    </LeaderStatLabel>
                    <LeaderValue>{eraLeader.value.toFixed(2)}</LeaderValue>
                    <LeaderName>{eraLeader.nameAtGameTime}</LeaderName>
                  </LeaderCard>
                ) : (
                  <LeaderCardPlaceholder>
                    <LeaderPlaceholderText>ERA — no qualifier</LeaderPlaceholderText>
                  </LeaderCardPlaceholder>
                )}
                {savesLeader ? (
                  <LeaderCard
                    type="button"
                    data-testid="saves-leader-card"
                    onClick={() =>
                      navigate(
                        `/players/${encodeURIComponent(savesLeader.pitcherKey)}?team=${encodeURIComponent(selectedTeamId)}`,
                      )
                    }
                  >
                    <LeaderStatLabel>SV</LeaderStatLabel>
                    <LeaderValue>{savesLeader.value}</LeaderValue>
                    <LeaderName>{savesLeader.nameAtGameTime}</LeaderName>
                  </LeaderCard>
                ) : (
                  <LeaderCardPlaceholder>
                    <LeaderPlaceholderText>SV — no data</LeaderPlaceholderText>
                  </LeaderCardPlaceholder>
                )}
                {strikeoutsLeader ? (
                  <LeaderCard
                    type="button"
                    data-testid="k-leader-card"
                    onClick={() =>
                      navigate(
                        `/players/${encodeURIComponent(strikeoutsLeader.pitcherKey)}?team=${encodeURIComponent(selectedTeamId)}`,
                      )
                    }
                  >
                    <LeaderStatLabel>K</LeaderStatLabel>
                    <LeaderValue>{strikeoutsLeader.value}</LeaderValue>
                    <LeaderName>{strikeoutsLeader.nameAtGameTime}</LeaderName>
                  </LeaderCard>
                ) : (
                  <LeaderCardPlaceholder>
                    <LeaderPlaceholderText>K — no data</LeaderPlaceholderText>
                  </LeaderCardPlaceholder>
                )}
              </LeaderCardsRow>
            </TeamSummarySection>
          )}

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
                    <Th
                      $sortable
                      data-sort-key="nameAtGameTime"
                      onClick={handleBattingThClick}
                      onKeyDown={handleBattingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("nameAtGameTime", battingSort.key, battingSort.dir)}
                    >
                      Name{sortIndicator("nameAtGameTime", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="gamesPlayed"
                      onClick={handleBattingThClick}
                      onKeyDown={handleBattingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("gamesPlayed", battingSort.key, battingSort.dir)}
                    >
                      G{sortIndicator("gamesPlayed", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="atBats"
                      onClick={handleBattingThClick}
                      onKeyDown={handleBattingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("atBats", battingSort.key, battingSort.dir)}
                    >
                      AB{sortIndicator("atBats", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="hits"
                      onClick={handleBattingThClick}
                      onKeyDown={handleBattingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("hits", battingSort.key, battingSort.dir)}
                    >
                      H{sortIndicator("hits", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="doubles"
                      onClick={handleBattingThClick}
                      onKeyDown={handleBattingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("doubles", battingSort.key, battingSort.dir)}
                    >
                      2B{sortIndicator("doubles", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="triples"
                      onClick={handleBattingThClick}
                      onKeyDown={handleBattingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("triples", battingSort.key, battingSort.dir)}
                    >
                      3B{sortIndicator("triples", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="homers"
                      onClick={handleBattingThClick}
                      onKeyDown={handleBattingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("homers", battingSort.key, battingSort.dir)}
                    >
                      HR{sortIndicator("homers", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="walks"
                      onClick={handleBattingThClick}
                      onKeyDown={handleBattingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("walks", battingSort.key, battingSort.dir)}
                    >
                      BB{sortIndicator("walks", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="strikeouts"
                      onClick={handleBattingThClick}
                      onKeyDown={handleBattingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("strikeouts", battingSort.key, battingSort.dir)}
                    >
                      K{sortIndicator("strikeouts", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="rbi"
                      onClick={handleBattingThClick}
                      onKeyDown={handleBattingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("rbi", battingSort.key, battingSort.dir)}
                    >
                      RBI{sortIndicator("rbi", battingSort.key, battingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="avg"
                      onClick={handleBattingThClick}
                      onKeyDown={handleBattingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("avg", battingSort.key, battingSort.dir)}
                    >
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
                    <Th
                      $sortable
                      data-sort-key="nameAtGameTime"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue(
                        "nameAtGameTime",
                        pitchingSort.key,
                        pitchingSort.dir,
                      )}
                    >
                      Name{sortIndicator("nameAtGameTime", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="gamesPlayed"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("gamesPlayed", pitchingSort.key, pitchingSort.dir)}
                    >
                      G{sortIndicator("gamesPlayed", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="outsPitched"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("outsPitched", pitchingSort.key, pitchingSort.dir)}
                    >
                      IP{sortIndicator("outsPitched", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="hitsAllowed"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("hitsAllowed", pitchingSort.key, pitchingSort.dir)}
                    >
                      H{sortIndicator("hitsAllowed", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="walksAllowed"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("walksAllowed", pitchingSort.key, pitchingSort.dir)}
                    >
                      BB{sortIndicator("walksAllowed", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="strikeoutsRecorded"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue(
                        "strikeoutsRecorded",
                        pitchingSort.key,
                        pitchingSort.dir,
                      )}
                    >
                      K{sortIndicator("strikeoutsRecorded", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="homersAllowed"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("homersAllowed", pitchingSort.key, pitchingSort.dir)}
                    >
                      HR{sortIndicator("homersAllowed", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="runsAllowed"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("runsAllowed", pitchingSort.key, pitchingSort.dir)}
                    >
                      R{sortIndicator("runsAllowed", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="earnedRuns"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("earnedRuns", pitchingSort.key, pitchingSort.dir)}
                    >
                      ER{sortIndicator("earnedRuns", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="era"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("era", pitchingSort.key, pitchingSort.dir)}
                    >
                      ERA{sortIndicator("era", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="whip"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("whip", pitchingSort.key, pitchingSort.dir)}
                    >
                      WHIP{sortIndicator("whip", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="saves"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("saves", pitchingSort.key, pitchingSort.dir)}
                    >
                      SV{sortIndicator("saves", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="holds"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("holds", pitchingSort.key, pitchingSort.dir)}
                    >
                      HLD{sortIndicator("holds", pitchingSort.key, pitchingSort.dir)}
                    </Th>
                    <Th
                      $sortable
                      data-sort-key="blownSaves"
                      onClick={handlePitchingThClick}
                      onKeyDown={handlePitchingThKeyDown}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={ariaSortValue("blownSaves", pitchingSort.key, pitchingSort.dir)}
                    >
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

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

const CareerStatsPage: React.FunctionComponent = () => {
  const navigate = useNavigate();
  const { teams: customTeams, loading: teamsLoading } = useCustomTeams();

  const [activeTab, setActiveTab] = React.useState<Tab>("batting");
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>("");
  const [teamsWithHistory, setTeamsWithHistory] = React.useState<string[]>([]);
  const [battingRows, setBattingRows] = React.useState<BattingRow[]>([]);
  const [pitchingRows, setPitchingRows] = React.useState<PitchingRow[]>([]);
  const [dataLoading, setDataLoading] = React.useState(false);

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

  return (
    <CareerContainer data-testid="career-stats-page">
      <PageHeader>
        <BackBtn type="button" onClick={() => navigate("/")} aria-label="Go back to home">
          ← Back
        </BackBtn>
      </PageHeader>

      <PageTitle>📊 Career Stats</PageTitle>

      <TeamSelectorRow>
        <TeamSelectLabel htmlFor="career-stats-team-select">Team:</TeamSelectLabel>
        <TeamSelect
          id="career-stats-team-select"
          data-testid="career-stats-team-select"
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
        >
          {selectableTeamIds.length === 0 && <option value="">— No teams —</option>}
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
                <Th>Name</Th>
                <Th>G</Th>
                <Th>AB</Th>
                <Th>H</Th>
                <Th>2B</Th>
                <Th>3B</Th>
                <Th>HR</Th>
                <Th>BB</Th>
                <Th>K</Th>
                <Th>RBI</Th>
                <Th>AVG</Th>
              </tr>
            </thead>
            <tbody>
              {battingRows.map((row) => (
                <tr key={row.playerKey}>
                  <Td>
                    <PlayerLink
                      type="button"
                      onClick={() => navigate(`/players/${encodeURIComponent(row.playerKey)}`)}
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
                <Th>Name</Th>
                <Th>G</Th>
                <Th>IP</Th>
                <Th>H</Th>
                <Th>BB</Th>
                <Th>K</Th>
                <Th>HR</Th>
                <Th>R</Th>
                <Th>ER</Th>
                <Th>ERA</Th>
                <Th>WHIP</Th>
                <Th>SV</Th>
                <Th>HLD</Th>
                <Th>BS</Th>
              </tr>
            </thead>
            <tbody>
              {pitchingRows.map((row) => (
                <tr key={row.pitcherKey}>
                  <Td>
                    <PlayerLink
                      type="button"
                      onClick={() => navigate(`/players/${encodeURIComponent(row.pitcherKey)}`)}
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
    </CareerContainer>
  );
};

export default CareerStatsPage;

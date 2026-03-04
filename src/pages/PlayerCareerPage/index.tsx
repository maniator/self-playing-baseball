/**
 * PlayerCareerPage — /players/:playerKey
 *
 * Displays career game-by-game batting and pitching history for a single player.
 * Shows career totals row above the per-game log.
 */
import * as React from "react";

import { resolveTeamLabel } from "@features/customTeams/adapters/customTeamAdapter";
import { useNavigate, useParams } from "react-router";

import { BackBtn, PageHeader } from "@components/PageLayout/styles";
import { useCustomTeams } from "@hooks/useCustomTeams";
import { GameHistoryStore } from "@storage/gameHistoryStore";
import type { PitcherGameStatDoc, PlayerGameStatDoc } from "@storage/types";
import { computeERA, computeWHIP, formatIP } from "@utils/stats/computePitcherGameStats";

import {
  EmptyState,
  PlayerCareerContainer,
  PlayerName,
  PlayerRoleLabel,
  SectionLabel,
  StatsTable,
  TabBar,
  TabBtn,
  TableWrapper,
  Td,
  Th,
  TotalsRow,
} from "./styles";

type Tab = "batting" | "pitching";

/** Formats batting average: H/AB to 3 decimal places, or ".---" when AB=0. */
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

/** Formats a createdAt timestamp as a short date string (YYYY-MM-DD). */
function formatDate(createdAt: number): string {
  return new Date(createdAt).toISOString().slice(0, 10);
}

const PlayerCareerPage: React.FunctionComponent = () => {
  const navigate = useNavigate();
  const { playerKey } = useParams<{ playerKey: string }>();
  const { teams: customTeams } = useCustomTeams();

  const [activeTab, setActiveTab] = React.useState<Tab>("batting");
  const [battingRows, setBattingRows] = React.useState<PlayerGameStatDoc[]>([]);
  const [pitchingRows, setPitchingRows] = React.useState<PitcherGameStatDoc[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!playerKey) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    async function loadData() {
      try {
        const [batting, pitching] = await Promise.all([
          GameHistoryStore.getPlayerCareerBatting(playerKey!),
          GameHistoryStore.getPlayerCareerPitching(playerKey!),
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
        if (!cancelled) setLoading(false);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [playerKey]);

  // Derive player name from most recent game row.
  const playerName = React.useMemo<string>(() => {
    if (battingRows.length > 0) {
      return battingRows[battingRows.length - 1].nameAtGameTime;
    }
    if (pitchingRows.length > 0) {
      return pitchingRows[pitchingRows.length - 1].nameAtGameTime;
    }
    return playerKey ?? "Unknown Player";
  }, [battingRows, pitchingRows, playerKey]);

  // Derive role label.
  const roleLabel = React.useMemo<string>(() => {
    const hasBatting = battingRows.length > 0;
    const hasPitching = pitchingRows.length > 0;
    if (hasBatting && hasPitching) return "Batter / Pitcher";
    if (hasPitching) return "Pitcher";
    if (hasBatting) return "Batter";
    return "";
  }, [battingRows, pitchingRows]);

  // Batting career totals.
  const battingTotals = React.useMemo(() => {
    return battingRows.reduce(
      (acc, row) => ({
        atBats: acc.atBats + row.batting.atBats,
        hits: acc.hits + row.batting.hits,
        walks: acc.walks + row.batting.walks,
        strikeouts: acc.strikeouts + row.batting.strikeouts,
        rbi: acc.rbi + row.batting.rbi,
        singles: acc.singles + row.batting.singles,
        doubles: acc.doubles + row.batting.doubles,
        triples: acc.triples + row.batting.triples,
        homers: acc.homers + row.batting.homers,
      }),
      {
        atBats: 0,
        hits: 0,
        walks: 0,
        strikeouts: 0,
        rbi: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        homers: 0,
      },
    );
  }, [battingRows]);

  // Pitching career totals.
  const pitchingTotals = React.useMemo(() => {
    return pitchingRows.reduce(
      (acc, row) => ({
        outsPitched: acc.outsPitched + row.outsPitched,
        hitsAllowed: acc.hitsAllowed + row.hitsAllowed,
        walksAllowed: acc.walksAllowed + row.walksAllowed,
        strikeoutsRecorded: acc.strikeoutsRecorded + row.strikeoutsRecorded,
        homersAllowed: acc.homersAllowed + row.homersAllowed,
        runsAllowed: acc.runsAllowed + row.runsAllowed,
        earnedRuns: acc.earnedRuns + row.earnedRuns,
        saves: acc.saves + row.saves,
        holds: acc.holds + row.holds,
        blownSaves: acc.blownSaves + row.blownSaves,
      }),
      {
        outsPitched: 0,
        hitsAllowed: 0,
        walksAllowed: 0,
        strikeoutsRecorded: 0,
        homersAllowed: 0,
        runsAllowed: 0,
        earnedRuns: 0,
        saves: 0,
        holds: 0,
        blownSaves: 0,
      },
    );
  }, [pitchingRows]);

  return (
    <PlayerCareerContainer data-testid="player-career-page">
      <PageHeader>
        <BackBtn type="button" onClick={() => navigate(-1)} aria-label="Go back">
          ← Back
        </BackBtn>
      </PageHeader>

      {!loading && (
        <>
          <PlayerName>{playerName}</PlayerName>
          {roleLabel && <PlayerRoleLabel>{roleLabel}</PlayerRoleLabel>}
        </>
      )}

      <TabBar>
        <TabBtn
          type="button"
          $active={activeTab === "batting"}
          onClick={() => setActiveTab("batting")}
        >
          Batting
        </TabBtn>
        <TabBtn
          type="button"
          $active={activeTab === "pitching"}
          onClick={() => setActiveTab("pitching")}
        >
          Pitching
        </TabBtn>
      </TabBar>

      {!loading && activeTab === "batting" && (
        <>
          {battingRows.length === 0 ? (
            <EmptyState>No batting data.</EmptyState>
          ) : (
            <>
              <SectionLabel>Career Totals</SectionLabel>
              <TableWrapper>
                <StatsTable>
                  <thead>
                    <tr>
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
                    <TotalsRow>
                      <Td>{battingRows.length}</Td>
                      <Td>{battingTotals.atBats}</Td>
                      <Td>{battingTotals.hits}</Td>
                      <Td>{battingTotals.doubles}</Td>
                      <Td>{battingTotals.triples}</Td>
                      <Td>{battingTotals.homers}</Td>
                      <Td>{battingTotals.walks}</Td>
                      <Td>{battingTotals.strikeouts}</Td>
                      <Td>{battingTotals.rbi}</Td>
                      <Td>{formatAVG(battingTotals.hits, battingTotals.atBats)}</Td>
                    </TotalsRow>
                  </tbody>
                </StatsTable>
              </TableWrapper>

              <SectionLabel style={{ marginTop: "24px" }}>Game Log</SectionLabel>
              <TableWrapper>
                <StatsTable>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Opponent</Th>
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
                      <tr key={row.id}>
                        <Td>{formatDate(row.createdAt)}</Td>
                        <Td>{resolveTeamLabel(row.opponentTeamId, customTeams)}</Td>
                        <Td>1</Td>
                        <Td>{row.batting.atBats}</Td>
                        <Td>{row.batting.hits}</Td>
                        <Td>{row.batting.doubles}</Td>
                        <Td>{row.batting.triples}</Td>
                        <Td>{row.batting.homers}</Td>
                        <Td>{row.batting.walks}</Td>
                        <Td>{row.batting.strikeouts}</Td>
                        <Td>{row.batting.rbi}</Td>
                        <Td>{formatAVG(row.batting.hits, row.batting.atBats)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </StatsTable>
              </TableWrapper>
            </>
          )}
        </>
      )}

      {!loading && activeTab === "pitching" && (
        <>
          {pitchingRows.length === 0 ? (
            <EmptyState>No pitching data.</EmptyState>
          ) : (
            <>
              <SectionLabel>Career Totals</SectionLabel>
              <TableWrapper>
                <StatsTable>
                  <thead>
                    <tr>
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
                    <TotalsRow>
                      <Td>{pitchingRows.length}</Td>
                      <Td>{formatIP(pitchingTotals.outsPitched)}</Td>
                      <Td>{pitchingTotals.hitsAllowed}</Td>
                      <Td>{pitchingTotals.walksAllowed}</Td>
                      <Td>{pitchingTotals.strikeoutsRecorded}</Td>
                      <Td>{pitchingTotals.homersAllowed}</Td>
                      <Td>{pitchingTotals.runsAllowed}</Td>
                      <Td>{pitchingTotals.earnedRuns}</Td>
                      <Td>{formatERA(pitchingTotals.earnedRuns, pitchingTotals.outsPitched)}</Td>
                      <Td>
                        {formatWHIP(
                          pitchingTotals.walksAllowed,
                          pitchingTotals.hitsAllowed,
                          pitchingTotals.outsPitched,
                        )}
                      </Td>
                      <Td>{pitchingTotals.saves}</Td>
                      <Td>{pitchingTotals.holds}</Td>
                      <Td>{pitchingTotals.blownSaves}</Td>
                    </TotalsRow>
                  </tbody>
                </StatsTable>
              </TableWrapper>

              <SectionLabel style={{ marginTop: "24px" }}>Game Log</SectionLabel>
              <TableWrapper>
                <StatsTable>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Opponent</Th>
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
                      <tr key={row.id}>
                        <Td>{formatDate(row.createdAt)}</Td>
                        <Td>{resolveTeamLabel(row.opponentTeamId, customTeams)}</Td>
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
            </>
          )}
        </>
      )}
    </PlayerCareerContainer>
  );
};

export default PlayerCareerPage;

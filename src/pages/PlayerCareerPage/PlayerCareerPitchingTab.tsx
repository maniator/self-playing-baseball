/** Pitching tab panel for the PlayerCareerPage. */
import * as React from "react";

import { resolveTeamLabel } from "@features/customTeams/adapters/customTeamAdapter";

import type { CustomTeamDoc, PitcherGameStatDoc } from "@storage/types";
import { formatIP } from "@utils/stats/computePitcherGameStats";

import { EmptyState, SectionLabel, StatsTable, TableWrapper, Td, Th, TotalsRow } from "./styles";
import type { PitchingTotals } from "./usePlayerCareerData";
import { formatDate, formatERA, formatWHIP } from "./usePlayerCareerData";

type Props = {
  pitchingRows: PitcherGameStatDoc[];
  pitchingTotals: PitchingTotals;
  customTeams: CustomTeamDoc[];
};

const PlayerCareerPitchingTab: React.FunctionComponent<Props> = ({
  pitchingRows,
  pitchingTotals,
  customTeams,
}) => {
  if (pitchingRows.length === 0) {
    return <EmptyState>No pitching data.</EmptyState>;
  }

  return (
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
  );
};

export default PlayerCareerPitchingTab;

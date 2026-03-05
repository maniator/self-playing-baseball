/** Batting tab panel for the PlayerCareerPage. */
import * as React from "react";

import { resolveTeamLabel } from "@features/customTeams/adapters/customTeamAdapter";

import type { CustomTeamDoc, PlayerGameStatDoc } from "@storage/types";

import { EmptyState, SectionLabel, StatsTable, TableWrapper, Td, Th, TotalsRow } from "./styles";
import type { BattingTotals } from "./usePlayerCareerData";
import { formatAVG, formatDate } from "./usePlayerCareerData";

type Props = {
  battingRows: PlayerGameStatDoc[];
  battingTotals: BattingTotals;
  customTeams: CustomTeamDoc[];
};

const PlayerCareerBattingTab: React.FunctionComponent<Props> = ({
  battingRows,
  battingTotals,
  customTeams,
}) => {
  if (battingRows.length === 0) {
    return <EmptyState>No batting data.</EmptyState>;
  }

  return (
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
  );
};

export default PlayerCareerBattingTab;

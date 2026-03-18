import * as React from "react";

import type {
  PitchingRow,
  PitchingSortKey,
  SortDir,
} from "@feat/careerStats/hooks/careerStatsShared";
import {
  ariaSortValue,
  formatERA,
  formatOutsAsIP,
  formatWHIP,
  sortIndicator,
} from "@feat/careerStats/hooks/careerStatsShared";
import {
  PlayerLink,
  StatsTable,
  TableWrapper,
  Td,
  Th,
} from "@feat/careerStats/pages/CareerStatsPage/styles";

type Props = {
  rows: PitchingRow[];
  sort: { key: PitchingSortKey; dir: SortDir };
  onHeaderClick: (event: React.MouseEvent<HTMLTableCellElement>) => void;
  onHeaderKeyDown: (event: React.KeyboardEvent<HTMLTableCellElement>) => void;
  onPlayerSelect: (playerKey: string) => void;
};

const CareerStatsPitchingTable: React.FunctionComponent<Props> = ({
  rows,
  sort,
  onHeaderClick,
  onHeaderKeyDown,
  onPlayerSelect,
}) => (
  <TableWrapper>
    <StatsTable>
      <thead>
        <tr>
          <Th
            $sortable
            data-sort-key="nameAtGameTime"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("nameAtGameTime", sort.key, sort.dir)}
          >
            Name{sortIndicator("nameAtGameTime", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="gamesPlayed"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("gamesPlayed", sort.key, sort.dir)}
          >
            G{sortIndicator("gamesPlayed", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="outsPitched"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("outsPitched", sort.key, sort.dir)}
          >
            IP{sortIndicator("outsPitched", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="hitsAllowed"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("hitsAllowed", sort.key, sort.dir)}
          >
            H{sortIndicator("hitsAllowed", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="walksAllowed"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("walksAllowed", sort.key, sort.dir)}
          >
            BB{sortIndicator("walksAllowed", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="strikeoutsRecorded"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("strikeoutsRecorded", sort.key, sort.dir)}
          >
            K{sortIndicator("strikeoutsRecorded", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="homersAllowed"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("homersAllowed", sort.key, sort.dir)}
          >
            HR{sortIndicator("homersAllowed", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="runsAllowed"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("runsAllowed", sort.key, sort.dir)}
          >
            R{sortIndicator("runsAllowed", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="earnedRuns"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("earnedRuns", sort.key, sort.dir)}
          >
            ER{sortIndicator("earnedRuns", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="era"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("era", sort.key, sort.dir)}
          >
            ERA{sortIndicator("era", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="whip"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("whip", sort.key, sort.dir)}
          >
            WHIP{sortIndicator("whip", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="saves"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("saves", sort.key, sort.dir)}
          >
            SV{sortIndicator("saves", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="holds"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("holds", sort.key, sort.dir)}
          >
            HLD{sortIndicator("holds", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="blownSaves"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("blownSaves", sort.key, sort.dir)}
          >
            BS{sortIndicator("blownSaves", sort.key, sort.dir)}
          </Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.pitcherKey}>
            <Td>
              <PlayerLink type="button" onClick={() => onPlayerSelect(row.pitcherKey)}>
                {row.nameAtGameTime}
              </PlayerLink>
            </Td>
            <Td>{row.gamesPlayed}</Td>
            <Td>{formatOutsAsIP(row.outsPitched)}</Td>
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
);

export default CareerStatsPitchingTable;

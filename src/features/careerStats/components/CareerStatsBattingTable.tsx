import * as React from "react";

import type {
  BattingRow,
  BattingSortKey,
  SortDir,
} from "@feat/careerStats/hooks/careerStatsShared";
import { ariaSortValue, formatAVG, sortIndicator } from "@feat/careerStats/hooks/careerStatsShared";
import {
  PlayerLink,
  StatsTable,
  TableWrapper,
  Td,
  Th,
} from "@feat/careerStats/pages/CareerStatsPage/styles";

type Props = {
  rows: BattingRow[];
  sort: { key: BattingSortKey; dir: SortDir };
  onHeaderClick: (event: React.MouseEvent<HTMLTableCellElement>) => void;
  onHeaderKeyDown: (event: React.KeyboardEvent<HTMLTableCellElement>) => void;
  onPlayerSelect: (playerKey: string) => void;
};

const CareerStatsBattingTable: React.FunctionComponent<Props> = ({
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
            data-sort-key="atBats"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("atBats", sort.key, sort.dir)}
          >
            AB{sortIndicator("atBats", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="hits"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("hits", sort.key, sort.dir)}
          >
            H{sortIndicator("hits", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="doubles"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("doubles", sort.key, sort.dir)}
          >
            2B{sortIndicator("doubles", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="triples"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("triples", sort.key, sort.dir)}
          >
            3B{sortIndicator("triples", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="homers"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("homers", sort.key, sort.dir)}
          >
            HR{sortIndicator("homers", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="walks"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("walks", sort.key, sort.dir)}
          >
            BB{sortIndicator("walks", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="strikeouts"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("strikeouts", sort.key, sort.dir)}
          >
            K{sortIndicator("strikeouts", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="rbi"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("rbi", sort.key, sort.dir)}
          >
            RBI{sortIndicator("rbi", sort.key, sort.dir)}
          </Th>
          <Th
            $sortable
            data-sort-key="avg"
            onClick={onHeaderClick}
            onKeyDown={onHeaderKeyDown}
            tabIndex={0}
            role="columnheader"
            aria-sort={ariaSortValue("avg", sort.key, sort.dir)}
          >
            AVG{sortIndicator("avg", sort.key, sort.dir)}
          </Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.playerKey}>
            <Td>
              <PlayerLink type="button" onClick={() => onPlayerSelect(row.playerKey)}>
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
);

export default CareerStatsBattingTable;

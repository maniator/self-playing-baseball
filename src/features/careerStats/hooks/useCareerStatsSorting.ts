import * as React from "react";

import type {
  BattingRow,
  BattingSortKey,
  PitchingRow,
  PitchingSortKey,
  SortDir,
} from "./careerStatsShared";

export function useCareerStatsSorting(battingRows: BattingRow[], pitchingRows: PitchingRow[]) {
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
    (event: React.MouseEvent<HTMLTableCellElement>) => {
      const key = (event.currentTarget as HTMLElement).dataset.sortKey as
        | BattingSortKey
        | undefined;
      if (key) {
        toggleBattingSort(key);
      }
    },
    [toggleBattingSort],
  );

  const handlePitchingThClick = React.useCallback(
    (event: React.MouseEvent<HTMLTableCellElement>) => {
      const key = (event.currentTarget as HTMLElement).dataset.sortKey as
        | PitchingSortKey
        | undefined;
      if (key) {
        togglePitchingSort(key);
      }
    },
    [togglePitchingSort],
  );

  const handleBattingThKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTableCellElement>) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      const key = (event.currentTarget as HTMLElement).dataset.sortKey as
        | BattingSortKey
        | undefined;
      if (key) {
        toggleBattingSort(key);
      }
    },
    [toggleBattingSort],
  );

  const handlePitchingThKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTableCellElement>) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      const key = (event.currentTarget as HTMLElement).dataset.sortKey as
        | PitchingSortKey
        | undefined;
      if (key) {
        togglePitchingSort(key);
      }
    },
    [togglePitchingSort],
  );

  const sortedBattingRows = React.useMemo(() => {
    const { key, dir } = battingSort;
    return [...battingRows].sort((a, b) => {
      if (key === "avg") {
        const aHasAB = a.atBats > 0;
        const bHasAB = b.atBats > 0;
        // Keep no-AB rows at the bottom for both directions; AVG is undefined for them.
        if (!aHasAB && !bHasAB) return 0;
        if (!aHasAB) return 1;
        if (!bHasAB) return -1;

        const aAvg = a.hits / a.atBats;
        const bAvg = b.hits / b.atBats;
        if (aAvg < bAvg) return dir === "asc" ? -1 : 1;
        if (aAvg > bAvg) return dir === "asc" ? 1 : -1;
        return 0;
      }

      let aVal: number | string;
      let bVal: number | string;

      if (key === "nameAtGameTime") {
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
      if (key === "era" || key === "whip") {
        const aHasIP = a.outsPitched > 0;
        const bHasIP = b.outsPitched > 0;
        // Keep 0-IP rows at the bottom for both directions; ERA/WHIP are undefined for them.
        if (!aHasIP && !bHasIP) return 0;
        if (!aHasIP) return 1;
        if (!bHasIP) return -1;

        const aMetric =
          key === "era"
            ? (a.earnedRuns * 27) / a.outsPitched
            : ((a.walksAllowed + a.hitsAllowed) * 3) / a.outsPitched;
        const bMetric =
          key === "era"
            ? (b.earnedRuns * 27) / b.outsPitched
            : ((b.walksAllowed + b.hitsAllowed) * 3) / b.outsPitched;

        if (aMetric < bMetric) return dir === "asc" ? -1 : 1;
        if (aMetric > bMetric) return dir === "asc" ? 1 : -1;
        return 0;
      }

      let aVal: number | string;
      let bVal: number | string;

      if (key === "nameAtGameTime") {
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

  return {
    battingSort,
    handleBattingThClick,
    handleBattingThKeyDown,
    handlePitchingThClick,
    handlePitchingThKeyDown,
    pitchingSort,
    sortedBattingRows,
    sortedPitchingRows,
  };
}

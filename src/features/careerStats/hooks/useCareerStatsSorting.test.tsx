import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BattingRow, PitchingRow } from "./careerStatsShared";
import { useCareerStatsSorting } from "./useCareerStatsSorting";

describe("useCareerStatsSorting", () => {
  it("sorts batting rows by games played descending by default", () => {
    const battingRows = [
      {
        playerId: "p1",
        nameAtGameTime: "A",
        gamesPlayed: 2,
        atBats: 4,
        hits: 1,
        doubles: 0,
        triples: 0,
        homers: 0,
        sacFlies: 0,
        walks: 0,
        strikeouts: 0,
        rbi: 0,
        singles: 1,
      },
      {
        playerId: "p2",
        nameAtGameTime: "B",
        gamesPlayed: 10,
        atBats: 20,
        hits: 8,
        doubles: 1,
        triples: 0,
        homers: 1,
        sacFlies: 0,
        walks: 2,
        strikeouts: 1,
        rbi: 4,
        singles: 6,
      },
    ] satisfies BattingRow[];

    const { result } = renderHook(() => useCareerStatsSorting(battingRows, []));

    expect(result.current.sortedBattingRows[0]?.playerId).toBe("p2");
  });

  it("keeps no-AB rows at the bottom when sorting AVG ascending", () => {
    const battingRows = [
      {
        playerId: "no_ab",
        nameAtGameTime: "No AB",
        gamesPlayed: 1,
        atBats: 0,
        hits: 0,
        doubles: 0,
        triples: 0,
        homers: 0,
        sacFlies: 0,
        walks: 0,
        strikeouts: 0,
        rbi: 0,
        singles: 0,
      },
      {
        playerId: "low_avg",
        nameAtGameTime: "Low Avg",
        gamesPlayed: 1,
        atBats: 10,
        hits: 2,
        doubles: 0,
        triples: 0,
        homers: 0,
        sacFlies: 0,
        walks: 0,
        strikeouts: 0,
        rbi: 0,
        singles: 2,
      },
      {
        playerId: "high_avg",
        nameAtGameTime: "High Avg",
        gamesPlayed: 1,
        atBats: 10,
        hits: 5,
        doubles: 0,
        triples: 0,
        homers: 0,
        sacFlies: 0,
        walks: 0,
        strikeouts: 0,
        rbi: 0,
        singles: 5,
      },
    ] satisfies BattingRow[];

    const { result } = renderHook(() => useCareerStatsSorting(battingRows, []));

    act(() => {
      result.current.handleBattingThClick({
        currentTarget: { dataset: { sortKey: "avg" } },
      } as unknown as React.MouseEvent<HTMLTableCellElement>);
      result.current.handleBattingThClick({
        currentTarget: { dataset: { sortKey: "avg" } },
      } as unknown as React.MouseEvent<HTMLTableCellElement>);
    });

    expect(result.current.sortedBattingRows.map((row) => row.playerId)).toEqual([
      "low_avg",
      "high_avg",
      "no_ab",
    ]);
  });

  it("keeps 0-IP rows at the bottom when sorting ERA descending", () => {
    const pitchingRows = [
      {
        playerId: "zero_ip",
        nameAtGameTime: "Zero IP",
        gamesPlayed: 1,
        outsPitched: 0,
        battersFaced: 0,
        pitchesThrown: 0,
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
      {
        playerId: "high_era",
        nameAtGameTime: "High ERA",
        gamesPlayed: 1,
        outsPitched: 27,
        battersFaced: 35,
        pitchesThrown: 100,
        hitsAllowed: 12,
        walksAllowed: 4,
        strikeoutsRecorded: 5,
        homersAllowed: 1,
        runsAllowed: 9,
        earnedRuns: 9,
        saves: 0,
        holds: 0,
        blownSaves: 0,
      },
      {
        playerId: "low_era",
        nameAtGameTime: "Low ERA",
        gamesPlayed: 1,
        outsPitched: 27,
        battersFaced: 30,
        pitchesThrown: 90,
        hitsAllowed: 5,
        walksAllowed: 1,
        strikeoutsRecorded: 8,
        homersAllowed: 0,
        runsAllowed: 1,
        earnedRuns: 1,
        saves: 0,
        holds: 0,
        blownSaves: 0,
      },
    ] satisfies PitchingRow[];

    const { result } = renderHook(() => useCareerStatsSorting([], pitchingRows));

    act(() => {
      result.current.handlePitchingThClick({
        currentTarget: { dataset: { sortKey: "era" } },
      } as unknown as React.MouseEvent<HTMLTableCellElement>);
    });

    expect(result.current.sortedPitchingRows.map((row) => row.playerId)).toEqual([
      "high_era",
      "low_era",
      "zero_ip",
    ]);
  });
});

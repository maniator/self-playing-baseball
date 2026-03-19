import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BattingRow } from "./careerStatsShared";
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
        walks: 2,
        strikeouts: 1,
        rbi: 4,
        singles: 6,
      },
    ] satisfies BattingRow[];

    const { result } = renderHook(() => useCareerStatsSorting(battingRows, []));

    expect(result.current.sortedBattingRows[0]?.playerId).toBe("p2");
  });
});

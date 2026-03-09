import { describe, expect, it } from "vitest";

import { makeState } from "@test/testHelpers";

import { checkGameInvariants } from "./invariants";

describe("checkGameInvariants", () => {
  it("returns no violations for a fresh valid state", () => {
    expect(checkGameInvariants(makeState())).toEqual([]);
  });

  it("returns no violations for a state with consistent score and inningRuns", () => {
    const state = makeState({
      score: [3, 2],
      inningRuns: [
        [2, 1],
        [1, 1],
      ],
    });
    expect(checkGameInvariants(state)).toEqual([]);
  });

  it("detects out-of-bounds batterIndex (too high)", () => {
    const v = checkGameInvariants(makeState({ batterIndex: [9, 0] }));
    expect(v.some((x) => x.message.includes("batterIndex out of bounds"))).toBe(true);
  });

  it("detects out-of-bounds batterIndex (negative)", () => {
    const v = checkGameInvariants(makeState({ batterIndex: [0, -1] }));
    expect(v.some((x) => x.message.includes("batterIndex out of bounds"))).toBe(true);
  });

  it("detects invalid atBat value", () => {
    const v = checkGameInvariants(makeState({ atBat: 2 as 0 | 1 }));
    expect(v.some((x) => x.message.includes("atBat out of range"))).toBe(true);
  });

  it("detects invalid outs count (too high)", () => {
    const v = checkGameInvariants(makeState({ outs: 3 }));
    expect(v.some((x) => x.message.includes("outs out of range"))).toBe(true);
  });

  it("detects invalid outs count (negative)", () => {
    const v = checkGameInvariants(makeState({ outs: -1 }));
    expect(v.some((x) => x.message.includes("outs out of range"))).toBe(true);
  });

  it("detects invalid strikes count", () => {
    const v = checkGameInvariants(makeState({ strikes: 5 }));
    expect(v.some((x) => x.message.includes("strikes out of range"))).toBe(true);
  });

  it("detects invalid balls count", () => {
    const v = checkGameInvariants(makeState({ balls: 4 }));
    expect(v.some((x) => x.message.includes("balls out of range"))).toBe(true);
  });

  it("detects negative away-team score", () => {
    const v = checkGameInvariants(makeState({ score: [-1, 0] }));
    expect(v.some((x) => x.message.includes("negative score"))).toBe(true);
  });

  it("detects negative home-team score", () => {
    const v = checkGameInvariants(makeState({ score: [0, -2] }));
    expect(v.some((x) => x.message.includes("negative score"))).toBe(true);
  });

  it("detects inningRuns vs score mismatch for away team", () => {
    // score[0] = 3 but inningRuns[0] sums to 0
    const v = checkGameInvariants(makeState({ score: [3, 0], inningRuns: [[], []] }));
    expect(v.some((x) => x.message.includes("Team 0 score mismatch"))).toBe(true);
  });

  it("detects inningRuns vs score mismatch for home team", () => {
    const v = checkGameInvariants(makeState({ score: [0, 2], inningRuns: [[], []] }));
    expect(v.some((x) => x.message.includes("Team 1 score mismatch"))).toBe(true);
  });

  it("accepts zero score with empty inningRuns (default valid state)", () => {
    expect(checkGameInvariants(makeState({ score: [0, 0], inningRuns: [[], []] }))).toEqual([]);
  });

  it("accepts multi-inning score totals that match inningRuns", () => {
    // 1 run in inning 1, 2 runs in inning 3 → total 3
    const state = makeState({ score: [3, 0], inningRuns: [[1, 0, 2], []] });
    expect(checkGameInvariants(state)).toEqual([]);
  });

  it("can report multiple violations at once", () => {
    const state = makeState({ outs: 5, balls: 7, score: [-1, 0] });
    const v = checkGameInvariants(state);
    expect(v.length).toBeGreaterThanOrEqual(3);
  });
});

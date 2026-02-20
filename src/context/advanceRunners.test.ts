import { describe, expect, it } from "vitest";

import { Hit } from "@constants/hitTypes";

import { advanceRunners } from "./advanceRunners";

describe("advanceRunners", () => {
  it("homerun: all runners score + batter (grand slam = 4 runs)", () => {
    const { newBase, runsScored } = advanceRunners(Hit.Homerun, [1, 1, 1]);
    expect(runsScored).toBe(4);
    expect(newBase).toEqual([0, 0, 0]);
  });

  it("triple: all runners score, batter to 3rd", () => {
    const { newBase, runsScored } = advanceRunners(Hit.Triple, [1, 1, 0]);
    expect(runsScored).toBe(2);
    expect(newBase[2]).toBe(1);
    expect(newBase[0]).toBe(0);
  });

  it("double: runner on 1st goes to 3rd, batter to 2nd", () => {
    const { newBase, runsScored } = advanceRunners(Hit.Double, [1, 0, 0]);
    expect(newBase[1]).toBe(1);
    expect(newBase[2]).toBe(1);
    expect(newBase[0]).toBe(0);
    expect(runsScored).toBe(0);
  });

  it("single: runner on 3rd scores, batter to 1st", () => {
    const { newBase, runsScored } = advanceRunners(Hit.Single, [0, 0, 1]);
    expect(runsScored).toBe(1);
    expect(newBase[0]).toBe(1);
    expect(newBase[2]).toBe(0);
  });

  it("walk: forces runners only when first base is occupied", () => {
    const { newBase, runsScored } = advanceRunners(Hit.Walk, [1, 1, 1]);
    expect(runsScored).toBe(1);
    expect(newBase).toEqual([1, 1, 1]);
  });

  it("walk with empty bases: batter to 1st, no runs", () => {
    const { newBase, runsScored } = advanceRunners(Hit.Walk, [0, 0, 0]);
    expect(runsScored).toBe(0);
    expect(newBase[0]).toBe(1);
  });

  it("throws on an invalid hit type", () => {
    expect(() => advanceRunners(99 as Hit, [0, 0, 0])).toThrow();
  });
});

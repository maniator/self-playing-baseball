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

describe("advanceRunners with runnerIds", () => {
  it("single: shifts runner IDs correctly", () => {
    const oldBase: [number, number, number] = [1, 1, 0];
    const ids: [string | null, string | null, string | null] = ["p1", "p2", null];
    const { newBase, runsScored, newRunnerIds } = advanceRunners(Hit.Single, oldBase, ids);
    expect(newBase).toEqual([1, 1, 1]);
    expect(runsScored).toBe(0);
    expect(newRunnerIds[1]).toBe("p1"); // runner from 1st → 2nd
    expect(newRunnerIds[2]).toBe("p2"); // runner from 2nd → 3rd
    expect(newRunnerIds[0]).toBeNull(); // batter's slot, set by caller
  });

  it("single with runner on 3rd: runner scores, ID drops", () => {
    const oldBase: [number, number, number] = [0, 0, 1];
    const ids: [string | null, string | null, string | null] = [null, null, "p3"];
    const { runsScored, newRunnerIds } = advanceRunners(Hit.Single, oldBase, ids);
    expect(runsScored).toBe(1);
    expect(newRunnerIds[2]).toBeNull(); // scored
  });

  it("double: runner from 1st → 3rd, 2nd/3rd score", () => {
    const oldBase: [number, number, number] = [1, 1, 1];
    const ids: [string | null, string | null, string | null] = ["p1", "p2", "p3"];
    const { runsScored, newRunnerIds } = advanceRunners(Hit.Double, oldBase, ids);
    expect(runsScored).toBe(2); // 2nd and 3rd score
    expect(newRunnerIds[2]).toBe("p1"); // 1st → 3rd
    expect(newRunnerIds[0]).toBeNull();
    expect(newRunnerIds[1]).toBeNull(); // batter goes to 2nd (caller's job)
  });

  it("homerun: all runner IDs drop", () => {
    const oldBase: [number, number, number] = [1, 1, 1];
    const ids: [string | null, string | null, string | null] = ["p1", "p2", "p3"];
    const { runsScored, newRunnerIds } = advanceRunners(Hit.Homerun, oldBase, ids);
    expect(runsScored).toBe(4);
    expect(newRunnerIds).toEqual([null, null, null]);
  });

  it("triple: all runner IDs drop", () => {
    const oldBase: [number, number, number] = [1, 0, 1];
    const ids: [string | null, string | null, string | null] = ["p1", null, "p3"];
    const { runsScored, newRunnerIds } = advanceRunners(Hit.Triple, oldBase, ids);
    expect(runsScored).toBe(2);
    expect(newRunnerIds[0]).toBeNull();
    expect(newRunnerIds[1]).toBeNull();
    // batter goes to 3rd (caller's job)
  });

  it("walk with bases loaded: runner on 3rd scores, others shift", () => {
    const oldBase: [number, number, number] = [1, 1, 1];
    const ids: [string | null, string | null, string | null] = ["p1", "p2", "p3"];
    const { runsScored, newRunnerIds } = advanceRunners(Hit.Walk, oldBase, ids);
    expect(runsScored).toBe(1);
    expect(newRunnerIds[2]).toBe("p2"); // 2nd → 3rd
    expect(newRunnerIds[1]).toBe("p1"); // 1st → 2nd
    expect(newRunnerIds[0]).toBeNull(); // batter walks to 1st (caller's job)
  });

  it("walk with no runners: batter gets 1st, IDs unchanged elsewhere", () => {
    const oldBase: [number, number, number] = [0, 0, 0];
    const ids: [string | null, string | null, string | null] = [null, null, null];
    const { runsScored, newRunnerIds } = advanceRunners(Hit.Walk, oldBase, ids);
    expect(runsScored).toBe(0);
    expect(newRunnerIds).toEqual([null, null, null]);
  });

  it("returns all-null newRunnerIds when no runnerIds provided", () => {
    const { newRunnerIds } = advanceRunners(Hit.Single, [1, 0, 0]);
    expect(newRunnerIds).toEqual([null, null, null]);
  });
});

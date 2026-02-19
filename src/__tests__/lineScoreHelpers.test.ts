/**
 * Unit tests for LineScore helpers (getCellValue logic) and the rng
 * decisions encoding helpers.
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// getCellValue — replicated here so we can test the pure logic in isolation.
// The function is unexported from the component, so we duplicate it and keep
// the tests tightly coupled to the specification.
// ---------------------------------------------------------------------------
function getCellValue(
  team: 0 | 1,
  n: number,
  inning: number,
  atBat: 0 | 1,
  gameOver: boolean,
  inningRuns: [number[], number[]],
): string | number {
  const hasStarted =
    team === 0
      ? n <= inning
      : n < inning || (n === inning && atBat === 1) || (n === inning && gameOver);
  if (!hasStarted) return "-";
  return inningRuns[team][n - 1] ?? 0;
}

describe("getCellValue — away team (top of inning)", () => {
  it("shows 0 for innings already played with no runs", () => {
    expect(getCellValue(0, 1, 3, 0, false, [[], []])).toBe(0);
  });

  it("shows actual runs for an inning that has been played", () => {
    const runs: [number[], number[]] = [[0, 2, 1], []];
    expect(getCellValue(0, 2, 3, 0, false, runs)).toBe(2);
  });

  it("shows '-' for future innings (away team)", () => {
    expect(getCellValue(0, 5, 3, 0, false, [[], []])).toBe("-");
  });

  it("shows current inning as started (away team bats top)", () => {
    // inning 4, away (top) is batting: inning 4 has started
    expect(getCellValue(0, 4, 4, 0, false, [[], []])).toBe(0);
  });
});

describe("getCellValue — home team (bottom of inning)", () => {
  it("shows '-' for current inning when it is the top half (away batting)", () => {
    // inning 5, atBat=0 (away): home's inning 5 hasn't started
    expect(getCellValue(1, 5, 5, 0, false, [[], []])).toBe("-");
  });

  it("shows 0 for current inning when it is the bottom half (home batting)", () => {
    // inning 5, atBat=1 (home): home's inning 5 has started
    expect(getCellValue(1, 5, 5, 1, false, [[], []])).toBe(0);
  });

  it("shows actual runs for a past inning (home team)", () => {
    const runs: [number[], number[]] = [[], [0, 3, 0]];
    expect(getCellValue(1, 2, 5, 0, false, runs)).toBe(3);
  });

  it("shows '-' for a future inning (home team)", () => {
    expect(getCellValue(1, 8, 5, 0, false, [[], []])).toBe("-");
  });

  it("shows 0 for current inning when gameOver=true (final score visible)", () => {
    // After walk-off in bottom 9th: atBat may have flipped; gameOver covers home's current inning
    expect(getCellValue(1, 9, 9, 0, true, [[], []])).toBe(0);
  });

  it("shows '-' for inning after game-over inning", () => {
    // Extra inning that never started
    expect(getCellValue(1, 10, 9, 0, true, [[], []])).toBe("-");
  });
});

describe("getCellValue — extra innings", () => {
  it("shows runs scored in inning 10 (extra innings)", () => {
    const runs: [number[], number[]] = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
    expect(getCellValue(0, 10, 10, 0, false, runs)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// rng.ts — decisions URL encoding round-trip
// ---------------------------------------------------------------------------
import { buildReplayUrl, getDecisionsFromUrl, initSeedFromUrl } from "../utilities/rng";

describe("decisions URL encoding round-trip", () => {
  it("buildReplayUrl encodes decisions and getDecisionsFromUrl decodes them correctly", () => {
    // Set up window.location with a known seed so buildReplayUrl works
    Object.defineProperty(window, "location", {
      value: { href: "https://example.com/?seed=abc" },
      writable: true, configurable: true,
    });
    const log = ["5:steal:0:78", "12:bunt", "20:skip"];
    const url = buildReplayUrl(log);
    // Point location to the generated URL so getDecisionsFromUrl can parse it
    Object.defineProperty(window, "location", {
      value: { href: url },
      writable: true, configurable: true,
    });
    expect(getDecisionsFromUrl()).toEqual(log);
  });

  it("getDecisionsFromUrl returns [] when no decisions param present", () => {
    Object.defineProperty(window, "location", {
      value: { href: "https://example.com/?seed=abc" },
      writable: true, configurable: true,
    });
    expect(getDecisionsFromUrl()).toEqual([]);
  });
});

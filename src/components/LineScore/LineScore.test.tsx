import * as React from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ContextValue } from "@context/index";
import { GameContext } from "@context/index";
import { makeContextValue } from "@test/testHelpers";

import LineScore from ".";

const renderWithContext = (ui: React.ReactElement, ctx: ContextValue = makeContextValue()) =>
  render(<GameContext.Provider value={ctx}>{ui}</GameContext.Provider>);

// ---------------------------------------------------------------------------
// getCellValue — pure logic replicated from LineScore/index.tsx for isolation
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
    expect(getCellValue(0, 4, 4, 0, false, [[], []])).toBe(0);
  });
});

describe("getCellValue — home team (bottom of inning)", () => {
  it("shows '-' for current inning when it is the top half (away batting)", () => {
    expect(getCellValue(1, 5, 5, 0, false, [[], []])).toBe("-");
  });

  it("shows 0 for current inning when it is the bottom half (home batting)", () => {
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
    expect(getCellValue(1, 9, 9, 0, true, [[], []])).toBe(0);
  });

  it("shows '-' for inning after game-over inning", () => {
    expect(getCellValue(1, 10, 9, 0, true, [[], []])).toBe("-");
  });
});

describe("getCellValue — extra innings", () => {
  it("shows runs scored in inning 10 (extra innings)", () => {
    const runs: [number[], number[]] = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];
    expect(getCellValue(0, 10, 10, 0, false, runs)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// LineScore component
// ---------------------------------------------------------------------------
describe("LineScore", () => {
  it("shows both team names", () => {
    renderWithContext(<LineScore />, makeContextValue({ teams: ["Yankees", "Red Sox"] }));
    expect(screen.getByText("Yankees")).toBeInTheDocument();
    expect(screen.getByText("Red Sox")).toBeInTheDocument();
  });

  it("shows R (runs) totals for each team", () => {
    renderWithContext(<LineScore />, makeContextValue({ score: [4, 2] }));
    const values = screen.getAllByText(/^[0-9]+$/).map((c) => c.textContent);
    expect(values).toContain("4");
    expect(values).toContain("2");
  });

  it("shows FINAL banner when gameOver is true", () => {
    renderWithContext(<LineScore />, makeContextValue({ gameOver: true }));
    expect(screen.getByText("FINAL")).toBeInTheDocument();
  });

  it("does not show FINAL banner when game is in progress", () => {
    renderWithContext(<LineScore />, makeContextValue({ gameOver: false }));
    expect(screen.queryByText("FINAL")).not.toBeInTheDocument();
  });

  it("renders BSO dot groups (B / S / O labels)", () => {
    renderWithContext(<LineScore />, makeContextValue({ balls: 2, strikes: 1, outs: 1 }));
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("O")).toBeInTheDocument();
  });

  it("shows inning numbers in header row", () => {
    renderWithContext(<LineScore />, makeContextValue({ inning: 3 }));
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
  });

  it("shows only 9 inning columns when game ends after regulation play", () => {
    renderWithContext(<LineScore />, makeContextValue({ inning: 10, atBat: 0, gameOver: true }));
    expect(screen.queryByText("10")).not.toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("shows 9 inning columns for a walk-off win in the bottom of the 9th", () => {
    // Walk-off: atBat === 1, inning === 9 — no increment happened, so no adjustment needed.
    renderWithContext(<LineScore />, makeContextValue({ inning: 9, atBat: 1, gameOver: true }));
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.queryByText("10")).not.toBeInTheDocument();
  });

  it("shows 10 inning columns for a real extra-inning game in progress", () => {
    renderWithContext(<LineScore />, makeContextValue({ inning: 10, atBat: 0, gameOver: false }));
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
  });

  it("shows only 10 inning columns when extra-inning game ends after the 10th inning", () => {
    renderWithContext(<LineScore />, makeContextValue({ inning: 11, atBat: 0, gameOver: true }));
    expect(screen.queryByText("11")).not.toBeInTheDocument();
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
  });

  it("shows EXTRA INNINGS banner when inning > 9 and game is in progress", () => {
    renderWithContext(<LineScore />, makeContextValue({ inning: 10, gameOver: false }));
    expect(screen.getByText("EXTRA INNINGS")).toBeInTheDocument();
  });

  it("does not show EXTRA INNINGS banner when gameOver is true", () => {
    renderWithContext(<LineScore />, makeContextValue({ inning: 10, gameOver: true }));
    expect(screen.queryByText("EXTRA INNINGS")).not.toBeInTheDocument();
  });

  it("does not show EXTRA INNINGS banner in inning 9 or earlier", () => {
    renderWithContext(<LineScore />, makeContextValue({ inning: 9, gameOver: false }));
    expect(screen.queryByText("EXTRA INNINGS")).not.toBeInTheDocument();
  });
});

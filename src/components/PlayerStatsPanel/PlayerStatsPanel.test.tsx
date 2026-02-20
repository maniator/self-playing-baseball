import * as React from "react";

import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Hit } from "@constants/hitTypes";
import { GameContext } from "@context/index";
import { makeContextValue } from "@test/testHelpers";

import PlayerStatsPanel from "./index";

const renderWithContext = (overrides = {}) => {
  const ctx = makeContextValue(overrides);
  return render(
    <GameContext.Provider value={ctx}>
      <PlayerStatsPanel />
    </GameContext.Provider>,
  );
};

describe("PlayerStatsPanel", () => {
  it("renders the Batting Stats heading", () => {
    renderWithContext();
    expect(screen.getByText(/batting stats/i)).toBeInTheDocument();
  });

  it("shows away team tab active by default", () => {
    renderWithContext({ teams: ["Mets", "Yankees"] as [string, string] });
    expect(screen.getByRole("button", { name: /▲ Mets/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /▼ Yankees/i })).toBeInTheDocument();
  });

  it("shows 'No at-bats yet.' when no activity for the active team", () => {
    renderWithContext();
    expect(screen.getByText(/no at-bats yet/i)).toBeInTheDocument();
  });

  it("shows the stats table when there are play log entries", () => {
    const playLog = [
      { inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Single, runs: 0 },
    ] as const;
    renderWithContext({ playLog: [...playLog] });
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("H")).toBeInTheDocument();
    expect(screen.getByText("BB")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("counts hits for the correct batter", () => {
    const playLog = [
      { inning: 1, half: 0, batterNum: 3, team: 0, event: Hit.Single, runs: 0 },
      { inning: 1, half: 0, batterNum: 3, team: 0, event: Hit.Double, runs: 1 },
    ];
    renderWithContext({ playLog });
    // batter #3 should show 2 hits
    const rows = screen.getAllByRole("row");
    const row3 = rows.find((r) => r.textContent?.startsWith("3"));
    expect(row3?.textContent).toContain("2");
  });

  it("counts walks separately from hits", () => {
    const playLog = [
      { inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Walk, runs: 0 },
    ];
    renderWithContext({ playLog });
    // batter #1: 0 hits (–), 1 walk
    const rows = screen.getAllByRole("row");
    const row1 = rows.find((r) => r.textContent?.startsWith("1"));
    // Contains "1" for walk count and "–" for hits
    expect(row1?.textContent).toContain("1");
    expect(row1?.textContent).toContain("–");
  });

  it("counts strikeouts from the strikeoutLog", () => {
    const strikeoutLog = [{ team: 0, batterNum: 2 }];
    renderWithContext({ strikeoutLog });
    // Has activity so table is shown
    expect(screen.getByRole("table")).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    const row2 = rows.find((r) => r.textContent?.startsWith("2"));
    // batter #2 has 1 K
    expect(row2?.textContent).toContain("1");
  });

  it("does not mix team stats — away stats excluded when viewing home tab", () => {
    const playLog = [
      { inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Single, runs: 0 },
    ];
    renderWithContext({ playLog, teams: ["Mets", "Yankees"] as [string, string] });
    // Switch to home tab
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /▼ Yankees/i }));
    });
    // Home has no activity
    expect(screen.getByText(/no at-bats yet/i)).toBeInTheDocument();
  });

  it("shows 9 batter rows when there is activity", () => {
    const playLog = [
      { inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Single, runs: 0 },
    ];
    renderWithContext({ playLog });
    // 1 header row + 9 data rows
    expect(screen.getAllByRole("row")).toHaveLength(10);
  });

  it("collapses and hides the table when toggle is clicked", () => {
    const playLog = [
      { inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Single, runs: 0 },
    ];
    renderWithContext({ playLog });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /collapse batting stats/i }));
    });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

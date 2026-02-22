import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
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

  it("always shows the stats table, even with no activity", () => {
    renderWithContext();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("AB")).toBeInTheDocument();
    expect(screen.getByText("H")).toBeInTheDocument();
    expect(screen.getByText("BB")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
    expect(screen.getByText("RBI")).toBeInTheDocument();
  });

  it("shows the stats table when there are play log entries", () => {
    const playLog = [
      { inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Single, runs: 0 },
    ] as const;
    renderWithContext({ playLog: [...playLog] });
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("AB")).toBeInTheDocument();
    expect(screen.getByText("H")).toBeInTheDocument();
    expect(screen.getByText("BB")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
    expect(screen.getByText("RBI")).toBeInTheDocument();
  });

  it("counts hits for the correct batter", () => {
    const playLog = [
      { inning: 1, half: 0, batterNum: 3, team: 0, event: Hit.Single, runs: 0 },
      { inning: 1, half: 0, batterNum: 3, team: 0, event: Hit.Double, runs: 1 },
    ];
    renderWithContext({ playLog });
    // batter #3 should show 2 hits (rows[0] = header, rows[3] = slot 3)
    const rows = screen.getAllByRole("row");
    expect(rows[3]?.textContent).toContain("2");
  });

  it("counts walks separately from hits", () => {
    const playLog = [{ inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Walk, runs: 0 }];
    renderWithContext({ playLog });
    // batter #1: 0 hits (–), 1 walk (rows[0] = header, rows[1] = slot 1)
    const rows = screen.getAllByRole("row");
    const row1 = rows[1];
    // Contains "1" for walk count and "–" for hits
    expect(row1?.textContent).toContain("1");
    expect(row1?.textContent).toContain("–");
  });

  it("counts strikeouts from the strikeoutLog", () => {
    const strikeoutLog = [{ team: 0, batterNum: 2 }];
    const outLog = [{ team: 0 as const, batterNum: 2 }];
    renderWithContext({ strikeoutLog, outLog });
    expect(screen.getByRole("table")).toBeInTheDocument();
    // batter #2 has 1 K (rows[0] = header, rows[2] = slot 2)
    const rows = screen.getAllByRole("row");
    expect(rows[2]?.textContent).toContain("1");
  });

  it("counts at-bats from outLog (includes K and regular outs)", () => {
    // batter #3: 1 hit + 1 groundout entry in outLog = 2 AB
    const playLog = [{ inning: 1, half: 0, batterNum: 3, team: 0, event: Hit.Single, runs: 0 }];
    const outLog = [{ team: 0 as const, batterNum: 3 }];
    renderWithContext({ playLog, outLog });
    const rows = screen.getAllByRole("row");
    // row[3] = batter slot 3; text should contain "2" for AB and "1" for H
    expect(rows[3]?.textContent).toContain("2"); // AB
    expect(rows[3]?.textContent).toContain("1"); // H
  });

  it("does not mix team stats — away stats excluded when viewing home tab", () => {
    const playLog = [{ inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Single, runs: 0 }];
    renderWithContext({ playLog, teams: ["Mets", "Yankees"] as [string, string] });
    // Switch to home tab
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /▼ Yankees/i }));
    });
    // Home table shows all dashes (no activity for home team)
    const rows = screen.getAllByRole("row");
    // All 9 data rows should show "–" for AB
    const dataCells = rows.slice(1).map((r) => r.textContent ?? "");
    expect(dataCells.every((text) => text.includes("–"))).toBe(true);
  });

  it("always shows 9 batter rows (header + 9 data rows = 10 total)", () => {
    renderWithContext();
    // 1 header row + 9 data rows, even with no activity
    expect(screen.getAllByRole("row")).toHaveLength(10);
  });

  it("shows player names from the roster instead of slot numbers", () => {
    // teams default to ["Away","Home"]; generateRoster("Away") batter slot 1 = "Catcher"
    renderWithContext();
    expect(screen.getByText("Catcher")).toBeInTheDocument();
  });

  it("shows nickname from playerOverrides when set", () => {
    // away slug = "away", batter 0 id = "away_b0"
    const playerOverrides: [Record<string, { nickname: string }>, Record<string, never>] = [
      { away_b0: { nickname: "Slugger" } },
      {},
    ];
    renderWithContext({ playerOverrides: playerOverrides as never });
    expect(screen.getByText("Slugger")).toBeInTheDocument();
  });
  it("collapses and hides the table when toggle is clicked", () => {
    const playLog = [{ inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Single, runs: 0 }];
    renderWithContext({ playLog });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /collapse batting stats/i }));
    });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("counts RBI from playLog entries with rbi field", () => {
    const playLog = [
      { inning: 1, half: 0, batterNum: 2, team: 0, event: Hit.Single, runs: 1, rbi: 1 },
      { inning: 1, half: 0, batterNum: 2, team: 0, event: Hit.Double, runs: 1, rbi: 1 },
    ];
    renderWithContext({ playLog });
    // batter #2 should show 2 RBI — target the RBI cell (last td) in slot-2 row
    const rows = screen.getAllByRole("row");
    const cells = rows[2]?.querySelectorAll("td");
    const rbiCell = cells?.[cells.length - 1];
    expect(rbiCell?.textContent).toBe("2");
  });

  it("defaults RBI to 0 (shown as –) for playLog entries without rbi field", () => {
    // entries without rbi field simulate older saved data
    const playLog = [{ inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Single, runs: 1 }];
    renderWithContext({ playLog });
    // batter #1 row: rbi defaults to 0, shown as "–" — target the RBI cell (last td)
    const rows = screen.getAllByRole("row");
    const cells = rows[1]?.querySelectorAll("td");
    const rbiCell = cells?.[cells.length - 1];
    expect(rbiCell?.textContent).toBe("–");
  });
});

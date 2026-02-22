import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Hit } from "@constants/hitTypes";
import { GameContext } from "@context/index";
import { makeContextValue } from "@test/testHelpers";
import * as loggerModule from "@utils/logger";

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

  it("batting-stats-table data-testid is present when not collapsed", () => {
    renderWithContext();
    expect(screen.getByTestId("batting-stats-table")).toBeInTheDocument();
  });

  it("batting-stats-table data-testid is absent when collapsed", () => {
    renderWithContext();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /collapse batting stats/i }));
    });
    expect(screen.queryByTestId("batting-stats-table")).not.toBeInTheDocument();
  });
});

describe("warnBattingStatsInvariant (dev-mode invariant)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("fires a warn when K > AB (impossible state)", () => {
    const warnSpy = vi.spyOn(loggerModule.appLog, "warn");
    // batter #1: 3 Ks in strikeoutLog but 0 outLog entries → AB=0, K=3 (impossible)
    const strikeoutLog = [
      { team: 0 as const, batterNum: 1 },
      { team: 0 as const, batterNum: 1 },
      { team: 0 as const, batterNum: 1 },
    ];
    const ctx = makeContextValue({ strikeoutLog, outLog: [], playLog: [] });
    render(
      <GameContext.Provider value={ctx}>
        <PlayerStatsPanel />
      </GameContext.Provider>,
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("IMPOSSIBLE"));
  });

  it("fires a warn when PA ordering is violated (earlier slot has fewer PAs)", () => {
    const warnSpy = vi.spyOn(loggerModule.appLog, "warn");
    // slot 3 has 2 outs (AB=2) but slot 2 has 0 (PA ordering violation)
    const outLog = [
      { team: 0 as const, batterNum: 3 },
      { team: 0 as const, batterNum: 3 },
    ];
    const ctx = makeContextValue({ outLog, strikeoutLog: [], playLog: [] });
    render(
      <GameContext.Provider value={ctx}>
        <PlayerStatsPanel />
      </GameContext.Provider>,
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("PA ordering violation"));
  });

  it("does NOT fire a warn for valid stats where AB difference is explained by walks", () => {
    const warnSpy = vi.spyOn(loggerModule.appLog, "warn");
    // Construct a state where:
    //   slot 1: 2 outs          → PA=2, AB=2
    //   slot 2: 1 out + 1 walk  → PA=2, AB=1  (fewer AB than slot 3, explained by BB)
    //   slot 3: 2 outs          → PA=2, AB=2
    //   slots 4-9: 2 outs each  → PA=2, AB=2
    // All PA ordering pairs are equal (≥) and K<=AB throughout — no warning expected.
    const playLog = [
      { inning: 1, half: 0 as const, batterNum: 2, team: 0 as const, event: Hit.Walk, runs: 0 },
    ];
    const outLog = [
      // slot 1
      { team: 0 as const, batterNum: 1 },
      { team: 0 as const, batterNum: 1 },
      // slot 2 (only 1 out — the other PA is a walk above)
      { team: 0 as const, batterNum: 2 },
      // slots 3-9
      { team: 0 as const, batterNum: 3 },
      { team: 0 as const, batterNum: 3 },
      { team: 0 as const, batterNum: 4 },
      { team: 0 as const, batterNum: 4 },
      { team: 0 as const, batterNum: 5 },
      { team: 0 as const, batterNum: 5 },
      { team: 0 as const, batterNum: 6 },
      { team: 0 as const, batterNum: 6 },
      { team: 0 as const, batterNum: 7 },
      { team: 0 as const, batterNum: 7 },
      { team: 0 as const, batterNum: 8 },
      { team: 0 as const, batterNum: 8 },
      { team: 0 as const, batterNum: 9 },
      { team: 0 as const, batterNum: 9 },
    ];
    const ctx = makeContextValue({ playLog, outLog, strikeoutLog: [] });
    render(
      <GameContext.Provider value={ctx}>
        <PlayerStatsPanel />
      </GameContext.Provider>,
    );
    // AB(slot2)=1 < AB(slot3)=2 but PA ordering holds (both PA=2) — no warning.
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

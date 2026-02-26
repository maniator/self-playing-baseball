import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Hit } from "@constants/hitTypes";
import { GameContext } from "@context/index";
import { makeContextValue } from "@test/testHelpers";
import * as loggerModule from "@utils/logger";

import PlayerStatsPanel from "./index";

const renderWithContext = (overrides = {}, activeTeam: 0 | 1 = 0) => {
  const ctx = makeContextValue(overrides);
  return render(
    <GameContext.Provider value={ctx}>
      <PlayerStatsPanel activeTeam={activeTeam} />
    </GameContext.Provider>,
  );
};

describe("PlayerStatsPanel", () => {
  it("renders the Batting Stats heading", () => {
    renderWithContext();
    expect(screen.getByText("Batting Stats")).toBeInTheDocument();
  });

  it("shows away team stats when activeTeam=0", () => {
    renderWithContext({ teams: ["Mets", "Yankees"] as [string, string] }, 0);
    expect(screen.getByRole("table")).toBeInTheDocument();
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

  it("does not mix team stats — away stats excluded when viewing home team", () => {
    const playLog = [{ inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Single, runs: 0 }];
    renderWithContext({ playLog, teams: ["Mets", "Yankees"] as [string, string] }, 1);
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
    fireEvent.click(screen.getByRole("button", { name: /collapse batting stats/i }));
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

  it("shows Player Details empty state when no batter selected", () => {
    renderWithContext();
    expect(screen.getByText(/select a batter in batting stats/i)).toBeInTheDocument();
  });

  it("shows Player Details for selected batter after clicking a row", () => {
    const playLog = [
      { inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Single, runs: 1, rbi: 1 },
    ];
    renderWithContext({ playLog });
    fireEvent.click(screen.getByTestId("batter-row-1"));
    expect(screen.getByText("Player Details")).toBeInTheDocument();
    expect(screen.getByText(/this game/i)).toBeInTheDocument();
    expect(screen.getByText("AVG")).toBeInTheDocument();
    expect(screen.getByText("OBP")).toBeInTheDocument();
    expect(screen.getByText("SLG")).toBeInTheDocument();
    expect(screen.getByText("OPS")).toBeInTheDocument();
  });

  it("deselects row when clicking the same row again", () => {
    renderWithContext();
    fireEvent.click(screen.getByTestId("batter-row-2"));
    // clicking again should deselect
    fireEvent.click(screen.getByTestId("batter-row-2"));
    expect(screen.getByText(/select a batter in batting stats/i)).toBeInTheDocument();
  });

  it("selects a row when Enter is pressed", () => {
    renderWithContext();
    fireEvent.keyDown(screen.getByTestId("batter-row-1"), { key: "Enter" });
    expect(screen.getByText("Player Details")).toBeInTheDocument();
    expect(screen.getByText(/this game/i)).toBeInTheDocument();
  });

  it("selects a row when Space is pressed", () => {
    renderWithContext();
    fireEvent.keyDown(screen.getByTestId("batter-row-2"), { key: " " });
    expect(screen.getByText("Player Details")).toBeInTheDocument();
    expect(screen.getByText(/this game/i)).toBeInTheDocument();
  });

  it("deselects row when Enter is pressed on the already-selected row", () => {
    renderWithContext();
    fireEvent.keyDown(screen.getByTestId("batter-row-1"), { key: "Enter" });
    fireEvent.keyDown(screen.getByTestId("batter-row-1"), { key: "Enter" });
    expect(screen.getByText(/select a batter in batting stats/i)).toBeInTheDocument();
  });

  it("ignores other keys (e.g. Tab) on a row", () => {
    renderWithContext();
    fireEvent.keyDown(screen.getByTestId("batter-row-1"), { key: "Tab" });
    // Player Details should remain in empty state
    expect(screen.getByText(/select a batter in batting stats/i)).toBeInTheDocument();
  });

  it("clears selection when clear button is clicked", () => {
    renderWithContext();
    fireEvent.click(screen.getByTestId("batter-row-3"));
    fireEvent.click(screen.getByRole("button", { name: /clear player selection/i }));
    expect(screen.getByText(/select a batter in batting stats/i)).toBeInTheDocument();
  });

  it("shows AVG .000 when batter has no at-bats", () => {
    renderWithContext();
    fireEvent.click(screen.getByTestId("batter-row-1"));
    // No AB: rate stats should show .000 not NaN
    const avgCells = screen.getAllByText(".000");
    expect(avgCells.length).toBeGreaterThan(0);
  });

  // ── Position column ────────────────────────────────────────────────────────

  it("shows a 'Pos' column header in the batting stats table", () => {
    renderWithContext();
    expect(screen.getByText("Pos")).toBeInTheDocument();
  });

  it("shows position abbreviations for each lineup slot (generated roster)", () => {
    // Generated roster assigns standard positions: C, 1B, 2B, 3B, SS, LF, CF, RF, DH
    renderWithContext();
    // Slot 1 → Catcher (C)
    expect(screen.getByText("C")).toBeInTheDocument();
    // Slot 5 → Shortstop (SS)
    expect(screen.getByText("SS")).toBeInTheDocument();
  });

  it("shows position in Player Details SubLabel when a batter is selected", () => {
    renderWithContext();
    fireEvent.click(screen.getByTestId("batter-row-1"));
    // Slot 1 is Catcher (C) for the generated roster
    expect(screen.getByText(/C · #1 in lineup · This game/i)).toBeInTheDocument();
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

describe("PlayerStatsPanel — player-ID stat tracking", () => {
  /**
   * All tests in this block use entries WITH `playerId` to exercise the new
   * player-ID keyed stat tracking.
   */

  it("stats keyed by playerId: hit credited to the correct player, not the slot", () => {
    // player "p_alice" is in slot 1 at bat; she hits a single
    const playLog = [
      {
        inning: 1,
        half: 0 as const,
        batterNum: 1,
        playerId: "p_alice",
        team: 0 as const,
        event: Hit.Single,
        runs: 0,
        rbi: 0,
      },
    ];
    const lineupOrder: [string[], string[]] = [["p_alice", "p_bob", "p_carol"], []];
    const ctx = makeContextValue({ playLog, lineupOrder });
    render(
      <GameContext.Provider value={ctx}>
        <PlayerStatsPanel />
      </GameContext.Provider>,
    );
    // slot 1 row should show 1 hit
    const rows = screen.getAllByRole("row");
    const hitCell = rows[1]?.querySelectorAll("td")[3]; // AB, H, BB, K, RBI → H is index 3
    expect(hitCell?.textContent).toBe("1");
    // slot 2 row should show no hits (–)
    const hitCell2 = rows[2]?.querySelectorAll("td")[3];
    expect(hitCell2?.textContent).toBe("–");
  });

  it("after substitution: replaced slot shows sub's stats (0), not original player's stats", () => {
    // Original player "p_alice" batted at slot 1 and got a hit before being subbed out.
    // After the sub, "p_bob" is now in slot 1.
    const playLog = [
      {
        inning: 1,
        half: 0 as const,
        batterNum: 1,
        playerId: "p_alice",
        team: 0 as const,
        event: Hit.Single,
        runs: 0,
        rbi: 0,
      },
    ];
    // lineupOrder now reflects the post-substitution state (p_bob is in slot 1)
    const lineupOrder: [string[], string[]] = [["p_bob", "p_carol"], []];
    const ctx = makeContextValue({ playLog, lineupOrder });
    render(
      <GameContext.Provider value={ctx}>
        <PlayerStatsPanel />
      </GameContext.Provider>,
    );
    // slot 1 should now show p_bob's stats — p_bob has had no PAs so everything is "–"
    const rows = screen.getAllByRole("row");
    const hitCell = rows[1]?.querySelectorAll("td")[3];
    expect(hitCell?.textContent).toBe("–");
  });

  it("legacy entries (no playerId) fall back to slot-based lookup", () => {
    // Old-format entry without playerId — batterNum 1 → key "slot:1"
    const playLog = [
      {
        inning: 1,
        half: 0 as const,
        batterNum: 1,
        team: 0 as const,
        event: Hit.Homerun,
        runs: 1,
        rbi: 1,
      },
    ];
    // lineupOrder is empty (stock team save) → getSlotStats falls back to slot:1 key
    const ctx = makeContextValue({ playLog, lineupOrder: [[], []] as [string[], string[]] });
    render(
      <GameContext.Provider value={ctx}>
        <PlayerStatsPanel />
      </GameContext.Provider>,
    );
    // slot 1 should show 1 homer and 1 RBI from the legacy entry
    const rows = screen.getAllByRole("row");
    const hitCell = rows[1]?.querySelectorAll("td")[3];
    const rbiCell = rows[1]?.querySelectorAll("td")[rows[1].querySelectorAll("td").length - 1];
    expect(hitCell?.textContent).toBe("1");
    expect(rbiCell?.textContent).toBe("1");
  });
});

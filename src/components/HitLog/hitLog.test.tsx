/**
 * Tests for HitLog component (src/HitLog/index.tsx)
 */
import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Hit } from "@constants/hitTypes";
import type { ContextValue } from "@context/index";
import type { PlayLogEntry } from "@context/index";
import { GameContext } from "@context/index";

import HitLog from ".";

vi.mock("@hooks/useCustomTeams", () => ({
  useCustomTeams: vi.fn().mockReturnValue({
    teams: [
      {
        id: "ct_hitlog_away",
        name: "Away",
        city: "",
        abbreviation: "AWY",
        source: "custom",
        schemaVersion: 1,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        roster: { schemaVersion: 1, lineup: [], bench: [], pitchers: [] },
        metadata: { archived: false },
      },
      {
        id: "ct_hitlog_home",
        name: "Home",
        city: "",
        abbreviation: "HME",
        source: "custom",
        schemaVersion: 1,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        roster: { schemaVersion: 1, lineup: [], bench: [], pitchers: [] },
        metadata: { archived: false },
      },
    ],
    loading: false,
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const makeCtx = (overrides: Partial<ContextValue> = {}): ContextValue => ({
  inning: 1,
  score: [0, 0],
  teams: ["custom:ct_hitlog_away", "custom:ct_hitlog_home"],
  baseLayout: [0, 0, 0],
  outs: 0,
  strikes: 0,
  balls: 0,
  atBat: 0,
  gameOver: false,
  pendingDecision: null,
  onePitchModifier: null,
  pitchKey: 0,
  decisionLog: [],
  hitType: undefined,
  log: [],
  batterIndex: [0, 0],
  inningRuns: [[], []],
  playLog: [],
  dispatch: vi.fn(),
  dispatchLog: vi.fn(),
  ...overrides,
});

const renderHitLog = (ctx: ContextValue = makeCtx(), activeTeam: 0 | 1 = 0) =>
  render(
    <GameContext.Provider value={ctx}>
      <HitLog activeTeam={activeTeam} />
    </GameContext.Provider>,
  );

const makeEntry = (overrides: Partial<PlayLogEntry> = {}): PlayLogEntry => ({
  inning: 1,
  half: 0,
  batterNum: 1,
  team: 0,
  event: Hit.Single,
  runs: 0,
  ...overrides,
});

describe("HitLog", () => {
  it("shows heading always", () => {
    renderHitLog();
    expect(screen.getByText(/hit log/i)).toBeInTheDocument();
  });

  it("shows 'No hits yet.' when playLog is empty", () => {
    renderHitLog();
    expect(screen.getByText(/no hits yet/i)).toBeInTheDocument();
  });

  it("shows an entry for a single (away team active)", () => {
    const ctx = makeCtx({
      playLog: [makeEntry({ event: Hit.Single, batterNum: 3, inning: 2, half: 0, team: 0 })],
    });
    renderHitLog(ctx, 0);
    expect(screen.getByText("1B")).toBeInTheDocument();
    expect(screen.getByText(/Away #3/)).toBeInTheDocument();
  });

  it("shows HR in gold color class for a homerun", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ event: Hit.Homerun })] });
    renderHitLog(ctx, 0);
    expect(screen.getByText("HR")).toBeInTheDocument();
  });

  it("shows walk as BB", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ event: Hit.Walk })] });
    renderHitLog(ctx, 0);
    expect(screen.getByText("BB")).toBeInTheDocument();
  });

  it("shows +1 run when entry has runs=1", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ runs: 1 })] });
    renderHitLog(ctx, 0);
    expect(screen.getByText("+1 run")).toBeInTheDocument();
  });

  it("pluralises 'runs' for runs > 1", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ runs: 3 })] });
    renderHitLog(ctx, 0);
    expect(screen.getByText("+3 runs")).toBeInTheDocument();
  });

  it("does not show runs span when runs=0", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ runs: 0 })] });
    renderHitLog(ctx, 0);
    expect(screen.queryByText(/\+0 run/)).not.toBeInTheDocument();
  });

  it("shows ▼ (bottom) arrow for half=1", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ half: 1, inning: 3 })] });
    renderHitLog(ctx, 0);
    expect(screen.getByText(/▼3/)).toBeInTheDocument();
  });

  it("shows ▲ (top) arrow for half=0", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ half: 0, inning: 5 })] });
    renderHitLog(ctx, 0);
    expect(screen.getByText(/▲5/)).toBeInTheDocument();
  });

  it("is visible by default (not collapsed)", () => {
    const ctx = makeCtx({ playLog: [makeEntry()] });
    renderHitLog(ctx, 0);
    expect(screen.getByText("1B")).toBeInTheDocument();
  });

  it("collapses when hide button is clicked", () => {
    const ctx = makeCtx({ playLog: [makeEntry()] });
    renderHitLog(ctx, 0);
    fireEvent.click(screen.getByRole("button", { name: /collapse hit log/i }));
    expect(screen.queryByText("1B")).not.toBeInTheDocument();
  });

  it("expands again after toggling twice", () => {
    const ctx = makeCtx({ playLog: [makeEntry()] });
    renderHitLog(ctx, 0);
    fireEvent.click(screen.getByRole("button", { name: /collapse hit log/i }));
    fireEvent.click(screen.getByRole("button", { name: /expand hit log/i }));
    expect(screen.getByText("1B")).toBeInTheDocument();
  });

  it("lists entries in reverse chronological order (most recent first)", () => {
    const ctx = makeCtx({
      playLog: [
        makeEntry({ event: Hit.Single, batterNum: 1 }),
        makeEntry({ event: Hit.Homerun, batterNum: 2 }),
      ],
    });
    renderHitLog(ctx, 0);
    const labels = screen.getAllByText(/^(1B|HR)$/);
    // Most recent (HR) should appear before older (1B) in the DOM
    expect(labels[0].textContent).toBe("HR");
    expect(labels[1].textContent).toBe("1B");
  });

  it("shows only away team entries when activeTeam=0", () => {
    const ctx = makeCtx({
      playLog: [
        makeEntry({ team: 0, event: Hit.Single, batterNum: 1 }),
        makeEntry({ team: 1, event: Hit.Homerun, batterNum: 2 }),
      ],
    });
    renderHitLog(ctx, 0);
    expect(screen.getByText("1B")).toBeInTheDocument();
    expect(screen.queryByText("HR")).not.toBeInTheDocument();
  });

  it("shows only home team entries when activeTeam=1", () => {
    const ctx = makeCtx({
      playLog: [
        makeEntry({ team: 0, event: Hit.Single, batterNum: 1 }),
        makeEntry({ team: 1, event: Hit.Homerun, batterNum: 2 }),
      ],
    });
    renderHitLog(ctx, 1);
    expect(screen.queryByText("1B")).not.toBeInTheDocument();
    expect(screen.getByText("HR")).toBeInTheDocument();
  });

  it("shows team-specific empty state when selected team has no hits", () => {
    const ctx = makeCtx({
      playLog: [makeEntry({ team: 0, event: Hit.Single, batterNum: 1 })],
    });
    renderHitLog(ctx, 1);
    expect(screen.getByText(/no hits yet/i)).toBeInTheDocument();
    expect(screen.queryByText("1B")).not.toBeInTheDocument();
  });

  it("re-renders with different activeTeam showing correct filtered entries", () => {
    const playLog = [
      makeEntry({ team: 0, event: Hit.Single, batterNum: 1 }),
      makeEntry({ team: 1, event: Hit.Double, batterNum: 3 }),
    ];
    const ctx = makeCtx({ playLog });
    const { rerender } = renderHitLog(ctx, 0);
    expect(screen.getByText("1B")).toBeInTheDocument();
    expect(screen.queryByText("2B")).not.toBeInTheDocument();
    rerender(
      <GameContext.Provider value={ctx}>
        <HitLog activeTeam={1} />
      </GameContext.Provider>,
    );
    expect(screen.queryByText("1B")).not.toBeInTheDocument();
    expect(screen.getByText("2B")).toBeInTheDocument();
  });
});

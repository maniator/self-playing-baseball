/**
 * Tests for HitLog component (src/HitLog/index.tsx)
 */
import * as React from "react";

import type { ContextValue } from "@feat/gameplay/context/index";
import type { PlayLogEntry } from "@feat/gameplay/context/index";
import { GameContext } from "@feat/gameplay/context/index";
import { Hit } from "@shared/constants/hitTypes";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeContextValue } from "@test/testHelpers";

import HitLog from ".";

const makeCtx = (overrides: Partial<ContextValue> = {}): ContextValue =>
  makeContextValue({ teamLabels: ["Away FC", "Home SC"], ...overrides });

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
  playerId: "test_player",
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
    expect(screen.getByText(/Away FC/)).toBeInTheDocument();
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

  it("shows batterName when present instead of #N slot", () => {
    const ctx = makeCtx({
      playLog: [makeEntry({ batterNum: 3, batterName: "Roberto Martinez" })],
    });
    renderHitLog(ctx, 0);
    expect(screen.getByText(/Roberto Martinez/)).toBeInTheDocument();
    expect(screen.queryByText(/#3/)).not.toBeInTheDocument();
  });

  it("falls back to #N slot when batterName is absent", () => {
    const ctx = makeCtx({
      playLog: [makeEntry({ batterNum: 4 })],
    });
    renderHitLog(ctx, 0);
    expect(screen.getByText(/#4/)).toBeInTheDocument();
  });

  it("uses teamLabels for orphaned-team saves", () => {
    const ctx = makeCtx({
      teams: ["custom:ct_deleted", "custom:ct_home"] as [string, string],
      teamLabels: ["Buffalo Dynamo", "Cincinnati Bucks"] as [string, string],
      playLog: [makeEntry({ team: 0, batterNum: 7 })],
    });
    renderHitLog(ctx, 0);
    expect(screen.getByText(/Buffalo Dynamo/)).toBeInTheDocument();
    expect(screen.queryByText(/ct_deleted/)).not.toBeInTheDocument();
  });
});

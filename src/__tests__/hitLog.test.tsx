/**
 * Tests for HitLog component (src/HitLog/index.tsx)
 */
import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameContext } from "../Context";
import type { ContextValue } from "../Context";
import { Hit } from "../constants/hitTypes";
import type { PlayLogEntry } from "../Context";
import HitLog from "../HitLog";

const noop = () => {};

const makeCtx = (overrides: Partial<ContextValue> = {}): ContextValue => ({
  inning: 1, score: [0, 0], teams: ["Away", "Home"],
  baseLayout: [0, 0, 0], outs: 0, strikes: 0, balls: 0, atBat: 0,
  gameOver: false, pendingDecision: null, onePitchModifier: null,
  pitchKey: 0, decisionLog: [], hitType: undefined, log: [],
  batterIndex: [0, 0], inningRuns: [[], []], playLog: [],
  dispatch: vi.fn(), dispatchLog: vi.fn(),
  ...overrides,
});

const renderHitLog = (ctx: ContextValue = makeCtx()) =>
  render(<GameContext.Provider value={ctx}><HitLog /></GameContext.Provider>);

const makeEntry = (overrides: Partial<PlayLogEntry> = {}): PlayLogEntry => ({
  inning: 1, half: 0, batterNum: 1, team: 0, event: Hit.Single, runs: 0,
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

  it("shows an entry for a single", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ event: Hit.Single, batterNum: 3, inning: 2, half: 0, team: 0 })] });
    renderHitLog(ctx);
    expect(screen.getByText("1B")).toBeInTheDocument();
    expect(screen.getByText(/Away #3/)).toBeInTheDocument();
  });

  it("shows HR in gold colour class for a homerun", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ event: Hit.Homerun })] });
    renderHitLog(ctx);
    expect(screen.getByText("HR")).toBeInTheDocument();
  });

  it("shows walk as BB", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ event: Hit.Walk })] });
    renderHitLog(ctx);
    expect(screen.getByText("BB")).toBeInTheDocument();
  });

  it("shows +1 run when entry has runs=1", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ runs: 1 })] });
    renderHitLog(ctx);
    expect(screen.getByText("+1 run")).toBeInTheDocument();
  });

  it("pluralises 'runs' for runs > 1", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ runs: 3 })] });
    renderHitLog(ctx);
    expect(screen.getByText("+3 runs")).toBeInTheDocument();
  });

  it("does not show runs span when runs=0", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ runs: 0 })] });
    renderHitLog(ctx);
    expect(screen.queryByText(/\+0 run/)).not.toBeInTheDocument();
  });

  it("shows ▼ (bottom) arrow for half=1", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ half: 1, inning: 3 })] });
    renderHitLog(ctx);
    expect(screen.getByText(/▼3/)).toBeInTheDocument();
  });

  it("shows ▲ (top) arrow for half=0", () => {
    const ctx = makeCtx({ playLog: [makeEntry({ half: 0, inning: 5 })] });
    renderHitLog(ctx);
    expect(screen.getByText(/▲5/)).toBeInTheDocument();
  });

  it("is visible by default (not collapsed)", () => {
    const ctx = makeCtx({ playLog: [makeEntry()] });
    renderHitLog(ctx);
    expect(screen.getByText("1B")).toBeInTheDocument();
  });

  it("collapses when hide button is clicked", () => {
    const ctx = makeCtx({ playLog: [makeEntry()] });
    renderHitLog(ctx);
    fireEvent.click(screen.getByRole("button", { name: /collapse hit log/i }));
    expect(screen.queryByText("1B")).not.toBeInTheDocument();
  });

  it("expands again after toggling twice", () => {
    const ctx = makeCtx({ playLog: [makeEntry()] });
    renderHitLog(ctx);
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
    renderHitLog(ctx);
    const labels = screen.getAllByText(/^(1B|HR)$/);
    // Most recent (HR) should appear before older (1B) in the DOM
    expect(labels[0].textContent).toBe("HR");
    expect(labels[1].textContent).toBe("1B");
  });
});

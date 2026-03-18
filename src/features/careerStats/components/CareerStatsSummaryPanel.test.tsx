import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CareerStatsSummaryPanel from "./CareerStatsSummaryPanel";

describe("CareerStatsSummaryPanel", () => {
  it("renders summary and leader placeholders", () => {
    render(
      <CareerStatsSummaryPanel
        dataLoading={false}
        teamSummary={{
          gamesPlayed: 5,
          wins: 3,
          losses: 2,
          ties: 0,
          winPct: 0.6,
          runsScored: 20,
          runsAllowed: 18,
          runDiff: 2,
          rsPerGame: 4,
          raPerGame: 3.6,
          streak: "W1",
          last10: { wins: 3, losses: 2, ties: 0 },
        }}
        hrLeader={null}
        avgLeader={null}
        rbiLeader={null}
        eraLeader={null}
        savesLeader={null}
        strikeoutsLeader={null}
        onOpenPlayer={vi.fn()}
      />,
    );

    expect(screen.getByTestId("summary-gp")).toHaveTextContent("5");
    expect(screen.getByText(/HR - no data|HR — no data/i)).toBeInTheDocument();
    expect(screen.getByText(/SV - no data|SV — no data/i)).toBeInTheDocument();
  });
});

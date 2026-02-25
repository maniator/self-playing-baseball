import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SubstitutionPanel from "./index";

const defaultProps = {
  teamName: "Away",
  lineupOrder: ["p1", "p2", "p3"],
  rosterBench: ["b1", "b2"],
  rosterPitchers: ["sp1", "rp1"],
  activePitcherIdx: 0,
  playerOverrides: {
    p1: { nickname: "Alpha" },
    p2: { nickname: "Beta" },
    p3: { nickname: "Gamma" },
    b1: { nickname: "Bench A" },
    b2: { nickname: "Bench B" },
    sp1: { nickname: "Starter" },
    rp1: { nickname: "Reliever" },
  },
  onSubstitute: vi.fn(),
  onClose: vi.fn(),
};

describe("SubstitutionPanel", () => {
  it("renders the panel with team name in the title", () => {
    render(<SubstitutionPanel {...defaultProps} />);
    expect(screen.getByTestId("substitution-panel")).toBeInTheDocument();
    expect(screen.getByText(/Away Substitutions/)).toBeInTheDocument();
  });

  it("shows Batter Substitution and Pitching Change section headings", () => {
    render(<SubstitutionPanel {...defaultProps} />);
    expect(screen.getByText("Batter Substitution")).toBeInTheDocument();
    expect(screen.getByText("Pitching Change")).toBeInTheDocument();
  });

  it("shows Stage 3C placeholder note in pitcher section", () => {
    render(<SubstitutionPanel {...defaultProps} />);
    expect(screen.getByText(/Stage 3C/)).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    render(<SubstitutionPanel {...defaultProps} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /close substitution panel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows all bench player names in the bench select", () => {
    render(<SubstitutionPanel {...defaultProps} />);
    expect(screen.getByRole("option", { name: "Bench A" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bench B" })).toBeInTheDocument();
  });

  it("shows lineup player names in the lineup select", () => {
    render(<SubstitutionPanel {...defaultProps} />);
    expect(screen.getByRole("option", { name: /Alpha/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Beta/ })).toBeInTheDocument();
  });

  it("calls onSubstitute with batter payload when Sub In is clicked", async () => {
    const onSubstitute = vi.fn();
    render(<SubstitutionPanel {...defaultProps} onSubstitute={onSubstitute} />);
    await userEvent.click(screen.getByRole("button", { name: /Sub In/i }));
    expect(onSubstitute).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "batter", benchPlayerId: "b1" }),
    );
  });

  it("calls onSubstitute with pitcher payload when Change Pitcher is clicked", async () => {
    const onSubstitute = vi.fn();
    render(<SubstitutionPanel {...defaultProps} onSubstitute={onSubstitute} />);
    await userEvent.click(screen.getByRole("button", { name: /Change Pitcher/i }));
    expect(onSubstitute).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "pitcher", pitcherIdx: 1 }),
    );
  });

  it("shows 'No bench players available' when rosterBench is empty", () => {
    render(<SubstitutionPanel {...defaultProps} rosterBench={[]} />);
    expect(screen.getByText(/No bench players available/)).toBeInTheDocument();
  });

  it("shows all bench players even when their position matches another active lineup slot", () => {
    // Any bench player can substitute for any lineup slot; position is shown for context only.
    render(
      <SubstitutionPanel
        {...defaultProps}
        playerOverrides={{
          p1: { nickname: "Alpha", position: "C" },
          p2: { nickname: "Beta", position: "LF" },
          p3: { nickname: "Gamma", position: "RF" },
          b1: { nickname: "Bench A", position: "LF" }, // same position as p2 — still shown
          b2: { nickname: "Bench B", position: "C" }, // same position as p1 — still shown
          sp1: { nickname: "Starter" },
          rp1: { nickname: "Reliever" },
        }}
      />,
    );
    expect(screen.getByRole("option", { name: /Bench A \(LF\)/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Bench B \(C\)/ })).toBeInTheDocument();
  });

  it("shows 'No pitchers on roster' when rosterPitchers is empty", () => {
    render(<SubstitutionPanel {...defaultProps} rosterPitchers={[]} />);
    expect(screen.getByText(/No pitchers on roster/)).toBeInTheDocument();
  });

  it("shows 'No other pitchers available' when only one pitcher exists", () => {
    render(<SubstitutionPanel {...defaultProps} rosterPitchers={["sp1"]} activePitcherIdx={0} />);
    expect(screen.getByText(/No other pitchers available/)).toBeInTheDocument();
  });

  it("uses shortened player ID when no override nickname is present", () => {
    render(
      <SubstitutionPanel
        {...defaultProps}
        playerOverrides={{}}
        lineupOrder={["player_id_1234"]}
        rosterBench={["bench_id_5678"]}
        rosterPitchers={["pitcher_id_9"]}
      />,
    );
    expect(screen.getByRole("option", { name: /player_i/ })).toBeInTheDocument();
  });

  it("shows current pitcher name in the pitching section", () => {
    render(<SubstitutionPanel {...defaultProps} />);
    expect(screen.getByText(/Current: Starter/)).toBeInTheDocument();
  });

  it("shows position in parentheses when playerOverrides includes position", () => {
    render(
      <SubstitutionPanel
        {...defaultProps}
        playerOverrides={{
          ...defaultProps.playerOverrides,
          p1: { nickname: "Alpha", position: "C" },
          b1: { nickname: "Bench A", position: "LF" },
        }}
      />,
    );
    expect(screen.getByRole("option", { name: /Alpha \(C\)/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Bench A \(LF\)/ })).toBeInTheDocument();
  });
});

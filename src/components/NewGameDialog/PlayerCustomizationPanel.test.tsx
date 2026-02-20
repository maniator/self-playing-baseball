import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TeamCustomPlayerOverrides } from "@context/index";

import PlayerCustomizationPanel from "./PlayerCustomizationPanel";

const noop = vi.fn();

const defaultProps = {
  awayTeam: "New York Mets",
  homeTeam: "New York Yankees",
  awayOverrides: {} as TeamCustomPlayerOverrides,
  homeOverrides: {} as TeamCustomPlayerOverrides,
  onAwayChange: noop,
  onHomeChange: noop,
};

describe("PlayerCustomizationPanel", () => {
  it("renders the toggle button", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: /customize players/i })).toBeInTheDocument();
  });

  it("is collapsed by default — player inputs are not visible", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    expect(screen.queryByLabelText(/C nickname/i)).not.toBeInTheDocument();
  });

  it("expands when the toggle is clicked", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    expect(screen.getByLabelText(/C nickname/i)).toBeInTheDocument();
  });

  it("collapses when the toggle is clicked a second time", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    const toggle = screen.getByRole("button", { name: /customize players/i });
    act(() => {
      fireEvent.click(toggle);
    });
    act(() => {
      fireEvent.click(toggle);
    });
    expect(screen.queryByLabelText(/C nickname/i)).not.toBeInTheDocument();
  });

  it("shows Away tab active by default after expanding", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    const awayTab = screen.getByRole("button", { name: /away: new york mets/i });
    expect(awayTab).toBeInTheDocument();
  });

  it("switches to Home tab when clicked", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /home: new york yankees/i }));
    });
    // SP is pitcher-only row; check that pitcher CTL input is visible
    expect(screen.getByLabelText(/SP CTL/i)).toBeInTheDocument();
  });

  it("shows 9 batter rows and 1 pitcher row", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    // Each batter has 3 mod inputs (CNT, PWR, SPD)
    expect(screen.getAllByLabelText(/CNT/i)).toHaveLength(9);
  });

  it("calls onAwayChange when a batter modifier is changed", () => {
    const onAwayChange = vi.fn();
    render(<PlayerCustomizationPanel {...defaultProps} onAwayChange={onAwayChange} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    act(() => {
      fireEvent.change(screen.getAllByLabelText(/C CNT/i)[0], { target: { value: "5" } });
    });
    expect(onAwayChange).toHaveBeenCalled();
    const newOverrides = onAwayChange.mock.calls[0][0] as TeamCustomPlayerOverrides;
    const firstEntry = Object.values(newOverrides)[0];
    expect(firstEntry?.contactMod).toBe(5);
  });

  it("calls onHomeChange when a home team modifier is changed", () => {
    const onHomeChange = vi.fn();
    render(<PlayerCustomizationPanel {...defaultProps} onHomeChange={onHomeChange} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /home: new york yankees/i }));
    });
    act(() => {
      fireEvent.change(screen.getAllByLabelText(/C CNT/i)[0], { target: { value: "3" } });
    });
    expect(onHomeChange).toHaveBeenCalled();
  });

  it("clamps modifier values to [-20, 20]", () => {
    const onAwayChange = vi.fn();
    render(<PlayerCustomizationPanel {...defaultProps} onAwayChange={onAwayChange} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    act(() => {
      fireEvent.change(screen.getAllByLabelText(/C CNT/i)[0], { target: { value: "99" } });
    });
    const newOverrides = onAwayChange.mock.calls[0][0] as TeamCustomPlayerOverrides;
    expect(Object.values(newOverrides)[0]?.contactMod).toBe(20);
  });

  it("calls onAwayChange with nickname when nickname input is changed", () => {
    const onAwayChange = vi.fn();
    render(<PlayerCustomizationPanel {...defaultProps} onAwayChange={onAwayChange} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    act(() => {
      fireEvent.change(screen.getAllByLabelText(/C nickname/i)[0], { target: { value: "Speedy" } });
    });
    const newOverrides = onAwayChange.mock.calls[0][0] as TeamCustomPlayerOverrides;
    expect(Object.values(newOverrides)[0]?.nickname).toBe("Speedy");
  });

  it("shows pitcher CTL, VEL, STM inputs (not CNT/PWR/SPD) for SP row", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    expect(screen.getByLabelText(/SP CTL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/SP VEL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/SP STM/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/SP CNT/i)).not.toBeInTheDocument();
  });
});

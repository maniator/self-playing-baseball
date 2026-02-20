import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TeamCustomPlayerOverrides } from "@context/index";
import { generateRoster } from "@utils/roster";

import PlayerCustomizationPanel from "./PlayerCustomizationPanel";

const noop = vi.fn();

const awayOrder = generateRoster("New York Mets").batters.map((b) => b.id);
const homeOrder = generateRoster("New York Yankees").batters.map((b) => b.id);

const defaultProps = {
  awayTeam: "New York Mets",
  homeTeam: "New York Yankees",
  awayOverrides: {} as TeamCustomPlayerOverrides,
  homeOverrides: {} as TeamCustomPlayerOverrides,
  onAwayChange: noop,
  onHomeChange: noop,
  awayOrder,
  homeOrder,
  onAwayOrderChange: noop,
  onHomeOrderChange: noop,
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
    expect(screen.getByRole("button", { name: /away: new york mets/i })).toBeInTheDocument();
  });

  it("switches to Home tab when clicked", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /home: new york yankees/i }));
    });
    expect(screen.getByLabelText(/SP CTL/i)).toBeInTheDocument();
  });

  it("shows 9 batter rows (CON label) and 1 pitcher row", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    expect(screen.getAllByLabelText(/CON/i)).toHaveLength(9);
  });

  it("calls onAwayChange when a batter modifier is changed", () => {
    const onAwayChange = vi.fn();
    render(<PlayerCustomizationPanel {...defaultProps} onAwayChange={onAwayChange} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    act(() => {
      fireEvent.change(screen.getAllByLabelText(/C CON/i)[0], { target: { value: "5" } });
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
      fireEvent.change(screen.getAllByLabelText(/C CON/i)[0], { target: { value: "3" } });
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
      fireEvent.change(screen.getAllByLabelText(/C CON/i)[0], { target: { value: "99" } });
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

  it("shows pitcher CTL, VEL, STM inputs (not CON/PWR/SPD) for SP row", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    expect(screen.getByLabelText(/SP CTL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/SP VEL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/SP STM/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/SP CON/i)).not.toBeInTheDocument();
  });

  it("shows a 'Starting Pitcher' divider label above the pitcher row", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    expect(screen.getByText(/starting pitcher/i)).toBeInTheDocument();
  });

  it("pitcher row has no drag handle (cannot be reordered)", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    // 9 batters have drag handles; pitcher does not
    expect(screen.getAllByLabelText(/^drag /i)).toHaveLength(9);
    expect(screen.queryByLabelText(/drag sp/i)).not.toBeInTheDocument();
  });

  it("renders a drag handle for each batter", () => {
    render(<PlayerCustomizationPanel {...defaultProps} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /customize players/i }));
    });
    expect(screen.getByLabelText(/^drag C$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^drag DH$/i)).toBeInTheDocument();
  });
});

import * as React from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import StarterPitcherSelector, { type SpPitcher } from "./StarterPitcherSelector";

const SP_PITCHERS: SpPitcher[] = [
  { id: "p1", idx: 0, name: "Ace Starter", pitchingRole: "SP" },
  { id: "p2", idx: 2, name: "Spot Starter", pitchingRole: "SP/RP" },
  { id: "p3", idx: 4, name: "Swing Man" },
];

function renderSelector(
  overrides: Partial<React.ComponentProps<typeof StarterPitcherSelector>> = {},
) {
  const defaults = {
    teamLabel: "Away",
    startIdx: 0,
    pitchers: SP_PITCHERS,
    onSelect: vi.fn(),
  };
  return render(<StarterPitcherSelector {...defaults} {...overrides} />);
}

describe("StarterPitcherSelector", () => {
  it("renders the team label in the field label", () => {
    renderSelector({ teamLabel: "Home" });
    expect(screen.getByText(/home starting pitcher/i)).toBeInTheDocument();
  });

  it("renders all pitchers as options", () => {
    renderSelector();
    const select = screen.getByTestId("starting-pitcher-select") as HTMLSelectElement;
    expect(select.options).toHaveLength(SP_PITCHERS.length);
    expect(select.options[0].text).toBe("Ace Starter (SP)");
    expect(select.options[1].text).toBe("Spot Starter (SP/RP)");
    // No role → no parenthetical suffix
    expect(select.options[2].text).toBe("Swing Man");
  });

  it("displays the correct initial selection (startIdx)", () => {
    renderSelector({ startIdx: 2 });
    const select = screen.getByTestId("starting-pitcher-select") as HTMLSelectElement;
    expect(select.value).toBe("2");
  });

  it("calls onSelect with the numeric idx when the user changes the selection", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderSelector({ onSelect });
    const select = screen.getByTestId("starting-pitcher-select");
    await user.selectOptions(select, "2");
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("renders no options when pitchers array is empty", () => {
    renderSelector({ pitchers: [] });
    const select = screen.getByTestId("starting-pitcher-select") as HTMLSelectElement;
    expect(select.options).toHaveLength(0);
  });
});

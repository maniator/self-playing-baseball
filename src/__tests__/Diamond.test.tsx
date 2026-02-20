import * as React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { GameContext } from "../Context";
import type { ContextValue } from "../Context";
import { makeContextValue } from "./testHelpers";
import Diamond from "../Diamond";

const renderWithContext = (ui: React.ReactElement, ctx: ContextValue = makeContextValue()) =>
  render(<GameContext.Provider value={ctx}>{ui}</GameContext.Provider>);

describe("Diamond", () => {
  it("renders without crashing", () => {
    const { container } = renderWithContext(<Diamond />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders with runners on all bases", () => {
    const { container } = renderWithContext(<Diamond />, makeContextValue({ baseLayout: [1, 1, 1] }));
    expect(container.firstChild).not.toBeNull();
  });

  it("renders with no runners on bases", () => {
    const { container } = renderWithContext(<Diamond />, makeContextValue({ baseLayout: [0, 0, 0] }));
    expect(container.firstChild).not.toBeNull();
  });
});

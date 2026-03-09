import * as React from "react";

import type { ContextValue } from "@feat/gameplay/context/index";
import { GameContext } from "@feat/gameplay/context/index";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeContextValue } from "@test/testHelpers";

import Diamond from ".";

const renderWithContext = (ui: React.ReactElement, ctx: ContextValue = makeContextValue()) =>
  render(<GameContext.Provider value={ctx}>{ui}</GameContext.Provider>);

describe("Diamond", () => {
  it("renders without crashing", () => {
    const { container } = renderWithContext(<Diamond />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders with runners on all bases", () => {
    const { container } = renderWithContext(
      <Diamond />,
      makeContextValue({ baseLayout: [1, 1, 1] }),
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("renders with no runners on bases", () => {
    const { container } = renderWithContext(
      <Diamond />,
      makeContextValue({ baseLayout: [0, 0, 0] }),
    );
    expect(container.firstChild).not.toBeNull();
  });
});

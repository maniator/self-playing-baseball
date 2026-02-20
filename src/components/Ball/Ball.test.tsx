import * as React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { GameContext } from "@context/index";
import type { ContextValue } from "@context/index";
import { Hit } from "@constants/hitTypes";
import { makeContextValue } from "@test/testHelpers";
import Ball from ".";

const renderWithContext = (ui: React.ReactElement, ctx: ContextValue = makeContextValue()) =>
  render(<GameContext.Provider value={ctx}>{ui}</GameContext.Provider>);

describe("Ball", () => {
  it("renders without crashing (no hit)", () => {
    const { container } = renderWithContext(<Ball />, makeContextValue({ hitType: undefined, pitchKey: 0 }));
    expect(container.firstChild).not.toBeNull();
  });

  it("renders with a single hit type", () => {
    const { container } = renderWithContext(<Ball />, makeContextValue({ hitType: Hit.Single, pitchKey: 1 }));
    expect(container.firstChild).not.toBeNull();
  });

  it("renders with a homerun hit type", () => {
    const { container } = renderWithContext(<Ball />, makeContextValue({ hitType: Hit.Homerun, pitchKey: 2 }));
    expect(container.firstChild).not.toBeNull();
  });

  it("renders with a walk (isHit should be false for Walk)", () => {
    const { container } = renderWithContext(<Ball />, makeContextValue({ hitType: Hit.Walk, pitchKey: 3 }));
    expect(container.firstChild).not.toBeNull();
  });
});

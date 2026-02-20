import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ContextValue } from "@context/index";
import { GameContext } from "@context/index";
import { makeContextValue } from "@test/testHelpers";

import Announcements from ".";

const renderWithContext = (ui: React.ReactElement, ctx: ContextValue = makeContextValue()) =>
  render(<GameContext.Provider value={ctx}>{ui}</GameContext.Provider>);

describe("Announcements", () => {
  it("shows play-by-play heading always", () => {
    renderWithContext(<Announcements />);
    expect(screen.getByText(/play-by-play/i)).toBeInTheDocument();
  });

  it("is collapsed by default — content not visible", () => {
    renderWithContext(<Announcements />, makeContextValue({ log: ["Strike one."] }));
    expect(screen.queryByText("Strike one.")).not.toBeInTheDocument();
  });

  it("shows content after clicking show toggle", () => {
    renderWithContext(<Announcements />, makeContextValue({ log: ["Strike one.", "Ball one."] }));
    fireEvent.click(screen.getByRole("button", { name: /expand play-by-play/i }));
    expect(screen.getByText("Strike one.")).toBeInTheDocument();
    expect(screen.getByText("Ball one.")).toBeInTheDocument();
  });

  it("shows empty state message when expanded and log is empty", () => {
    renderWithContext(<Announcements />, makeContextValue({ log: [] }));
    fireEvent.click(screen.getByRole("button", { name: /expand play-by-play/i }));
    expect(screen.getByText(/batter up/i)).toBeInTheDocument();
  });

  it("collapses again after toggling twice", () => {
    renderWithContext(<Announcements />, makeContextValue({ log: ["Strike one."] }));
    const btn = screen.getByRole("button", { name: /expand play-by-play/i });
    fireEvent.click(btn);
    expect(screen.getByText("Strike one.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /collapse play-by-play/i }));
    expect(screen.queryByText("Strike one.")).not.toBeInTheDocument();
  });
});

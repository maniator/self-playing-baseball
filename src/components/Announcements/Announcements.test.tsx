import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
    expect(screen.getByText(/play ball/i)).toBeInTheDocument();
  });

  it("collapses again after toggling twice", () => {
    renderWithContext(<Announcements />, makeContextValue({ log: ["Strike one."] }));
    const btn = screen.getByRole("button", { name: /expand play-by-play/i });
    fireEvent.click(btn);
    expect(screen.getByText("Strike one.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /collapse play-by-play/i }));
    expect(screen.queryByText("Strike one.")).not.toBeInTheDocument();
  });

  it("resolves raw team IDs in legacy log entries to display names via teamLabels", () => {
    // Simulate an old log entry that embeds the raw game ID (e.g. from a restored save
    // created before the teamLabels fix). The new resolveEntry uses state.teamLabels for
    // targeted replacement — no regex pattern matching needed.
    const log = ["custom:ct_v-E1gLliCLzM manager: Defensive shift deployed."];
    renderWithContext(
      <Announcements />,
      makeContextValue({
        log,
        teams: ["custom:ct_v-E1gLliCLzM", "custom:ct_home"],
        teamLabels: ["Visitors", "Home"],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /expand play-by-play/i }));
    // Display name should appear; raw ID must not.
    expect(screen.getByText(/Visitors manager: Defensive shift deployed\./)).toBeInTheDocument();
    expect(screen.queryByText(/ct_v/)).not.toBeInTheDocument();
  });
});

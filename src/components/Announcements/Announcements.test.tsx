import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ContextValue } from "@context/index";
import { GameContext } from "@context/index";
import { makeContextValue } from "@test/testHelpers";

import Announcements from ".";

// Provide a mock customTeams list so resolveEntry can look up display names.
vi.mock("@hooks/useCustomTeams", () => ({
  useCustomTeams: vi.fn(() => ({
    teams: [
      {
        id: "ct_v-E1gLliCLzM",
        name: "Visitors",
        city: "",
        abbreviation: "VIS",
        fingerprint: "",
        teamSeed: "",
        roster: { lineup: [], bench: [], pitchers: [] },
      },
    ],
    loading: false,
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    refresh: vi.fn(),
  })),
}));

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

  it("resolves hyphenated custom team IDs in log entries to display names", () => {
    // Team ID ct_v-E1gLliCLzM contains a hyphen; the old regex [a-zA-Z0-9_]+ would
    // truncate at the hyphen, leaving a raw ID fragment visible.
    const log = ["custom:ct_v-E1gLliCLzM manager: Defensive shift deployed."];
    renderWithContext(<Announcements />, makeContextValue({ log }));
    fireEvent.click(screen.getByRole("button", { name: /expand play-by-play/i }));
    // Display name should appear; raw ID fragment must not.
    expect(screen.getByText(/Visitors manager: Defensive shift deployed\./)).toBeInTheDocument();
    expect(screen.queryByText(/ct_v/)).not.toBeInTheDocument();
  });
});

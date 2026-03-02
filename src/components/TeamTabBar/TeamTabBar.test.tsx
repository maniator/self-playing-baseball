import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCustomTeams } from "@hooks/useCustomTeams";

import TeamTabBar from ".";

vi.mock("@hooks/useCustomTeams", () => ({
  useCustomTeams: vi.fn(),
}));

const mockTeams = [
  {
    id: "ct_away_team",
    name: "Mets",
    city: "",
    abbreviation: "MET",
    source: "custom",
    schemaVersion: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    roster: { schemaVersion: 1, lineup: [], bench: [], pitchers: [] },
    metadata: { archived: false },
  },
  {
    id: "ct_home_team",
    name: "Yankees",
    city: "",
    abbreviation: "YNK",
    source: "custom",
    schemaVersion: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    roster: { schemaVersion: 1, lineup: [], bench: [], pitchers: [] },
    metadata: { archived: false },
  },
];

const renderTabBar = (activeTeam: 0 | 1 = 0, onSelect = vi.fn()) => {
  vi.mocked(useCustomTeams).mockReturnValue({
    teams: mockTeams as any,
    loading: false,
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    refresh: vi.fn(),
  });
  return render(
    <TeamTabBar
      teams={["custom:ct_away_team", "custom:ct_home_team"]}
      activeTeam={activeTeam}
      onSelect={onSelect}
    />,
  );
};

describe("TeamTabBar", () => {
  it("renders both team tabs", () => {
    renderTabBar();
    expect(screen.getByTestId("team-tab-away")).toBeInTheDocument();
    expect(screen.getByTestId("team-tab-home")).toBeInTheDocument();
  });

  it("labels tabs with the provided team names", () => {
    renderTabBar();
    expect(screen.getByTestId("team-tab-away")).toHaveTextContent("Mets");
    expect(screen.getByTestId("team-tab-home")).toHaveTextContent("Yankees");
  });

  it("container has role='tablist'", () => {
    renderTabBar();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("each tab button has role='tab'", () => {
    renderTabBar();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
  });

  it("away tab has aria-selected=true when activeTeam=0", () => {
    renderTabBar(0);
    expect(screen.getByTestId("team-tab-away")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("team-tab-home")).toHaveAttribute("aria-selected", "false");
  });

  it("home tab has aria-selected=true when activeTeam=1", () => {
    renderTabBar(1);
    expect(screen.getByTestId("team-tab-away")).toHaveAttribute("aria-selected", "false");
    expect(screen.getByTestId("team-tab-home")).toHaveAttribute("aria-selected", "true");
  });

  it("calls onSelect(0) when away tab is clicked", () => {
    const onSelect = vi.fn();
    renderTabBar(1, onSelect);
    fireEvent.click(screen.getByTestId("team-tab-away"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("calls onSelect(1) when home tab is clicked", () => {
    const onSelect = vi.fn();
    renderTabBar(0, onSelect);
    fireEvent.click(screen.getByTestId("team-tab-home"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("away tab prefix shows ▲ and home tab prefix shows ▼", () => {
    renderTabBar();
    expect(screen.getByTestId("team-tab-away").textContent).toMatch(/▲/);
    expect(screen.getByTestId("team-tab-home").textContent).toMatch(/▼/);
  });
});

import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TeamTabBar from ".";

const renderTabBar = (activeTeam: 0 | 1 = 0, onSelect = vi.fn()) =>
  render(<TeamTabBar teams={["Mets", "Yankees"]} activeTeam={activeTeam} onSelect={onSelect} />);

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

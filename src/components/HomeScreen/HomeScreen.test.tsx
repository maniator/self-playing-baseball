import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomeScreen from "./index";

describe("HomeScreen", () => {
  const noop = vi.fn();

  it("renders the home screen", () => {
    render(<HomeScreen onNewGame={noop} onLoadSaves={noop} onManageTeams={noop} />);
    expect(screen.getByTestId("home-screen")).toBeInTheDocument();
  });

  it("shows the New Game button", () => {
    render(<HomeScreen onNewGame={noop} onLoadSaves={noop} onManageTeams={noop} />);
    expect(screen.getByTestId("home-new-game-button")).toBeInTheDocument();
  });

  it("shows the Load Saved Game button", () => {
    render(<HomeScreen onNewGame={noop} onLoadSaves={noop} onManageTeams={noop} />);
    expect(screen.getByTestId("home-load-saves-button")).toBeInTheDocument();
  });

  it("shows the Manage Teams button", () => {
    render(<HomeScreen onNewGame={noop} onLoadSaves={noop} onManageTeams={noop} />);
    expect(screen.getByTestId("home-manage-teams-button")).toBeInTheDocument();
  });

  it("does NOT show Resume button when onResumeCurrent is not provided", () => {
    render(<HomeScreen onNewGame={noop} onLoadSaves={noop} onManageTeams={noop} />);
    expect(screen.queryByTestId("home-resume-current-game-button")).not.toBeInTheDocument();
  });

  it("shows Resume button when onResumeCurrent is provided", () => {
    render(
      <HomeScreen
        onNewGame={noop}
        onLoadSaves={noop}
        onManageTeams={noop}
        onResumeCurrent={noop}
      />,
    );
    expect(screen.getByTestId("home-resume-current-game-button")).toBeInTheDocument();
  });

  it("calls onNewGame when New Game button is clicked", () => {
    const onNewGame = vi.fn();
    render(<HomeScreen onNewGame={onNewGame} onLoadSaves={noop} onManageTeams={noop} />);
    fireEvent.click(screen.getByTestId("home-new-game-button"));
    expect(onNewGame).toHaveBeenCalled();
  });

  it("calls onLoadSaves when Load Saved Game button is clicked", () => {
    const onLoadSaves = vi.fn();
    render(<HomeScreen onNewGame={noop} onLoadSaves={onLoadSaves} onManageTeams={noop} />);
    fireEvent.click(screen.getByTestId("home-load-saves-button"));
    expect(onLoadSaves).toHaveBeenCalled();
  });

  it("calls onManageTeams when Manage Teams button is clicked", () => {
    const onManageTeams = vi.fn();
    render(<HomeScreen onNewGame={noop} onLoadSaves={noop} onManageTeams={onManageTeams} />);
    fireEvent.click(screen.getByTestId("home-manage-teams-button"));
    expect(onManageTeams).toHaveBeenCalled();
  });

  it("calls onResumeCurrent when Resume button is clicked", () => {
    const onResumeCurrent = vi.fn();
    render(
      <HomeScreen
        onNewGame={noop}
        onLoadSaves={noop}
        onManageTeams={noop}
        onResumeCurrent={onResumeCurrent}
      />,
    );
    fireEvent.click(screen.getByTestId("home-resume-current-game-button"));
    expect(onResumeCurrent).toHaveBeenCalled();
  });
});

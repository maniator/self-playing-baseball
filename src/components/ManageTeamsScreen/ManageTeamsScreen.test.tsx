import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hooks/useCustomTeams", () => ({
  useCustomTeams: vi.fn(() => ({
    teams: [],
    loading: false,
    deleteTeam: vi.fn(),
    refresh: vi.fn(),
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
  })),
}));

vi.mock("@components/CustomTeamEditor", () => ({
  default: ({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) => (
    <div data-testid="custom-team-editor">
      <button onClick={onSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

import ManageTeamsScreen from "./index";

describe("ManageTeamsScreen", () => {
  it("renders the manage teams screen", () => {
    render(<ManageTeamsScreen onBack={vi.fn()} />);
    expect(screen.getByTestId("manage-teams-screen")).toBeInTheDocument();
  });

  it("shows the Back to Home button", () => {
    render(<ManageTeamsScreen onBack={vi.fn()} />);
    expect(screen.getByTestId("manage-teams-back-button")).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<ManageTeamsScreen onBack={onBack} />);
    fireEvent.click(screen.getByTestId("manage-teams-back-button"));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows empty state when no teams exist", () => {
    render(<ManageTeamsScreen onBack={vi.fn()} />);
    expect(screen.getByText(/no custom teams yet/i)).toBeInTheDocument();
  });

  it("shows Create New Team button", () => {
    render(<ManageTeamsScreen onBack={vi.fn()} />);
    expect(screen.getByTestId("manage-teams-create-button")).toBeInTheDocument();
  });

  it("shows the editor shell when Create New Team is clicked", () => {
    render(<ManageTeamsScreen onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId("manage-teams-create-button"));
    expect(screen.getByTestId("manage-teams-editor-shell")).toBeInTheDocument();
    expect(screen.getByTestId("custom-team-editor")).toBeInTheDocument();
  });

  it("returns to list view when editor Cancel is clicked", () => {
    render(<ManageTeamsScreen onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId("manage-teams-create-button"));
    expect(screen.getByTestId("manage-teams-editor-shell")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByTestId("manage-teams-screen")).toBeInTheDocument();
  });

  it("returns to list view when editor Save is clicked", () => {
    render(<ManageTeamsScreen onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId("manage-teams-create-button"));
    fireEvent.click(screen.getByRole("button", { name: /^save/i }));
    expect(screen.getByTestId("manage-teams-screen")).toBeInTheDocument();
  });

  it("shows info banner when hasActiveGame is true", () => {
    render(<ManageTeamsScreen onBack={vi.fn()} hasActiveGame />);
    expect(screen.getByText(/changes to saved teams apply to future games/i)).toBeInTheDocument();
  });

  it("does NOT show info banner when hasActiveGame is false", () => {
    render(<ManageTeamsScreen onBack={vi.fn()} hasActiveGame={false} />);
    expect(
      screen.queryByText(/changes to saved teams apply to future games/i),
    ).not.toBeInTheDocument();
  });

  it("shows loading state when teams are loading", async () => {
    const { useCustomTeams } = await import("@hooks/useCustomTeams");
    vi.mocked(useCustomTeams).mockReturnValueOnce({
      teams: [],
      loading: true,
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
    });
    render(<ManageTeamsScreen onBack={vi.fn()} />);
    expect(screen.getByText(/loading teams/i)).toBeInTheDocument();
  });

  it("shows back-to-list button inside editor shell", () => {
    render(<ManageTeamsScreen onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId("manage-teams-create-button"));
    expect(screen.getByTestId("manage-teams-editor-back-button")).toBeInTheDocument();
  });

  it("clicking editor-back-button returns to list view", () => {
    render(<ManageTeamsScreen onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId("manage-teams-create-button"));
    fireEvent.click(screen.getByTestId("manage-teams-editor-back-button"));
    expect(screen.getByTestId("manage-teams-screen")).toBeInTheDocument();
  });
});

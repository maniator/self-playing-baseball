import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

import { useCustomTeams } from "@hooks/useCustomTeams";

import ManageTeamsScreen from "./index";

/** Renders ManageTeamsScreen inside a MemoryRouter with the teams routes set up. */
function renderAt(path = "/teams", props: { onBack?: () => void; hasActiveGame?: boolean } = {}) {
  const onBack = props.onBack ?? vi.fn();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/teams" element={<ManageTeamsScreen onBack={onBack} {...props} />} />
        <Route path="/teams/new" element={<ManageTeamsScreen onBack={onBack} {...props} />} />
        <Route
          path="/teams/:teamId/edit"
          element={<ManageTeamsScreen onBack={onBack} {...props} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ManageTeamsScreen", () => {
  it("renders the manage teams screen", () => {
    renderAt("/teams");
    expect(screen.getByTestId("manage-teams-screen")).toBeInTheDocument();
  });

  it("shows the Back to Home button", () => {
    renderAt("/teams");
    expect(screen.getByTestId("manage-teams-back-button")).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    renderAt("/teams", { onBack });
    fireEvent.click(screen.getByTestId("manage-teams-back-button"));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows empty state when no teams exist", () => {
    renderAt("/teams");
    expect(screen.getByText(/no custom teams yet/i)).toBeInTheDocument();
  });

  it("shows Create New Team button", () => {
    renderAt("/teams");
    expect(screen.getByTestId("manage-teams-create-button")).toBeInTheDocument();
  });

  it("shows the editor shell when Create New Team is clicked", () => {
    renderAt("/teams");
    fireEvent.click(screen.getByTestId("manage-teams-create-button"));
    expect(screen.getByTestId("manage-teams-editor-shell")).toBeInTheDocument();
    expect(screen.getByTestId("custom-team-editor")).toBeInTheDocument();
  });

  it("returns to list view when editor Cancel is clicked", () => {
    renderAt("/teams");
    fireEvent.click(screen.getByTestId("manage-teams-create-button"));
    expect(screen.getByTestId("manage-teams-editor-shell")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByTestId("manage-teams-screen")).toBeInTheDocument();
  });

  it("returns to list view when editor Save is clicked", () => {
    renderAt("/teams");
    fireEvent.click(screen.getByTestId("manage-teams-create-button"));
    fireEvent.click(screen.getByRole("button", { name: /^save/i }));
    expect(screen.getByTestId("manage-teams-screen")).toBeInTheDocument();
  });

  it("shows the editor shell at /teams/new directly", () => {
    renderAt("/teams/new");
    expect(screen.getByTestId("manage-teams-editor-shell")).toBeInTheDocument();
    expect(screen.getByTestId("custom-team-editor")).toBeInTheDocument();
  });

  it("shows the editor shell at /teams/:id/edit directly", () => {
    vi.mocked(useCustomTeams).mockReturnValueOnce({
      teams: [
        {
          id: "some-team-id",
          name: "Test Team",
          roster: { lineup: [], pitchers: [], bench: [] },
          abbreviation: "TST",
          city: "Testville",
        },
      ],
      loading: false,
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
    });
    renderAt("/teams/some-team-id/edit");
    expect(screen.getByTestId("manage-teams-editor-shell")).toBeInTheDocument();
    expect(screen.getByTestId("custom-team-editor")).toBeInTheDocument();
  });

  it("shows info banner when hasActiveGame is true", () => {
    renderAt("/teams", { hasActiveGame: true });
    expect(screen.getByText(/changes to saved teams apply to future games/i)).toBeInTheDocument();
  });

  it("does NOT show info banner when hasActiveGame is false", () => {
    renderAt("/teams", { hasActiveGame: false });
    expect(
      screen.queryByText(/changes to saved teams apply to future games/i),
    ).not.toBeInTheDocument();
  });

  it("shows loading state when teams are loading", () => {
    vi.mocked(useCustomTeams).mockReturnValueOnce({
      teams: [],
      loading: true,
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
    });
    renderAt("/teams");
    expect(screen.getByText(/loading teams/i)).toBeInTheDocument();
  });

  it("shows back-to-list button inside editor shell", () => {
    renderAt("/teams");
    fireEvent.click(screen.getByTestId("manage-teams-create-button"));
    expect(screen.getByTestId("manage-teams-editor-back-button")).toBeInTheDocument();
  });

  it("clicking editor-back-button returns to list view", () => {
    renderAt("/teams");
    fireEvent.click(screen.getByTestId("manage-teams-create-button"));
    fireEvent.click(screen.getByTestId("manage-teams-editor-back-button"));
    expect(screen.getByTestId("manage-teams-screen")).toBeInTheDocument();
  });
});

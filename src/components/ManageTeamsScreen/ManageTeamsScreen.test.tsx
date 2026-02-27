import * as React from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
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

vi.mock("@storage/customTeamStore", () => ({
  CustomTeamStore: {
    exportCustomTeams: vi.fn(() =>
      Promise.resolve(
        '{"type":"customTeams","formatVersion":1,"exportedAt":"2024-01-01T00:00:00.000Z","payload":{"teams":[]}}',
      ),
    ),
    importCustomTeams: vi.fn(() =>
      Promise.resolve({
        teams: [],
        created: 1,
        remapped: 0,
        skipped: 0,
        duplicateWarnings: [],
        duplicatePlayerWarnings: [],
      }),
    ),
  },
}));

vi.mock("@storage/saveIO", () => ({
  downloadJson: vi.fn(),
  teamsFilename: vi.fn(() => "ballgame-teams-test.json"),
}));

vi.mock("@hooks/useImportCustomTeams", () => ({
  useImportCustomTeams: vi.fn(({ onSuccess }: { onSuccess: (r: unknown) => void }) => ({
    importError: null,
    importing: false,
    handleFileImport: vi.fn(),
    _triggerSuccess: onSuccess,
  })),
}));

import { useCustomTeams } from "@hooks/useCustomTeams";
import { useImportCustomTeams } from "@hooks/useImportCustomTeams";
import { CustomTeamStore } from "@storage/customTeamStore";
import { downloadJson } from "@storage/saveIO";

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

  it("shows loading state when editing and teams are still loading", () => {
    vi.mocked(useCustomTeams).mockReturnValueOnce({
      teams: [],
      loading: true,
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
    });
    renderAt("/teams/some-team-id/edit");
    expect(screen.getByText(/loading team/i)).toBeInTheDocument();
    expect(screen.queryByTestId("custom-team-editor")).not.toBeInTheDocument();
  });

  it("shows not-found state at /teams/:id/edit when team does not exist", () => {
    vi.mocked(useCustomTeams).mockReturnValueOnce({
      teams: [],
      loading: false,
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
    });
    renderAt("/teams/nonexistent-id/edit");
    expect(screen.getByText(/team not found/i)).toBeInTheDocument();
    expect(screen.queryByTestId("custom-team-editor")).not.toBeInTheDocument();
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

describe("ManageTeamsScreen — Import/Export section", () => {
  const sampleTeam = {
    id: "ct_sample",
    name: "Sample Team",
    abbreviation: "SAM",
    roster: {
      schemaVersion: 1,
      lineup: [
        {
          id: "p1",
          name: "Player",
          role: "batter",
          batting: { contact: 70, power: 60, speed: 50 },
        },
      ],
      bench: [],
      pitchers: [],
    },
    metadata: { archived: false },
    schemaVersion: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    source: "custom" as const,
  };

  it("shows import and export all buttons", () => {
    vi.mocked(useCustomTeams).mockReturnValueOnce({
      teams: [sampleTeam],
      loading: false,
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
    });
    renderAt("/teams");
    expect(screen.getByTestId("import-teams-button")).toBeInTheDocument();
    expect(screen.getByTestId("export-all-teams-button")).toBeInTheDocument();
  });

  it("does not show export-all when no teams exist", () => {
    renderAt("/teams");
    expect(screen.queryByTestId("export-all-teams-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("import-teams-button")).toBeInTheDocument();
  });

  it("calls exportCustomTeams and downloadJson when export-all is clicked", async () => {
    vi.mocked(useCustomTeams).mockReturnValueOnce({
      teams: [sampleTeam],
      loading: false,
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
    });
    renderAt("/teams");
    fireEvent.click(screen.getByTestId("export-all-teams-button"));
    await waitFor(() => {
      expect(vi.mocked(CustomTeamStore.exportCustomTeams)).toHaveBeenCalled();
      expect(vi.mocked(downloadJson)).toHaveBeenCalled();
    });
  });

  it("calls exportCustomTeams with team id when per-team export button is clicked", async () => {
    vi.mocked(useCustomTeams).mockReturnValueOnce({
      teams: [sampleTeam],
      loading: false,
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
    });
    renderAt("/teams");
    fireEvent.click(screen.getByTestId("export-team-button"));
    await waitFor(() => {
      expect(vi.mocked(CustomTeamStore.exportCustomTeams)).toHaveBeenCalledWith(["ct_sample"]);
    });
  });

  it("shows success message after successful import", async () => {
    const mockUseImport = vi.mocked(useImportCustomTeams);
    let capturedOnSuccess: ((r: unknown) => void) | undefined;
    mockUseImport.mockImplementation(({ onSuccess }) => {
      capturedOnSuccess = onSuccess;
      return { importError: null, importing: false, handleFileImport: vi.fn() };
    });
    renderAt("/teams");
    expect(capturedOnSuccess).toBeDefined();
    const { act } = await import("react");
    act(() => {
      capturedOnSuccess!({
        teams: [sampleTeam],
        created: 1,
        remapped: 0,
        skipped: 0,
        duplicateWarnings: [],
        duplicatePlayerWarnings: [],
      });
    });
    expect(screen.getByTestId("import-teams-success")).toBeInTheDocument();
  });

  it("shows error message when import fails", () => {
    vi.mocked(useImportCustomTeams).mockReturnValueOnce({
      importError: "Invalid JSON",
      importing: false,
      handleFileImport: vi.fn(),
    });
    renderAt("/teams");
    expect(screen.getByTestId("import-teams-error")).toBeInTheDocument();
    expect(screen.getByText("Invalid JSON")).toBeInTheDocument();
  });
});

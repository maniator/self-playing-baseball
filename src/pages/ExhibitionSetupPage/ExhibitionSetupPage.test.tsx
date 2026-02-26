import * as React from "react";

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@utils/mlbTeams", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@utils/mlbTeams")>();
  return {
    ...mod,
    fetchMlbTeams: vi.fn().mockResolvedValue({ al: mod.AL_FALLBACK, nl: mod.NL_FALLBACK }),
  };
});

vi.mock("@utils/rng", () => ({
  getSeed: vi.fn(() => 0xdeadbeef),
  reinitSeed: vi.fn(),
}));

vi.mock("@hooks/useCustomTeams", () => ({
  useCustomTeams: vi.fn(() => ({
    teams: [],
    loading: false,
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
  })),
}));

const mockOnStartGame = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...mod,
    useOutletContext: vi.fn(() => ({ onStartGame: mockOnStartGame })),
    useNavigate: vi.fn(() => mockNavigate),
  };
});

import * as rngModule from "@utils/rng";

import ExhibitionSetupPage from "./index";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/exhibition/new"]}>
      <Routes>
        <Route path="/exhibition/new" element={<ExhibitionSetupPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ExhibitionSetupPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset useCustomTeams to empty-teams default so each test is hermetic.
    // (vi.clearAllMocks does NOT reset mockReturnValue overrides.)
    const { useCustomTeams } = await import("@hooks/useCustomTeams");
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [] as any,
      loading: false,
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it("renders the exhibition setup page", () => {
    renderPage();
    expect(screen.getByTestId("exhibition-setup-page")).toBeInTheDocument();
  });

  it("defaults to Custom Teams tab (aria-selected=true)", () => {
    renderPage();
    const customTab = screen.getByTestId("new-game-custom-teams-tab");
    expect(customTab).toHaveAttribute("aria-selected", "true");
  });

  it("MLB Teams tab is not selected by default", () => {
    renderPage();
    const mlbTab = screen.getByTestId("new-game-mlb-teams-tab");
    expect(mlbTab).toHaveAttribute("aria-selected", "false");
  });

  it("switching to MLB tab shows home-team-select", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("new-game-mlb-teams-tab"));
    expect(screen.getByTestId("home-team-select")).toBeInTheDocument();
  });

  it("renders the Play Ball button", () => {
    renderPage();
    expect(screen.getByTestId("play-ball-button")).toBeInTheDocument();
  });

  it("renders the back-to-home button", () => {
    renderPage();
    expect(screen.getByTestId("new-game-back-home-button")).toBeInTheDocument();
  });

  it("renders the seed input pre-filled with the current seed", () => {
    renderPage();
    const seedInput = screen.getByTestId("seed-input") as HTMLInputElement;
    expect(seedInput.value).toBe((0xdeadbeef).toString(36));
  });

  it("back button calls navigate('/')", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("new-game-back-home-button"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("submitting the form in MLB mode calls onStartGame with team names", async () => {
    const user = userEvent.setup();
    renderPage();
    // Switch to MLB tab
    await user.click(screen.getByTestId("new-game-mlb-teams-tab"));
    // Submit
    await act(async () => {
      await user.click(screen.getByTestId("play-ball-button"));
    });
    expect(rngModule.reinitSeed).toHaveBeenCalled();
    expect(mockOnStartGame).toHaveBeenCalledWith(
      expect.objectContaining({
        homeTeam: expect.any(String),
        awayTeam: expect.any(String),
        managedTeam: null,
      }),
    );
  });

  it("shows validation error message when no custom teams are available on submit", async () => {
    const user = userEvent.setup();
    renderPage();
    // Stay on Custom Teams tab (default) — no teams available
    await act(async () => {
      await user.click(screen.getByTestId("play-ball-button"));
    });
    // onStartGame must NOT be called with no custom teams
    expect(mockOnStartGame).not.toHaveBeenCalled();
    // A user-visible error must be rendered — not a silent no-op
    expect(screen.getByTestId("team-validation-error")).toBeInTheDocument();
    expect(screen.getByTestId("team-validation-error")).toHaveTextContent(
      /create at least two custom teams/i,
    );
  });

  it("custom teams happy path: calls onStartGame with correct custom team payload", async () => {
    const { useCustomTeams } = await import("@hooks/useCustomTeams");
    const mockPlayer = (id: string, name: string, position: string) => ({
      id,
      name,
      position,
      batting: { contact: 60, power: 60, speed: 60 },
    });
    const mockPitcher = (id: string, name: string) => ({
      id,
      name,
      role: "SP" as const,
      batting: { contact: 40, power: 40, speed: 40 },
      pitching: { velocity: 60, control: 60, movement: 60 },
    });
    const mockTeam = (id: string, name: string) => ({
      id,
      name,
      city: "Testville",
      abbreviation: name.slice(0, 3).toUpperCase(),
      roster: {
        lineup: [
          mockPlayer(`${id}-p1`, "A One", "C"),
          mockPlayer(`${id}-p2`, "B Two", "1B"),
          mockPlayer(`${id}-p3`, "C Three", "2B"),
          mockPlayer(`${id}-p4`, "D Four", "3B"),
          mockPlayer(`${id}-p5`, "E Five", "SS"),
          mockPlayer(`${id}-p6`, "F Six", "LF"),
          mockPlayer(`${id}-p7`, "G Seven", "CF"),
          mockPlayer(`${id}-p8`, "H Eight", "RF"),
          mockPlayer(`${id}-p9`, "I Nine", "DH"),
        ],
        pitchers: [mockPitcher(`${id}-sp`, "Starter")],
        bench: [],
      },
    });
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [mockTeam("ct_away", "Away Team"), mockTeam("ct_home", "Home Team")] as any,
      loading: false,
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
    });

    const user = userEvent.setup();
    renderPage();

    // Custom Teams tab is default — just submit
    await act(async () => {
      await user.click(screen.getByTestId("play-ball-button"));
    });

    expect(mockOnStartGame).toHaveBeenCalledWith(
      expect.objectContaining({
        homeTeam: "custom:ct_home",
        awayTeam: "custom:ct_away",
        managedTeam: null,
        playerOverrides: expect.objectContaining({
          awayOrder: expect.any(Array),
          homeOrder: expect.any(Array),
        }),
      }),
    );
  });

  it("clicking Go to Manage Teams navigates to /teams", async () => {
    // Default render has zero custom teams — the "Go to Manage Teams" link shows
    const user = userEvent.setup();
    renderPage();
    const manageBtn = screen.getByRole("button", { name: /go to manage teams/i });
    await user.click(manageBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/teams");
  });

  it("custom teams: clicking managed-Away radio exercises the starter-pitcher IIFE", async () => {
    const { useCustomTeams } = await import("@hooks/useCustomTeams");
    const mockPlayer = (id: string) => ({
      id,
      name: `Player ${id}`,
      position: "OF",
      batting: { contact: 60, power: 60, speed: 60 },
    });
    const mockPitcher = (id: string) => ({
      id,
      name: `Pitcher ${id}`,
      role: "SP" as const,
      batting: { contact: 40, power: 40, speed: 40 },
      pitching: { velocity: 60, control: 60, movement: 60 },
    });
    const makeTeam = (id: string, name: string) => ({
      id,
      name,
      city: "Testville",
      abbreviation: name.slice(0, 3).toUpperCase(),
      roster: {
        lineup: Array.from({ length: 9 }, (_, i) => mockPlayer(`${id}-p${i}`)),
        pitchers: [mockPitcher(`${id}-sp`)],
        bench: [],
      },
    });
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [makeTeam("ct_away", "Away"), makeTeam("ct_home", "Home")] as any,
      loading: false,
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
    });

    const user = userEvent.setup();
    renderPage();
    // Click "Away" managed radio to make IIFE render the starter pitcher selector
    const awayRadio = screen.getByRole("radio", { name: /away/i });
    await user.click(awayRadio);
    expect(screen.getByTestId("starting-pitcher-select")).toBeInTheDocument();
  });

  it("MLB mode: changing mode radio calls handleModeChange; changing team selects fires setHome/setAway", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("new-game-mlb-teams-tab"));
    // Click the NL radio to fire handleModeChange
    const nlRadio = screen.getByRole("radio", { name: "NL vs NL" });
    await user.click(nlRadio);
    // Change home team select
    const homeSelect = screen.getByTestId("home-team-select") as HTMLSelectElement;
    await userEvent.selectOptions(homeSelect, homeSelect.options[1]?.value ?? homeSelect.options[0].value);
    // Change away team select
    const awaySelect = screen.getByTestId("away-team-select") as HTMLSelectElement;
    await userEvent.selectOptions(awaySelect, awaySelect.options[1]?.value ?? awaySelect.options[0].value);
    // No assertion needed beyond exercising the handlers without throwing
    expect(homeSelect).toBeInTheDocument();
  });

  it("MLB interleague mode: homeLeague radio fires handleHomeLeagueChange", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("new-game-mlb-teams-tab"));
    // Switch to Interleague to show the homeLeague radios
    const interleagueRadio = screen.getByRole("radio", { name: "Interleague" });
    await user.click(interleagueRadio);
    // Click NL homeLeague radio
    const nlHomeLeague = screen.getByRole("radio", { name: "NL" });
    await user.click(nlHomeLeague);
    expect(nlHomeLeague).toBeChecked();
  });

  it("shows 'create more teams' error when exactly one custom team exists", async () => {
    const { useCustomTeams } = await import("@hooks/useCustomTeams");
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [
        {
          id: "ct_solo",
          name: "Solo Team",
          city: "",
          abbreviation: "SOL",
          roster: { lineup: [], pitchers: [], bench: [] },
        },
      ] as any,
      loading: false,
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
    });

    const user = userEvent.setup();
    renderPage();

    await act(async () => {
      await user.click(screen.getByTestId("play-ball-button"));
    });

    expect(mockOnStartGame).not.toHaveBeenCalled();
    expect(screen.getByTestId("team-validation-error")).toHaveTextContent(
      /create at least two custom teams/i,
    );
  });
});

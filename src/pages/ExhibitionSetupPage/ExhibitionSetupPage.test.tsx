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
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("shows validation error when custom teams are missing on submit", async () => {
    const user = userEvent.setup();
    renderPage();
    // Stay on Custom Teams tab (default) — no teams available
    await act(async () => {
      await user.click(screen.getByTestId("play-ball-button"));
    });
    // onStartGame must NOT be called with no custom teams
    expect(mockOnStartGame).not.toHaveBeenCalled();
  });
});

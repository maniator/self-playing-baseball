import * as React from "react";

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock RxDB getDb so no real DB is needed.
vi.mock("@storage/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    playerGameStats: { find: vi.fn(() => ({ exec: vi.fn().mockResolvedValue([]) })) },
    pitcherGameStats: { find: vi.fn(() => ({ exec: vi.fn().mockResolvedValue([]) })) },
  }),
}));

vi.mock("@hooks/useCustomTeams", () => ({
  useCustomTeams: vi.fn(() => ({ teams: [], loading: false })),
}));

const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router")>();
  return {
    ...mod,
    useNavigate: vi.fn(() => mockNavigate),
  };
});

vi.mock("@storage/gameHistoryStore", () => ({
  GameHistoryStore: {
    getTeamCareerBattingStats: vi.fn().mockResolvedValue([]),
    getTeamCareerPitchingStats: vi.fn().mockResolvedValue([]),
  },
}));

import { useCustomTeams } from "@hooks/useCustomTeams";
import { GameHistoryStore } from "@storage/gameHistoryStore";

import CareerStatsPage from "./index";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/stats"]}>
      <Routes>
        <Route path="/stats" element={<CareerStatsPage />} />
        <Route path="/" element={<div data-testid="home-screen" />} />
        <Route path="/players/:playerKey" element={<div data-testid="player-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CareerStatsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCustomTeams).mockReturnValue({ teams: [], loading: false });
    vi.mocked(GameHistoryStore.getTeamCareerBattingStats).mockResolvedValue([]);
    vi.mocked(GameHistoryStore.getTeamCareerPitchingStats).mockResolvedValue([]);
  });

  it("renders the career stats page", async () => {
    renderPage();
    expect(screen.getByTestId("career-stats-page")).toBeInTheDocument();
  });

  it("shows the Career Stats heading", async () => {
    renderPage();
    expect(screen.getByText(/career stats/i)).toBeInTheDocument();
  });

  it("has batting and pitching tab buttons", async () => {
    renderPage();
    expect(screen.getByTestId("career-stats-batting-tab")).toBeInTheDocument();
    expect(screen.getByTestId("career-stats-pitching-tab")).toBeInTheDocument();
  });

  it("has a team selector", async () => {
    renderPage();
    expect(screen.getByTestId("career-stats-team-select")).toBeInTheDocument();
  });

  it("back button navigates to home", async () => {
    const user = userEvent.setup();
    renderPage();
    const backBtn = screen.getByRole("button", { name: /back/i });
    await user.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("shows empty state when no data for a team", async () => {
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [
        {
          id: "team1",
          name: "Test Team",
          abbreviation: "TT",
          city: "Test City",
          lineup: [],
          bench: [],
          pitchers: [],
          fingerprint: undefined,
          teamSeed: undefined,
        },
      ],
      loading: false,
    });
    vi.mocked(GameHistoryStore.getTeamCareerBattingStats).mockResolvedValue([]);
    vi.mocked(GameHistoryStore.getTeamCareerPitchingStats).mockResolvedValue([]);

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("career-stats-empty")).toBeInTheDocument();
    });
  });

  it("renders batting rows when data is available", async () => {
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [{ id: "team1", name: "Yankees", abbreviation: "NYY", city: "NY", lineup: [], bench: [], pitchers: [] }],
      loading: false,
    });
    vi.mocked(GameHistoryStore.getTeamCareerBattingStats).mockResolvedValue([
      {
        playerKey: "custom:ct_1:p1",
        nameAtGameTime: "John Smith",
        gamesPlayed: 5,
        atBats: 20,
        hits: 7,
        doubles: 2,
        triples: 0,
        homers: 1,
        walks: 3,
        strikeouts: 4,
        rbi: 4,
        singles: 4,
      },
    ]);
    vi.mocked(GameHistoryStore.getTeamCareerPitchingStats).mockResolvedValue([]);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("John Smith")).toBeInTheDocument();
    });
    expect(screen.getByText("5")).toBeInTheDocument(); // games played
  });

  it("switches to pitching tab and renders pitching rows", async () => {
    const user = userEvent.setup();
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [{ id: "team1", name: "Yankees", abbreviation: "NYY", city: "NY", lineup: [], bench: [], pitchers: [] }],
      loading: false,
    });
    vi.mocked(GameHistoryStore.getTeamCareerBattingStats).mockResolvedValue([]);
    vi.mocked(GameHistoryStore.getTeamCareerPitchingStats).mockResolvedValue([
      {
        pitcherKey: "custom:ct_1:p1",
        nameAtGameTime: "Bob Pitcher",
        gamesPlayed: 3,
        outsPitched: 27,
        battersFaced: 35,
        hitsAllowed: 8,
        walksAllowed: 3,
        strikeoutsRecorded: 20,
        homersAllowed: 1,
        runsAllowed: 5,
        earnedRuns: 5,
        saves: 1,
        holds: 0,
        blownSaves: 0,
      },
    ]);

    renderPage();
    const pitchingTab = screen.getByTestId("career-stats-pitching-tab");
    await user.click(pitchingTab);
    await waitFor(() => {
      expect(screen.getByText("Bob Pitcher")).toBeInTheDocument();
    });
    // IP should show 9.0 (27 outs)
    expect(screen.getByText("9.0")).toBeInTheDocument();
  });

  it("populates team selector with custom teams", async () => {
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [
        { id: "team1", name: "Red Sox", abbreviation: "BOS", city: "Boston", lineup: [], bench: [], pitchers: [] },
        { id: "team2", name: "Yankees", abbreviation: "NYY", city: "NY", lineup: [], bench: [], pitchers: [] },
      ],
      loading: false,
    });

    renderPage();
    await waitFor(() => {
      const select = screen.getByTestId("career-stats-team-select");
      expect(select.querySelectorAll("option").length).toBeGreaterThanOrEqual(2);
    });
  });
});

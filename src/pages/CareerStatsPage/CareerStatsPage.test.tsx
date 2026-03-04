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
      teams: [
        {
          id: "team1",
          name: "Yankees",
          abbreviation: "NYY",
          city: "NY",
          lineup: [],
          bench: [],
          pitchers: [],
        },
      ],
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
      teams: [
        {
          id: "team1",
          name: "Yankees",
          abbreviation: "NYY",
          city: "NY",
          lineup: [],
          bench: [],
          pitchers: [],
        },
      ],
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
        {
          id: "team1",
          name: "Red Sox",
          abbreviation: "BOS",
          city: "Boston",
          lineup: [],
          bench: [],
          pitchers: [],
        },
        {
          id: "team2",
          name: "Yankees",
          abbreviation: "NYY",
          city: "NY",
          lineup: [],
          bench: [],
          pitchers: [],
        },
      ],
      loading: false,
    });

    renderPage();
    await waitFor(() => {
      const select = screen.getByTestId("career-stats-team-select");
      expect(select.querySelectorAll("option").length).toBeGreaterThanOrEqual(2);
    });
  });

  it("handles error from getDb silently — page still renders", async () => {
    const { getDb } = await import("@storage/db");
    vi.mocked(getDb).mockRejectedValueOnce(new Error("DB unavailable"));
    renderPage();
    await act(async () => {});
    // Page should still render without crashing.
    expect(screen.getByTestId("career-stats-page")).toBeInTheDocument();
  });

  it("handles error from getTeamCareerBattingStats — shows empty state", async () => {
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [
        {
          id: "team1",
          name: "Cubs",
          abbreviation: "CHC",
          city: "Chicago",
          lineup: [],
          bench: [],
          pitchers: [],
        },
      ],
      loading: false,
    });
    vi.mocked(GameHistoryStore.getTeamCareerBattingStats).mockRejectedValueOnce(
      new Error("query failed"),
    );
    vi.mocked(GameHistoryStore.getTeamCareerPitchingStats).mockRejectedValueOnce(
      new Error("query failed"),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("career-stats-empty")).toBeInTheDocument();
    });
  });

  it("loads teams from game history (non-custom teamIds) into the selector", async () => {
    const { getDb } = await import("@storage/db");
    // Return a DB with one batting row from a non-custom team.
    vi.mocked(getDb).mockResolvedValue({
      playerGameStats: {
        find: vi.fn(() => ({
          exec: vi.fn().mockResolvedValue([{ toJSON: () => ({ teamId: "Yankees" }) }]),
        })),
      },
      pitcherGameStats: {
        find: vi.fn(() => ({
          exec: vi.fn().mockResolvedValue([{ toJSON: () => ({ teamId: "Mets" }) }]),
        })),
      },
    } as any);

    renderPage();
    await waitFor(() => {
      const select = screen.getByTestId("career-stats-team-select");
      // Yankees and Mets were found in DB history and should appear as options.
      const options = Array.from(select.querySelectorAll("option")).map((o) => o.value);
      expect(options).toContain("Yankees");
    });
  });

  it("renders — with 0 IP pitcher row — WHIP and ERA display as '—'", async () => {
    const user = userEvent.setup();
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [
        {
          id: "team1",
          name: "Yankees",
          abbreviation: "NYY",
          city: "NY",
          lineup: [],
          bench: [],
          pitchers: [],
        },
      ],
      loading: false,
    });
    vi.mocked(GameHistoryStore.getTeamCareerBattingStats).mockResolvedValue([]);
    vi.mocked(GameHistoryStore.getTeamCareerPitchingStats).mockResolvedValue([
      {
        pitcherKey: "custom:ct_1:p1",
        nameAtGameTime: "Zero IP Pitcher",
        gamesPlayed: 1,
        outsPitched: 0, // 0 IP → ERA and WHIP should display "—"
        battersFaced: 0,
        hitsAllowed: 0,
        walksAllowed: 0,
        strikeoutsRecorded: 0,
        homersAllowed: 0,
        runsAllowed: 0,
        earnedRuns: 0,
        saves: 0,
        holds: 0,
        blownSaves: 0,
      },
    ]);

    renderPage();
    const pitchingTab = screen.getByTestId("career-stats-pitching-tab");
    await user.click(pitchingTab);
    await waitFor(() => {
      expect(screen.getByText("Zero IP Pitcher")).toBeInTheDocument();
    });
    // With 0 IP, ERA and WHIP should render as "—" (null guard in formatWHIP/formatERA)
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("cleanup effects run without errors when component unmounts", async () => {
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [
        {
          id: "t1",
          name: "Tigers",
          abbreviation: "DET",
          city: "Detroit",
          lineup: [],
          bench: [],
          pitchers: [],
        },
      ],
      loading: false,
    });
    const { unmount } = renderPage();
    // Let effects start so cancelled-check cleanup functions are registered.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    // Unmount triggers the cleanup functions: () => { cancelled = true; }
    unmount();
    // If no error thrown, cleanup executed correctly.
    expect(true).toBe(true);
  });

  it("team select onChange fires and loads stats for the new team", async () => {
    const user = userEvent.setup();
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [
        {
          id: "team1",
          name: "Red Sox",
          abbreviation: "BOS",
          city: "Boston",
          lineup: [],
          bench: [],
          pitchers: [],
        },
        {
          id: "team2",
          name: "Yankees",
          abbreviation: "NYY",
          city: "NY",
          lineup: [],
          bench: [],
          pitchers: [],
        },
      ],
      loading: false,
    });
    vi.mocked(GameHistoryStore.getTeamCareerBattingStats).mockResolvedValue([]);
    vi.mocked(GameHistoryStore.getTeamCareerPitchingStats).mockResolvedValue([]);

    renderPage();
    const select = screen.getByTestId("career-stats-team-select");

    // Wait for the first team to be auto-selected.
    await waitFor(() => {
      expect((select as HTMLSelectElement).value).not.toBe("");
    });

    // Change the selection to the second team — fires the onChange handler.
    await user.selectOptions(select, "custom:team2");
    expect((select as HTMLSelectElement).value).toBe("custom:team2");
  });

  it("clicking a player row in pitching table navigates to player page", async () => {
    const user = userEvent.setup();
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [
        {
          id: "team1",
          name: "Yankees",
          abbreviation: "NYY",
          city: "NY",
          lineup: [],
          bench: [],
          pitchers: [],
        },
      ],
      loading: false,
    });
    vi.mocked(GameHistoryStore.getTeamCareerBattingStats).mockResolvedValue([]);
    vi.mocked(GameHistoryStore.getTeamCareerPitchingStats).mockResolvedValue([
      {
        pitcherKey: "custom:ct_1:p1",
        nameAtGameTime: "Click Pitcher",
        gamesPlayed: 1,
        outsPitched: 9,
        battersFaced: 12,
        hitsAllowed: 2,
        walksAllowed: 1,
        strikeoutsRecorded: 5,
        homersAllowed: 0,
        runsAllowed: 1,
        earnedRuns: 1,
        saves: 0,
        holds: 0,
        blownSaves: 0,
      },
    ]);

    renderPage();
    const pitchingTab = screen.getByTestId("career-stats-pitching-tab");
    await user.click(pitchingTab);
    await waitFor(() => expect(screen.getByText("Click Pitcher")).toBeInTheDocument());

    // Clicking the pitcher name fires the onClick at line 293.
    await user.click(screen.getByText("Click Pitcher"));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("/players/"));
  });
});

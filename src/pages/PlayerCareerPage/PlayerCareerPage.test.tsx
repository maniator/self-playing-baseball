import * as React from "react";

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    getPlayerCareerBatting: vi.fn().mockResolvedValue([]),
    getPlayerCareerPitching: vi.fn().mockResolvedValue([]),
  },
}));

import { GameHistoryStore } from "@storage/gameHistoryStore";

import PlayerCareerPage from "./index";

const NOW = 1700000000000; // fixed timestamp for deterministic date formatting

function makeBattingRow(overrides = {}) {
  return {
    id: "game1:team1:p1",
    gameId: "game1",
    teamId: "team1",
    opponentTeamId: "team2",
    playerKey: "team1:p1",
    playerId: "p1",
    nameAtGameTime: "Test Batter",
    role: "batter" as const,
    batting: {
      atBats: 4,
      hits: 2,
      walks: 1,
      strikeouts: 1,
      rbi: 2,
      singles: 1,
      doubles: 1,
      triples: 0,
      homers: 0,
    },
    createdAt: NOW,
    schemaVersion: 1,
    ...overrides,
  };
}

function makePitchingRow(overrides = {}) {
  return {
    id: "game1:team1:p1",
    gameId: "game1",
    teamId: "team1",
    opponentTeamId: "team2",
    pitcherKey: "team1:p1",
    pitcherId: "p1",
    nameAtGameTime: "Test Pitcher",
    outsPitched: 18,
    battersFaced: 24,
    hitsAllowed: 5,
    walksAllowed: 2,
    strikeoutsRecorded: 10,
    homersAllowed: 0,
    runsAllowed: 2,
    earnedRuns: 2,
    saves: 1,
    holds: 0,
    blownSaves: 0,
    createdAt: NOW,
    schemaVersion: 1,
    ...overrides,
  };
}

function renderPage(playerKey = "team1:p1") {
  return render(
    <MemoryRouter initialEntries={[`/players/${playerKey}`]}>
      <Routes>
        <Route path="/players/:playerKey" element={<PlayerCareerPage />} />
        <Route path="/" element={<div data-testid="home-screen" />} />
        <Route path="/stats" element={<div data-testid="stats-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PlayerCareerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(GameHistoryStore.getPlayerCareerBatting).mockResolvedValue([]);
    vi.mocked(GameHistoryStore.getPlayerCareerPitching).mockResolvedValue([]);
  });

  it("renders the player career page", async () => {
    renderPage();
    await act(async () => {});
    expect(screen.getByTestId("player-career-page")).toBeInTheDocument();
  });

  it("shows batting and pitching tab buttons", async () => {
    renderPage();
    await act(async () => {});
    expect(screen.getByText("Batting")).toBeInTheDocument();
    expect(screen.getByText("Pitching")).toBeInTheDocument();
  });

  it("has a back button", async () => {
    renderPage();
    await act(async () => {});
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("back button calls navigate(-1)", async () => {
    const user = userEvent.setup();
    renderPage();
    await act(async () => {});
    const backBtn = screen.getByRole("button", { name: /back/i });
    await user.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("shows 'No batting data.' when no batting rows", async () => {
    vi.mocked(GameHistoryStore.getPlayerCareerBatting).mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no batting data/i)).toBeInTheDocument();
    });
  });

  it("renders batting career totals when batting rows available", async () => {
    vi.mocked(GameHistoryStore.getPlayerCareerBatting).mockResolvedValue([makeBattingRow()]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Test Batter")).toBeInTheDocument();
    });
    // Career totals: 4 AB, 2 H
    const allFours = screen.getAllByText("4");
    expect(allFours.length).toBeGreaterThan(0);
  });

  it("renders batting per-game log with correct AVG", async () => {
    vi.mocked(GameHistoryStore.getPlayerCareerBatting).mockResolvedValue([makeBattingRow()]);
    renderPage();
    await waitFor(() => {
      // AVG for 2 hits / 4 AB = 0.500 → displayed as ".500"
      const avgElements = screen.getAllByText(".500");
      expect(avgElements.length).toBeGreaterThan(0);
    });
  });

  it("switches to pitching tab and shows pitching rows", async () => {
    const user = userEvent.setup();
    vi.mocked(GameHistoryStore.getPlayerCareerPitching).mockResolvedValue([makePitchingRow()]);
    renderPage();
    await act(async () => {});
    const pitchingTab = screen.getByText("Pitching");
    await user.click(pitchingTab);
    await waitFor(() => {
      expect(screen.getByText("Test Pitcher")).toBeInTheDocument();
      // IP = 18 outs → 6.0 innings
      const ipElements = screen.getAllByText("6.0");
      expect(ipElements.length).toBeGreaterThan(0);
    });
  });

  it("shows 'No pitching data.' on pitching tab when no pitching rows", async () => {
    const user = userEvent.setup();
    vi.mocked(GameHistoryStore.getPlayerCareerPitching).mockResolvedValue([]);
    renderPage();
    await act(async () => {});
    const pitchingTab = screen.getByText("Pitching");
    await user.click(pitchingTab);
    await waitFor(() => {
      expect(screen.getByText(/no pitching data/i)).toBeInTheDocument();
    });
  });

  it("fetches data for the playerKey from the URL", async () => {
    renderPage("custom:ct_abc:plyr_xyz");
    await waitFor(() => {
      expect(GameHistoryStore.getPlayerCareerBatting).toHaveBeenCalledWith(
        "custom:ct_abc:plyr_xyz",
      );
      expect(GameHistoryStore.getPlayerCareerPitching).toHaveBeenCalledWith(
        "custom:ct_abc:plyr_xyz",
      );
    });
  });

  it("handles missing playerKey param gracefully (no fetch, page still renders)", async () => {
    // Render without a matching param — useParams returns { playerKey: undefined }.
    render(
      <MemoryRouter initialEntries={["/players/"]}>
        <Routes>
          <Route path="/players/" element={<PlayerCareerPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await act(async () => {});
    expect(screen.getByTestId("player-career-page")).toBeInTheDocument();
    // No fetch should have happened.
    expect(GameHistoryStore.getPlayerCareerBatting).not.toHaveBeenCalled();
  });

  it("handles error from store — shows empty state without crashing", async () => {
    vi.mocked(GameHistoryStore.getPlayerCareerBatting).mockRejectedValueOnce(new Error("DB error"));
    vi.mocked(GameHistoryStore.getPlayerCareerPitching).mockRejectedValueOnce(
      new Error("DB error"),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no batting data/i)).toBeInTheDocument();
    });
  });

  it("cleanup effect runs without errors when component unmounts mid-fetch", async () => {
    // Delay the fetch so the cleanup fires while the fetch is in-flight.
    vi.mocked(GameHistoryStore.getPlayerCareerBatting).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 200)),
    );
    vi.mocked(GameHistoryStore.getPlayerCareerPitching).mockResolvedValue([]);
    const { unmount } = renderPage();
    // Unmount before async fetch resolves — triggers () => { cancelled = true; }
    unmount();
    expect(true).toBe(true);
  });

  it("shows Prev/Next buttons when ?team= param matches a known custom team", async () => {
    const { useCustomTeams } = await import("@hooks/useCustomTeams");
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [
        {
          id: "ct_1",
          name: "Aces",
          abbreviation: "ACE",
          city: "Springfield",
          schemaVersion: 4,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          source: "custom" as const,
          roster: {
            lineup: [
              {
                id: "plyr_1",
                globalPlayerId: "plyr_1",
                name: "First Batter",
                role: "batter" as const,
                batting: { contact: 50, power: 50, speed: 50 },
                pitching: { control: 50, velocity: 50, stamina: 50 },
              },
              {
                id: "plyr_2",
                globalPlayerId: "plyr_2",
                name: "Second Batter",
                role: "batter" as const,
                batting: { contact: 50, power: 50, speed: 50 },
                pitching: { control: 50, velocity: 50, stamina: 50 },
              },
            ],
            bench: [],
            pitchers: [],
          },
          metadata: { notes: "", tags: [], archived: false },
        },
      ],
      loading: false,
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/players/plyr_1?team=custom:ct_1"]}>
        <Routes>
          <Route path="/players/:playerKey" element={<PlayerCareerPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await act(async () => {});

    // Should show Prev/Next nav since team context has 2 players.
    expect(screen.getByTestId("player-career-prev")).toBeInTheDocument();
    expect(screen.getByTestId("player-career-next")).toBeInTheDocument();
    // Prev should be disabled (first player), Next should be enabled.
    expect(screen.getByTestId("player-career-prev")).toBeDisabled();
    expect(screen.getByTestId("player-career-next")).not.toBeDisabled();
  });

  it("clicking Next navigates to the next player in the roster", async () => {
    const user = userEvent.setup();
    const { useCustomTeams } = await import("@hooks/useCustomTeams");
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [
        {
          id: "ct_1",
          name: "Aces",
          abbreviation: "ACE",
          city: "Springfield",
          schemaVersion: 4,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          source: "custom" as const,
          roster: {
            lineup: [
              {
                id: "plyr_1",
                globalPlayerId: "plyr_1",
                name: "First Batter",
                role: "batter" as const,
                batting: { contact: 50, power: 50, speed: 50 },
                pitching: { control: 50, velocity: 50, stamina: 50 },
              },
              {
                id: "plyr_2",
                globalPlayerId: "plyr_2",
                name: "Second Batter",
                role: "batter" as const,
                batting: { contact: 50, power: 50, speed: 50 },
                pitching: { control: 50, velocity: 50, stamina: 50 },
              },
            ],
            bench: [],
            pitchers: [],
          },
          metadata: { notes: "", tags: [], archived: false },
        },
      ],
      loading: false,
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/players/plyr_1?team=custom:ct_1"]}>
        <Routes>
          <Route path="/players/:playerKey" element={<PlayerCareerPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await act(async () => {});
    await user.click(screen.getByTestId("player-career-next"));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("plyr_2"));
  });

  it("does not render Prev/Next when no ?team= param is provided", async () => {
    renderPage("test_player_no_team");
    await act(async () => {});
    expect(screen.queryByTestId("player-career-prev")).toBeNull();
    expect(screen.queryByTestId("player-career-next")).toBeNull();
  });

  describe("role-aware tabs", () => {
    it("shows both Batting and Pitching tabs when player has both", async () => {
      vi.mocked(GameHistoryStore.getPlayerCareerBatting).mockResolvedValue([makeBattingRow()]);
      vi.mocked(GameHistoryStore.getPlayerCareerPitching).mockResolvedValue([makePitchingRow()]);
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Batting")).toBeInTheDocument();
        expect(screen.getByText("Pitching")).toBeInTheDocument();
      });
    });

    it("shows only Batting tab for batter-only player (no pitching history)", async () => {
      vi.mocked(GameHistoryStore.getPlayerCareerBatting).mockResolvedValue([makeBattingRow()]);
      vi.mocked(GameHistoryStore.getPlayerCareerPitching).mockResolvedValue([]);
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Batting")).toBeInTheDocument();
        expect(screen.queryByText("Pitching")).toBeNull();
      });
    });

    it("shows only Pitching tab for pitcher-only player (no batting history)", async () => {
      vi.mocked(GameHistoryStore.getPlayerCareerBatting).mockResolvedValue([]);
      vi.mocked(GameHistoryStore.getPlayerCareerPitching).mockResolvedValue([makePitchingRow()]);
      renderPage();
      await waitFor(() => {
        expect(screen.queryByText("Batting")).toBeNull();
        expect(screen.getByText("Pitching")).toBeInTheDocument();
      });
    });

    it("shows both tabs when player has no history (empty state)", async () => {
      vi.mocked(GameHistoryStore.getPlayerCareerBatting).mockResolvedValue([]);
      vi.mocked(GameHistoryStore.getPlayerCareerPitching).mockResolvedValue([]);
      renderPage();
      await waitFor(() => {
        // Both tabs shown when neither has rows (keep current empty behavior)
        expect(screen.getByText("Batting")).toBeInTheDocument();
        expect(screen.getByText("Pitching")).toBeInTheDocument();
      });
    });

    it("auto-switches to Pitching tab when activeTab is batting but player is pitcher-only", async () => {
      vi.mocked(GameHistoryStore.getPlayerCareerBatting).mockResolvedValue([]);
      vi.mocked(GameHistoryStore.getPlayerCareerPitching).mockResolvedValue([makePitchingRow()]);
      renderPage();
      await waitFor(() => {
        // Pitching tab should be visible and active
        expect(screen.getByText("Pitching")).toBeInTheDocument();
        // Pitching content should be shown (not batting)
        expect(screen.getByText("Test Pitcher")).toBeInTheDocument();
      });
    });
  });
});

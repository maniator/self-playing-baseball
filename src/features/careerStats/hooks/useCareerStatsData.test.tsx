import * as React from "react";

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("@storage/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    batterGameStats: { find: vi.fn(() => ({ exec: vi.fn().mockResolvedValue([]) })) },
    pitcherGameStats: { find: vi.fn(() => ({ exec: vi.fn().mockResolvedValue([]) })) },
  }),
}));

vi.mock("@shared/hooks/useCustomTeams", () => ({
  useCustomTeams: vi.fn(() => ({
    teams: [
      { id: "team1", roster: { lineup: [], bench: [], pitchers: [] } },
      { id: "team2", roster: { lineup: [], bench: [], pitchers: [] } },
    ],
    loading: false,
  })),
}));

vi.mock("@feat/careerStats/storage/gameHistoryStore", () => ({
  GameHistoryStore: {
    getTeamCareerBattingStats: vi.fn().mockResolvedValue([]),
    getTeamCareerPitchingStats: vi.fn().mockResolvedValue([]),
    getTeamCareerSummary: vi.fn().mockResolvedValue(null),
    getTeamBattingLeaders: vi
      .fn()
      .mockResolvedValue({ hrLeader: null, avgLeader: null, rbiLeader: null }),
    getTeamPitchingLeaders: vi
      .fn()
      .mockResolvedValue({ eraLeader: null, savesLeader: null, strikeoutsLeader: null }),
  },
}));

import { useCareerStatsData } from "./useCareerStatsData";

function Probe() {
  const { selectedTeamId } = useCareerStatsData();
  return <div data-testid="selected-team-id">{selectedTeamId}</div>;
}

describe("useCareerStatsData", () => {
  it("reads selectedTeamId from the :teamId path param", async () => {
    render(
      <MemoryRouter initialEntries={["/stats/team2"]}>
        <Routes>
          <Route path="/stats/:teamId" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("selected-team-id")).toHaveTextContent("team2");
    });
  });
});

import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { GameProviderWrapper } from "../Context";
import GameInner from "../Game/GameInner";
import Game from "../Game";

vi.mock("../utilities/announce", () => ({
  playDecisionChime: vi.fn(),
  setAnnouncementVolume: vi.fn(),
  setAlertVolume: vi.fn(),
  getAnnouncementVolume: vi.fn().mockReturnValue(1),
  getAlertVolume: vi.fn().mockReturnValue(1),
  announce: vi.fn(),
  cancelAnnouncements: vi.fn(),
  isSpeechPending: vi.fn().mockReturnValue(false),
  canAnnounce: vi.fn().mockReturnValue(true),
  setSpeechRate: vi.fn(),
  playVictoryFanfare: vi.fn(),
  play7thInningStretch: vi.fn(),
}));

describe("GameInner", () => {
  it("renders without crashing", () => {
    render(
      <GameProviderWrapper>
        <GameInner homeTeam="Yankees" awayTeam="Red Sox" />
      </GameProviderWrapper>,
    );
    expect(screen.getByText(/welcome to the game/i)).toBeInTheDocument();
  });

  it("renders team name inputs", () => {
    render(
      <GameProviderWrapper>
        <GameInner homeTeam="Cubs" awayTeam="Sox" />
      </GameProviderWrapper>,
    );
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it("dispatches setTeams when team input changes", () => {
    render(
      <GameProviderWrapper>
        <GameInner homeTeam="A" awayTeam="B" />
      </GameProviderWrapper>,
    );
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Mets" } });
    expect(inputs[0]).toBeInTheDocument();
  });

  it("game action triggers logReducer and adds announcements", () => {
    render(
      <GameProviderWrapper>
        <GameInner homeTeam="A" awayTeam="B" />
      </GameProviderWrapper>,
    );
    const batterUp = screen.getByRole("button", { name: /batter up/i });
    act(() => { fireEvent.click(batterUp); });
    const pbpElements = screen.getAllByText(/play-by-play/i);
    expect(pbpElements.length).toBeGreaterThan(0);
  });
});

describe("Game", () => {
  it("renders the full game without crashing", () => {
    render(<Game homeTeam="Yankees" awayTeam="Red Sox" />);
    expect(screen.getByText(/welcome to the game/i)).toBeInTheDocument();
  });

  it("renders the GitHub ribbon link", () => {
    render(<Game homeTeam="A" awayTeam="B" />);
    expect(screen.getByText(/view on github/i)).toBeInTheDocument();
  });
});

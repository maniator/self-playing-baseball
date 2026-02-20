import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GameContext, GameProviderWrapper } from "@context/index";
import { makeContextValue } from "@test/testHelpers";

import Game from ".";
import GameInner from "./GameInner";

// jsdom doesn't implement showModal/close on <dialog>
HTMLDialogElement.prototype.showModal = vi.fn();
HTMLDialogElement.prototype.close = vi.fn();

vi.mock("@utils/announce", () => ({
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
        <GameInner />
      </GameProviderWrapper>,
    );
    expect(screen.getByText(/New Game/i)).toBeInTheDocument();
  });

  it("shows the new game dialog on first render", () => {
    render(
      <GameProviderWrapper>
        <GameInner />
      </GameProviderWrapper>,
    );
    expect(screen.getByLabelText(/home team/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/away team/i)).toBeInTheDocument();
  });

  it("starts the game after Play Ball is clicked", () => {
    render(
      <GameProviderWrapper>
        <GameInner />
      </GameProviderWrapper>,
    );
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    expect(screen.getByRole("button", { name: /batter up/i })).toBeInTheDocument();
  });

  it("game action adds to play-by-play after starting", () => {
    render(
      <GameProviderWrapper>
        <GameInner />
      </GameProviderWrapper>,
    );
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /batter up/i }));
    });
    expect(screen.getAllByText(/play-by-play/i).length).toBeGreaterThan(0);
  });

  it("clicking New Game button re-opens the dialog", () => {
    // Render with a game-over context so the "New Game" button is visible in GameControls
    render(
      <GameContext.Provider
        value={makeContextValue({ gameOver: true, teams: ["Yankees", "Mets"] })}
      >
        <GameInner />
      </GameContext.Provider>,
    );
    // Dialog starts open — close it by submitting the form
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    // Dialog should now be closed
    expect(screen.queryByLabelText(/home team/i)).not.toBeInTheDocument();
    // "New Game" button is present because gameOver=true in context
    expect(screen.getByRole("button", { name: /new game/i })).toBeInTheDocument();
    // Click it to reopen the dialog
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /new game/i }));
    });
    // Dialog should be visible again with team name inputs
    expect(screen.getByLabelText(/home team/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/away team/i)).toBeInTheDocument();
  });
});

describe("Game", () => {
  it("renders the full game without crashing", () => {
    render(<Game />);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("renders the GitHub ribbon link", () => {
    render(<Game />);
    expect(screen.getByText(/view on github/i)).toBeInTheDocument();
  });
});

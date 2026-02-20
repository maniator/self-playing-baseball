import * as React from "react";

import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Strategy } from "@context/index";
import { GameContext, GameProviderWrapper, useGameContext } from "@context/index";
import { makeContextValue, makeState } from "@test/testHelpers";
import * as rngModule from "@utils/rng";
import * as savesModule from "@utils/saves";

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

vi.mock("@utils/saves", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/saves")>();
  return {
    ...actual,
    loadAutoSave: vi.fn().mockReturnValue(null),
    clearAutoSave: vi.fn(),
    restoreSaveRng: vi.fn(),
  };
});

vi.mock("@utils/rng", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/rng")>();
  return { ...actual, getSeed: vi.fn().mockReturnValue(12345) };
});

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

  it("starts the game after Play Ball is clicked (dialog closes)", () => {
    render(
      <GameProviderWrapper>
        <GameInner />
      </GameProviderWrapper>,
    );
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    expect(screen.queryByLabelText(/home team/i)).not.toBeInTheDocument();
  });

  it("game screen is visible after Play Ball is clicked", () => {
    render(
      <GameProviderWrapper>
        <GameInner />
      </GameProviderWrapper>,
    );
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
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

// ─── Auto-save resume ────────────────────────────────────────────────────────

const SEED_NUM = 12345;
const SEED_STR = SEED_NUM.toString(36); // matches what getSeed().toString(36) returns

const makeAutoSaveSlot = () => ({
  id: "autosave",
  name: "Auto-save — Mets vs Yankees · Inning 5",
  createdAt: 1000,
  updatedAt: 2000,
  seed: SEED_STR,
  progress: 25,
  managerActions: [] as string[],
  setup: {
    homeTeam: "Yankees",
    awayTeam: "Mets",
    strategy: "power" as Strategy,
    managedTeam: 1 as 0 | 1,
    managerMode: true,
  },
  state: makeState({ inning: 5, teams: ["Mets", "Yankees"] as [string, string] }),
});

describe("GameInner — auto-save resume", () => {
  beforeEach(() => {
    vi.mocked(savesModule.loadAutoSave).mockReturnValue(null);
    vi.mocked(savesModule.clearAutoSave).mockClear();
    vi.mocked(savesModule.restoreSaveRng).mockClear();
    vi.mocked(rngModule.getSeed).mockReturnValue(SEED_NUM);
  });

  it("shows Resume button when a seed-matched auto-save exists", () => {
    vi.mocked(savesModule.loadAutoSave).mockReturnValue(makeAutoSaveSlot());
    render(
      <GameProviderWrapper>
        <GameInner />
      </GameProviderWrapper>,
    );
    expect(screen.getByRole("button", { name: /resume/i, hidden: true })).toBeInTheDocument();
  });

  it("does NOT show Resume button when no auto-save exists", () => {
    vi.mocked(savesModule.loadAutoSave).mockReturnValue(null);
    render(
      <GameProviderWrapper>
        <GameInner />
      </GameProviderWrapper>,
    );
    expect(screen.queryByRole("button", { name: /resume/i, hidden: true })).not.toBeInTheDocument();
  });

  it("does NOT show Resume button when auto-save seed does not match current seed", () => {
    vi.mocked(savesModule.loadAutoSave).mockReturnValue({
      ...makeAutoSaveSlot(),
      seed: "zzzzz", // mismatch with SEED_STR
    });
    render(
      <GameProviderWrapper>
        <GameInner />
      </GameProviderWrapper>,
    );
    expect(screen.queryByRole("button", { name: /resume/i, hidden: true })).not.toBeInTheDocument();
  });

  it("calls restoreSaveRng when a matched auto-save is present on mount", async () => {
    const slot = makeAutoSaveSlot();
    vi.mocked(savesModule.loadAutoSave).mockReturnValue(slot);
    await act(async () => {
      render(
        <GameProviderWrapper>
          <GameInner />
        </GameProviderWrapper>,
      );
    });
    expect(savesModule.restoreSaveRng).toHaveBeenCalledWith(slot);
  });

  it("calls clearAutoSave when starting a new game", () => {
    render(
      <GameProviderWrapper>
        <GameInner />
      </GameProviderWrapper>,
    );
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    expect(savesModule.clearAutoSave).toHaveBeenCalled();
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

describe("GameProviderWrapper — logReducer", () => {
  it("dispatchLog adds message to log", () => {
    const { result } = renderHook(() => useGameContext(), {
      wrapper: GameProviderWrapper,
    });
    act(() => {
      result.current.dispatchLog({ type: "log", payload: "hello" });
    });
    expect(result.current.log[0]).toBe("hello");
  });
});

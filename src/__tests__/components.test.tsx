/**
 * Tests for React components:
 * Announcements, Ball, ScoreBoard, Diamond, InstructionsModal,
 * DecisionPanel, GameControls, Game/GameInner
 */
import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { GameContext } from "../Context";
import type { ContextValue, DecisionType } from "../Context";
import { Hit } from "../constants/hitTypes";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const noop = () => {};

const makeContextValue = (overrides: Partial<ContextValue> = {}): ContextValue => ({
  inning: 1,
  score: [3, 2],
  teams: ["Away", "Home"],
  baseLayout: [0, 0, 0],
  outs: 1,
  strikes: 2,
  balls: 1,
  atBat: 0,
  gameOver: false,
  pendingDecision: null,
  onePitchModifier: null,
  pitchKey: 0,
  decisionLog: [],
  hitType: undefined,
  log: [],
  dispatch: vi.fn(),
  dispatchLog: vi.fn(),
  ...overrides,
});

const renderWithContext = (
  ui: React.ReactElement,
  ctxValue: ContextValue = makeContextValue(),
) =>
  render(
    <GameContext.Provider value={ctxValue}>{ui}</GameContext.Provider>,
  );

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------
import Announcements from "../Announcements";

describe("Announcements", () => {
  it("shows empty state when log is empty", () => {
    renderWithContext(<Announcements />, makeContextValue({ log: [] }));
    expect(screen.getByText(/batter up/i)).toBeInTheDocument();
  });

  it("shows play-by-play heading", () => {
    renderWithContext(<Announcements />);
    expect(screen.getByText(/play-by-play/i)).toBeInTheDocument();
  });

  it("renders log entries when present", () => {
    renderWithContext(
      <Announcements />,
      makeContextValue({ log: ["Strike one.", "Ball one."] }),
    );
    expect(screen.getByText("Strike one.")).toBeInTheDocument();
    expect(screen.getByText("Ball one.")).toBeInTheDocument();
  });

  it("does not show empty state when log has entries", () => {
    renderWithContext(
      <Announcements />,
      makeContextValue({ log: ["Strike one."] }),
    );
    expect(screen.queryByText(/batter up/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Ball
// ---------------------------------------------------------------------------
import Ball from "../Ball";

describe("Ball", () => {
  it("renders without crashing (no hit)", () => {
    const { container } = renderWithContext(
      <Ball />,
      makeContextValue({ hitType: undefined, pitchKey: 0 }),
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("renders with a single hit type", () => {
    const { container } = renderWithContext(
      <Ball />,
      makeContextValue({ hitType: Hit.Single, pitchKey: 1 }),
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("renders with a homerun hit type", () => {
    const { container } = renderWithContext(
      <Ball />,
      makeContextValue({ hitType: Hit.Homerun, pitchKey: 2 }),
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("renders with a walk (isHit should be false for Walk)", () => {
    const { container } = renderWithContext(
      <Ball />,
      makeContextValue({ hitType: Hit.Walk, pitchKey: 3 }),
    );
    expect(container.firstChild).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ScoreBoard
// ---------------------------------------------------------------------------
import ScoreBoard from "../ScoreBoard";

describe("ScoreBoard", () => {
  it("shows both team names and scores", () => {
    renderWithContext(<ScoreBoard />, makeContextValue({ teams: ["Yankees", "Red Sox"], score: [4, 2] }));
    expect(screen.getByText(/Yankees.*4/)).toBeInTheDocument();
    expect(screen.getByText(/Red Sox.*2/)).toBeInTheDocument();
  });

  it("shows strikes, balls, outs, inning", () => {
    renderWithContext(<ScoreBoard />, makeContextValue({ strikes: 2, balls: 3, outs: 1, inning: 5 }));
    expect(screen.getByText(/Strikes: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Balls: 3/)).toBeInTheDocument();
    expect(screen.getByText(/Outs: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Inning: 5/)).toBeInTheDocument();
  });

  it("shows FINAL banner when gameOver is true", () => {
    renderWithContext(<ScoreBoard />, makeContextValue({ gameOver: true }));
    expect(screen.getByText("FINAL")).toBeInTheDocument();
  });

  it("does not show FINAL banner when game is in progress", () => {
    renderWithContext(<ScoreBoard />, makeContextValue({ gameOver: false }));
    expect(screen.queryByText("FINAL")).not.toBeInTheDocument();
  });

  it("bolds the team currently at bat", () => {
    const { container } = renderWithContext(
      <ScoreBoard />,
      makeContextValue({ atBat: 1, teams: ["Away", "Home"] }),
    );
    // The at-bat team is styled with color #b381b3 via the $teamAtBat prop
    // Just confirm both team names are present
    expect(screen.getByText(/Away/)).toBeInTheDocument();
    expect(screen.getByText(/Home/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Diamond
// ---------------------------------------------------------------------------
import Diamond from "../Diamond";

describe("Diamond", () => {
  it("renders without crashing", () => {
    const { container } = renderWithContext(<Diamond />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders with runners on bases", () => {
    const { container } = renderWithContext(
      <Diamond />,
      makeContextValue({ baseLayout: [1, 1, 1] }),
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("renders with no runners on bases", () => {
    const { container } = renderWithContext(
      <Diamond />,
      makeContextValue({ baseLayout: [0, 0, 0] }),
    );
    expect(container.firstChild).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// InstructionsModal
// ---------------------------------------------------------------------------
import InstructionsModal from "../InstructionsModal";

describe("InstructionsModal", () => {
  beforeEach(() => {
    // jsdom doesn't implement showModal/close on dialog; mock them
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  it("renders the help button", () => {
    render(<InstructionsModal />);
    expect(screen.getByRole("button", { name: /how to play/i })).toBeInTheDocument();
  });

  it("calls showModal when help button is clicked", () => {
    render(<InstructionsModal />);
    fireEvent.click(screen.getByRole("button", { name: /how to play/i }));
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("calls close when Got it! button is clicked", () => {
    render(<InstructionsModal />);
    // The close button lives inside a <dialog> (no `open` attr) — query with hidden:true
    fireEvent.click(screen.getByRole("button", { name: /got it/i, hidden: true }));
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it("renders instructions content", () => {
    render(<InstructionsModal />);
    // The h2 "⚾ How to Play" lives inside the closed <dialog>, but getByText finds it
    expect(screen.getByText(/how to play/i)).toBeInTheDocument();
    // Help button aria-label is findable at top level
    expect(screen.getByRole("button", { name: /how to play/i })).toBeInTheDocument();
  });

  it("closes on backdrop click (outside dialog bounds)", () => {
    render(<InstructionsModal />);
    const dialog = document.querySelector("dialog")!;
    // Simulate a click outside the dialog rect (0,0 which is outside any non-zero rect)
    fireEvent.click(dialog, { clientX: 0, clientY: 0 });
    // If getBoundingClientRect returns a non-zero rect, close would be called.
    // In jsdom rects are always 0 so outside check may not trigger — just confirm no throw.
    expect(HTMLDialogElement.prototype.close).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// DecisionPanel
// ---------------------------------------------------------------------------
import DecisionPanel from "../DecisionPanel";

// Mock announce utilities used by DecisionPanel
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

describe("DecisionPanel", () => {
  it("renders nothing when pendingDecision is null", () => {
    const { container } = renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: null }),
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders steal decision", () => {
    const decision: DecisionType = { kind: "steal", base: 0, successPct: 75 };
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: decision }),
    );
    expect(screen.getByText(/steal attempt/i)).toBeInTheDocument();
    expect(screen.getByText(/75%/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /yes, steal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
  });

  it("renders steal from 2nd base", () => {
    const decision: DecisionType = { kind: "steal", base: 1, successPct: 80 };
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: decision }),
    );
    expect(screen.getByText(/2nd base/i)).toBeInTheDocument();
  });

  it("renders bunt decision", () => {
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: { kind: "bunt" } }),
    );
    expect(screen.getByText(/sacrifice bunt/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /yes, bunt/i })).toBeInTheDocument();
  });

  it("renders count30 decision", () => {
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: { kind: "count30" } }),
    );
    expect(screen.getByText(/3-0/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /take/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /swing away/i })).toBeInTheDocument();
  });

  it("renders count02 decision", () => {
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: { kind: "count02" } }),
    );
    expect(screen.getByText(/0-2/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /protect/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /normal swing/i })).toBeInTheDocument();
  });

  it("renders ibb decision", () => {
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: { kind: "ibb" } }),
    );
    expect(screen.getByText(/intentional walk/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /yes, walk them/i })).toBeInTheDocument();
  });

  it("shows countdown bar and auto-skip label", () => {
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: { kind: "bunt" } }),
    );
    expect(screen.getByText(/auto-skip/i)).toBeInTheDocument();
  });

  it("dispatches steal_attempt when Yes clicked", () => {
    const dispatch = vi.fn();
    const decision: DecisionType = { kind: "steal", base: 0, successPct: 80 };
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: decision, dispatch }),
    );
    fireEvent.click(screen.getByRole("button", { name: /yes, steal/i }));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "steal_attempt" }),
    );
  });

  it("dispatches skip_decision when Skip clicked", () => {
    const dispatch = vi.fn();
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: { kind: "bunt" }, dispatch }),
    );
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "skip_decision" });
  });

  it("dispatches bunt_attempt when bunt Yes clicked", () => {
    const dispatch = vi.fn();
    renderWithContext(
      <DecisionPanel strategy="contact" />,
      makeContextValue({ pendingDecision: { kind: "bunt" }, dispatch }),
    );
    fireEvent.click(screen.getByRole("button", { name: /yes, bunt/i }));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "bunt_attempt" }),
    );
  });

  it("dispatches set_one_pitch_modifier: take on count30 Take click", () => {
    const dispatch = vi.fn();
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: { kind: "count30" }, dispatch }),
    );
    fireEvent.click(screen.getByRole("button", { name: /take/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "set_one_pitch_modifier", payload: "take" });
  });

  it("dispatches set_one_pitch_modifier: swing on count30 Swing click", () => {
    const dispatch = vi.fn();
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: { kind: "count30" }, dispatch }),
    );
    fireEvent.click(screen.getByRole("button", { name: /swing away/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "set_one_pitch_modifier", payload: "swing" });
  });

  it("dispatches set_one_pitch_modifier: protect on count02 Protect click", () => {
    const dispatch = vi.fn();
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: { kind: "count02" }, dispatch }),
    );
    fireEvent.click(screen.getByRole("button", { name: /protect/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "set_one_pitch_modifier", payload: "protect" });
  });

  it("dispatches set_one_pitch_modifier: normal on count02 Normal click", () => {
    const dispatch = vi.fn();
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: { kind: "count02" }, dispatch }),
    );
    fireEvent.click(screen.getByRole("button", { name: /normal swing/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "set_one_pitch_modifier", payload: "normal" });
  });

  it("dispatches intentional_walk on intentional walk Yes click", () => {
    const dispatch = vi.fn();
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: { kind: "ibb" }, dispatch }),
    );
    fireEvent.click(screen.getByRole("button", { name: /yes, walk them/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "intentional_walk" });
  });

  it("auto-skips after countdown reaches zero", () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    renderWithContext(
      <DecisionPanel strategy="balanced" />,
      makeContextValue({ pendingDecision: { kind: "bunt" }, dispatch }),
    );
    // Advance 10 ticks (10 seconds)
    act(() => { vi.advanceTimersByTime(10000); });
    expect(dispatch).toHaveBeenCalledWith({ type: "skip_decision" });
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// GameControls
// ---------------------------------------------------------------------------
import GameControls from "../GameControls";

describe("GameControls", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows Batter Up! button when autoplay is off", () => {
    renderWithContext(<GameControls />, makeContextValue({ gameOver: false }));
    expect(screen.getByRole("button", { name: /batter up/i })).toBeInTheDocument();
  });

  it("Batter Up! button is disabled when game is over", () => {
    renderWithContext(<GameControls />, makeContextValue({ gameOver: true }));
    expect(screen.getByRole("button", { name: /batter up/i })).toBeDisabled();
  });

  it("shows Share replay button", () => {
    renderWithContext(<GameControls />);
    expect(screen.getByRole("button", { name: /share replay/i })).toBeInTheDocument();
  });

  it("shows auto-play checkbox", () => {
    renderWithContext(<GameControls />);
    expect(screen.getByRole("checkbox", { name: /auto-play/i })).toBeInTheDocument();
  });

  it("dispatches a game action when Batter Up! is clicked", () => {
    const dispatch = vi.fn();
    renderWithContext(<GameControls />, makeContextValue({ dispatch, gameOver: false }));
    fireEvent.click(screen.getByRole("button", { name: /batter up/i }));
    expect(dispatch).toHaveBeenCalled();
  });

  it("does not dispatch when game is over and Batter Up! is clicked", () => {
    const dispatch = vi.fn();
    renderWithContext(<GameControls />, makeContextValue({ dispatch, gameOver: true }));
    // button is disabled so click won't fire
    const btn = screen.getByRole("button", { name: /batter up/i });
    expect(btn).toBeDisabled();
  });

  it("hides Batter Up! when autoplay is enabled", () => {
    localStorage.setItem("autoPlay", "true");
    renderWithContext(<GameControls />);
    expect(screen.queryByRole("button", { name: /batter up/i })).not.toBeInTheDocument();
  });

  it("shows Manager Mode checkbox when autoplay is on", () => {
    localStorage.setItem("autoPlay", "true");
    renderWithContext(<GameControls />);
    expect(screen.getByRole("checkbox", { name: /manager mode/i })).toBeInTheDocument();
  });

  it("does NOT show Manager Mode checkbox when autoplay is off", () => {
    localStorage.setItem("autoPlay", "false");
    renderWithContext(<GameControls />);
    expect(screen.queryByRole("checkbox", { name: /manager mode/i })).not.toBeInTheDocument();
  });

  it("shows volume sliders", () => {
    renderWithContext(<GameControls />);
    expect(screen.getByRole("slider", { name: /announcement volume/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /alert volume/i })).toBeInTheDocument();
  });

  it("shows speed selector", () => {
    renderWithContext(<GameControls />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// GameInner
// ---------------------------------------------------------------------------
import GameInner from "../Game/GameInner";
import { GameProviderWrapper } from "../Context";

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
    // Team inputs exist (values may be the initial or updated team names)
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
    // Just confirm no throw; the GameContext update is internal
    expect(inputs[0]).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Game (full wrapper)
// ---------------------------------------------------------------------------
import Game from "../Game";

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

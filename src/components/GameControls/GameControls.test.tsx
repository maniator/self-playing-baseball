import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { GameContext } from "@context/index";
import type { ContextValue } from "@context/index";
import * as rngModule from "@utils/rng";
import { makeContextValue } from "@test/testHelpers";
import GameControls from ".";

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

const renderWithContext = (ui: React.ReactElement, ctx: ContextValue = makeContextValue()) =>
  render(<GameContext.Provider value={ctx}>{ui}</GameContext.Provider>);

describe("GameControls", () => {
  beforeEach(() => { localStorage.clear(); });

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

  it("Batter Up! button is disabled (not clickable) when game is over", () => {
    const dispatch = vi.fn();
    renderWithContext(<GameControls />, makeContextValue({ dispatch, gameOver: true }));
    expect(screen.getByRole("button", { name: /batter up/i })).toBeDisabled();
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

  it("toggling auto-play on reveals Manager Mode checkbox", () => {
    renderWithContext(<GameControls />);
    fireEvent.click(screen.getByRole("checkbox", { name: /auto-play/i }));
    expect(screen.getByRole("checkbox", { name: /manager mode/i })).toBeInTheDocument();
  });

  it("toggling auto-play off turns Manager Mode off and hides its checkbox", () => {
    localStorage.setItem("autoPlay", "true");
    localStorage.setItem("managerMode", "true");
    renderWithContext(<GameControls />);
    fireEvent.click(screen.getByRole("checkbox", { name: /auto-play/i }));
    expect(screen.queryByRole("checkbox", { name: /manager mode/i })).not.toBeInTheDocument();
  });

  it("enabling Manager Mode requests notification permission", () => {
    localStorage.setItem("autoPlay", "true");
    (Notification as any).permission = "default";
    const requestPermission = vi.fn().mockResolvedValue("granted");
    (Notification as any).requestPermission = requestPermission;
    renderWithContext(<GameControls />);
    fireEvent.click(screen.getByRole("checkbox", { name: /manager mode/i }));
    expect(requestPermission).toHaveBeenCalled();
    (Notification as any).permission = "granted";
  });

  it("changing speed select updates the value", () => {
    renderWithContext(<GameControls />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "350" } });
    expect((select as HTMLSelectElement).value).toBe("350");
  });

  it("changing announcement volume slider fires handler", () => {
    renderWithContext(<GameControls />);
    const slider = screen.getByRole("slider", { name: /announcement volume/i });
    fireEvent.change(slider, { target: { value: "0.5" } });
    expect((slider as HTMLInputElement).value).toBe("0.5");
  });

  it("changing alert volume slider fires handler", () => {
    renderWithContext(<GameControls />);
    const slider = screen.getByRole("slider", { name: /alert volume/i });
    fireEvent.change(slider, { target: { value: "0.3" } });
    expect((slider as HTMLInputElement).value).toBe("0.3");
  });

  it("Share replay button copies URL to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, writable: true, configurable: true });
    const dispatchLog = vi.fn();
    renderWithContext(<GameControls />, makeContextValue({ dispatchLog }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /share replay/i })); });
    expect(writeText).toHaveBeenCalled();
  });

  it("renders team and strategy selectors in manager mode", () => {
    localStorage.setItem("autoPlay", "true");
    localStorage.setItem("managerMode", "true");
    renderWithContext(<GameControls />, makeContextValue({ teams: ["Yankees", "Red Sox"] }));
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Yankees")).toBeInTheDocument();
  });

  it("spacebar press triggers a pitch when autoPlay is off", () => {
    const dispatch = vi.fn();
    renderWithContext(<GameControls />, makeContextValue({ dispatch, gameOver: false }));
    act(() => { window.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true })); });
    expect(dispatch).toHaveBeenCalled();
  });

  it("Batter Up! dispatches strike when random produces a strike outcome", () => {
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.3)
      .mockReturnValueOnce(0.7);
    const dispatch = vi.fn();
    renderWithContext(<GameControls />, makeContextValue({ dispatch, gameOver: false, strikes: 0 }));
    fireEvent.click(screen.getByRole("button", { name: /batter up/i }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "strike" }));
    vi.restoreAllMocks();
  });

  it("Batter Up! dispatches foul when random produces a foul outcome", () => {
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.3)
      .mockReturnValueOnce(0.1);
    const dispatch = vi.fn();
    renderWithContext(<GameControls />, makeContextValue({ dispatch, gameOver: false, strikes: 0 }));
    fireEvent.click(screen.getByRole("button", { name: /batter up/i }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "foul" }));
    vi.restoreAllMocks();
  });

  it("Batter Up! dispatches hit when random >= 920", () => {
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.93)
      .mockReturnValueOnce(0.5);
    const dispatch = vi.fn();
    renderWithContext(<GameControls />, makeContextValue({ dispatch, gameOver: false, strikes: 0 }));
    fireEvent.click(screen.getByRole("button", { name: /batter up/i }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "hit" }));
    vi.restoreAllMocks();
  });

  it("Batter Up! dispatches wait when random is in the take range", () => {
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.7)
      .mockReturnValue(0.5);
    const dispatch = vi.fn();
    renderWithContext(<GameControls />, makeContextValue({ dispatch, gameOver: false, strikes: 0 }));
    fireEvent.click(screen.getByRole("button", { name: /batter up/i }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "wait" }));
    vi.restoreAllMocks();
  });

  it("swing modifier: random in take zone still produces a swing", () => {
    vi.spyOn(rngModule, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.7)
      .mockReturnValueOnce(0.7);
    const dispatch = vi.fn();
    renderWithContext(<GameControls />, makeContextValue({ dispatch, gameOver: false, strikes: 0, onePitchModifier: "swing" }));
    fireEvent.click(screen.getByRole("button", { name: /batter up/i }));
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "wait" }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringMatching(/strike|foul/) }));
    vi.restoreAllMocks();
  });
});

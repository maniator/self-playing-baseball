import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContextValue } from "@context/index";
import { GameContext } from "@context/index";
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
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows Batter Up! button when game has not started", () => {
    renderWithContext(<GameControls gameStarted={false} />, makeContextValue({ gameOver: false }));
    expect(screen.getByRole("button", { name: /batter up/i })).toBeInTheDocument();
  });

  it("hides Batter Up! when game has started", () => {
    renderWithContext(<GameControls gameStarted={true} />);
    expect(screen.queryByRole("button", { name: /batter up/i })).not.toBeInTheDocument();
  });

  it("shows Share replay button", () => {
    renderWithContext(<GameControls />);
    expect(screen.getByRole("button", { name: /share replay/i })).toBeInTheDocument();
  });

  it("shows Manager Mode checkbox after game starts (autoplay enabled)", () => {
    renderWithContext(<GameControls gameStarted={false} />);
    fireEvent.click(screen.getByRole("button", { name: /batter up/i }));
    expect(screen.getByRole("checkbox", { name: /manager mode/i })).toBeInTheDocument();
  });

  it("does NOT show Manager Mode checkbox before game starts", () => {
    renderWithContext(<GameControls gameStarted={false} />);
    expect(screen.queryByRole("checkbox", { name: /manager mode/i })).not.toBeInTheDocument();
  });

  it("clicking Batter Up! calls onBatterUp callback", () => {
    const onBatterUp = vi.fn();
    renderWithContext(
      <GameControls gameStarted={false} onBatterUp={onBatterUp} />,
      makeContextValue({ gameOver: false }),
    );
    fireEvent.click(screen.getByRole("button", { name: /batter up/i }));
    expect(onBatterUp).toHaveBeenCalled();
  });

  it("Batter Up! button does not dispatch game actions when clicked (starts autoplay instead)", () => {
    const dispatch = vi.fn();
    renderWithContext(
      <GameControls gameStarted={false} />,
      makeContextValue({ dispatch, gameOver: false }),
    );
    fireEvent.click(screen.getByRole("button", { name: /batter up/i }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("hides Batter Up! when game has started (gameStarted prop)", () => {
    renderWithContext(<GameControls gameStarted={true} />);
    expect(screen.queryByRole("button", { name: /batter up/i })).not.toBeInTheDocument();
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

  it("enabling Manager Mode requests notification permission", () => {
    (Notification as any).permission = "default";
    const requestPermission = vi.fn().mockResolvedValue("granted");
    (Notification as any).requestPermission = requestPermission;
    renderWithContext(<GameControls gameStarted={false} />);
    fireEvent.click(screen.getByRole("button", { name: /batter up/i }));
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
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    const dispatchLog = vi.fn();
    renderWithContext(<GameControls />, makeContextValue({ dispatchLog }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /share replay/i }));
    });
    expect(writeText).toHaveBeenCalled();
  });

  it("renders team and strategy selectors in manager mode", () => {
    localStorage.setItem("managerMode", "true");
    renderWithContext(
      <GameControls gameStarted={false} />,
      makeContextValue({ teams: ["Yankees", "Red Sox"] }),
    );
    fireEvent.click(screen.getByRole("button", { name: /batter up/i }));
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Yankees")).toBeInTheDocument();
  });

  it("spacebar does NOT trigger a pitch when game has not started", () => {
    const dispatch = vi.fn();
    renderWithContext(
      <GameControls gameStarted={false} />,
      makeContextValue({ dispatch, gameOver: false }),
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true }));
    });
    expect(dispatch).not.toHaveBeenCalled();
  });
});

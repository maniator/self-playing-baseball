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

vi.mock("@hooks/useSaveStore", () => ({
  useSaveStore: vi.fn(() => ({
    saves: [],
    createSave: vi.fn().mockResolvedValue("save_1"),
    appendEvents: vi.fn().mockResolvedValue(undefined),
    updateProgress: vi.fn().mockResolvedValue(undefined),
    deleteSave: vi.fn().mockResolvedValue(undefined),
    exportRxdbSave: vi.fn().mockResolvedValue("{}"),
    importRxdbSave: vi.fn().mockResolvedValue(undefined),
  })),
}));

const renderWithContext = (ui: React.ReactElement, ctx: ContextValue = makeContextValue()) =>
  render(<GameContext.Provider value={ctx}>{ui}</GameContext.Provider>);

describe("GameControls", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does NOT show Batter Up button (removed in favor of Play ball dialog)", () => {
    renderWithContext(<GameControls />, makeContextValue({ gameOver: false }));
    expect(screen.queryByRole("button", { name: /batter up/i })).not.toBeInTheDocument();
  });

  it("shows Share seed button", () => {
    renderWithContext(<GameControls />);
    expect(screen.getByRole("button", { name: /share seed/i })).toBeInTheDocument();
  });

  it("shows Manager Mode checkbox when gameStarted=true", () => {
    renderWithContext(<GameControls gameStarted />, makeContextValue());
    expect(screen.getByRole("checkbox", { name: /manager mode/i })).toBeInTheDocument();
  });

  it("does NOT show Manager Mode checkbox when gameStarted=false", () => {
    renderWithContext(<GameControls gameStarted={false} />);
    expect(screen.queryByRole("checkbox", { name: /manager mode/i })).not.toBeInTheDocument();
  });

  it("shows volume sliders", () => {
    renderWithContext(<GameControls />);
    expect(screen.getByRole("slider", { name: /announcement volume/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /music volume/i })).toBeInTheDocument();
  });

  it("shows speed selector", () => {
    renderWithContext(<GameControls />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("enabling Manager Mode requests notification permission", () => {
    (Notification as any).permission = "default";
    const requestPermission = vi.fn().mockResolvedValue("granted");
    (Notification as any).requestPermission = requestPermission;
    renderWithContext(<GameControls gameStarted />, makeContextValue());
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

  it("changing music volume slider fires handler", () => {
    renderWithContext(<GameControls />);
    const slider = screen.getByRole("slider", { name: /music volume/i });
    fireEvent.change(slider, { target: { value: "0.3" } });
    expect((slider as HTMLInputElement).value).toBe("0.3");
  });

  it("Share seed button copies URL to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    const dispatchLog = vi.fn();
    renderWithContext(<GameControls />, makeContextValue({ dispatchLog }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /share seed/i }));
    });
    expect(writeText).toHaveBeenCalled();
  });

  it("renders team and strategy selectors in manager mode", () => {
    localStorage.setItem("managerMode", "true");
    renderWithContext(
      <GameControls gameStarted />,
      makeContextValue({ teams: ["Yankees", "Red Sox"] }),
    );
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Yankees")).toBeInTheDocument();
  });
});

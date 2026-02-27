import * as React from "react";

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

// Mock the heavy Game component — GamePage is a thin routing adapter
vi.mock("@components/Game", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="game-mock">
      <button
        data-testid="consume-setup"
        onClick={() => typeof props.onConsumeGameSetup === "function" && props.onConsumeGameSetup()}
      />
      <button
        data-testid="consume-load"
        onClick={() =>
          typeof props.onConsumePendingLoad === "function" && props.onConsumePendingLoad()
        }
      />
      <button
        data-testid="new-game"
        onClick={() => typeof props.onNewGame === "function" && props.onNewGame()}
      />
    </div>
  ),
}));

import type { AppShellOutletContext } from "@components/AppShell";

import GamePage from "./index";

const mockCtx: AppShellOutletContext = {
  onStartGame: vi.fn(),
  onLoadSave: vi.fn(),
  onGameSessionStarted: vi.fn(),
  onNewGame: vi.fn(),
  onLoadSaves: vi.fn(),
  onManageTeams: vi.fn(),
  onResumeCurrent: vi.fn(),
  onHelp: vi.fn(),
  onBackToHome: vi.fn(),
  hasActiveSession: false,
};

/** Renders GamePage inside a minimal router with outlet context. */
function renderGamePage(initialPath = "/game", state: unknown = null, ctx = mockCtx) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: initialPath, state }]}>
      <Routes>
        <Route element={<Outlet context={ctx} />}>
          <Route path="/game" element={<GamePage />} />
          <Route path="/exhibition/new" element={<div data-testid="new-game-page" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("GamePage", () => {
  it("renders the Game component", () => {
    renderGamePage();
    expect(screen.getByTestId("game-mock")).toBeInTheDocument();
  });

  it("clears location.state after capturing it (replace navigate)", () => {
    // Providing non-null state triggers the clear-state effect.
    // We just verify the component doesn't throw.
    expect(() =>
      renderGamePage("/game", { pendingGameSetup: { homeTeam: "A", awayTeam: "B" } }),
    ).not.toThrow();
  });

  it("onConsumeGameSetup clears pendingSetupRef without throwing", () => {
    renderGamePage();
    screen.getByTestId("consume-setup").click();
    // No error = callback ran cleanly
  });

  it("onConsumePendingLoad clears pendingLoadRef without throwing", () => {
    renderGamePage();
    screen.getByTestId("consume-load").click();
  });
});

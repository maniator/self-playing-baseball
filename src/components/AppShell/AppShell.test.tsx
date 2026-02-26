import * as React from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock heavy child components so AppShell tests stay fast and isolated.
vi.mock("@components/Game", () => ({
  default: (props: {
    onBackToHome?: () => void;
    onGameSessionStarted?: () => void;
    isOnGameRoute?: boolean;
  }) => (
    <div data-testid="game-mock">
      Game
      {props.onBackToHome && (
        <button onClick={props.onBackToHome} data-testid="back-to-home-mock">
          Back to Home
        </button>
      )}
      {props.onGameSessionStarted && (
        <button onClick={props.onGameSessionStarted} data-testid="game-session-started-mock">
          Session Started
        </button>
      )}
      <span data-testid="game-route-active">{String(props.isOnGameRoute ?? true)}</span>
    </div>
  ),
}));
vi.mock("@components/HomeScreen", () => ({
  default: (props: {
    onNewGame: () => void;
    onLoadSaves: () => void;
    onManageTeams: () => void;
    onResumeCurrent?: () => void;
  }) => (
    <div data-testid="home-screen-mock">
      <button onClick={props.onNewGame}>New Game</button>
      <button onClick={props.onLoadSaves}>Load Saved Game</button>
      <button onClick={props.onManageTeams}>Manage Teams</button>
      {props.onResumeCurrent && (
        <button onClick={props.onResumeCurrent} data-testid="resume-current-mock">
          Resume
        </button>
      )}
    </div>
  ),
}));
vi.mock("@components/ManageTeamsScreen", () => ({
  default: (props: { onBack: () => void }) => (
    <div data-testid="manage-teams-screen-mock">
      <button onClick={props.onBack}>Back</button>
    </div>
  ),
}));

import AppShell from "./index";

/** Renders AppShell inside MemoryRouter at the given initial path. */
function renderAppShell(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Home screen by default", () => {
    renderAppShell("/");
    expect(screen.getByTestId("home-screen-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("manage-teams-screen-mock")).not.toBeInTheDocument();
  });

  it("clicking New Game navigates away from home", async () => {
    const user = userEvent.setup();
    renderAppShell("/");
    await user.click(screen.getByRole("button", { name: /new game/i }));
    // Home screen disappears; Game is not yet mounted since we're on /exhibition/new
    expect(screen.queryByTestId("home-screen-mock")).not.toBeInTheDocument();
  });

  it("clicking Load Saved Game navigates to /saves (not /game)", async () => {
    const user = userEvent.setup();
    renderAppShell("/");
    await user.click(screen.getByRole("button", { name: /load saved game/i }));
    // Game must NOT be mounted (saves page, not game)
    expect(screen.queryByTestId("game-mock")).not.toBeInTheDocument();
    // Home screen disappears
    expect(screen.queryByTestId("home-screen-mock")).not.toBeInTheDocument();
  });

  it("clicking Manage Teams transitions to the Manage Teams screen", async () => {
    const user = userEvent.setup();
    renderAppShell("/");
    await user.click(screen.getByRole("button", { name: /manage teams/i }));
    expect(screen.getByTestId("manage-teams-screen-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("home-screen-mock")).not.toBeInTheDocument();
  });

  it("/teams/new path shows the Manage Teams screen", () => {
    renderAppShell("/teams/new");
    expect(screen.getByTestId("manage-teams-screen-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("home-screen-mock")).not.toBeInTheDocument();
  });

  it("/teams/:id/edit path shows the Manage Teams screen", () => {
    renderAppShell("/teams/some-team-id/edit");
    expect(screen.getByTestId("manage-teams-screen-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("home-screen-mock")).not.toBeInTheDocument();
  });

  it("Game component is mounted when navigating directly to /game", () => {
    renderAppShell("/game");
    expect(screen.getByTestId("game-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("home-screen-mock")).not.toBeInTheDocument();
  });

  it("Game component receives an onBackToHome callback", () => {
    renderAppShell("/game");
    expect(screen.getByTestId("back-to-home-mock")).toBeInTheDocument();
  });

  it("onBackToHome from Game routes back to the Home screen", async () => {
    const user = userEvent.setup();
    renderAppShell("/game");
    await user.click(screen.getByTestId("back-to-home-mock"));
    expect(screen.getByTestId("home-screen-mock")).toBeInTheDocument();
    // Game stays mounted (CSS-hidden) so Resume is possible — it is not removed from DOM.
    expect(screen.getByTestId("game-mock")).toBeInTheDocument();
  });

  it("Resume button does NOT appear after entering game screen without starting a session", async () => {
    const user = userEvent.setup();
    renderAppShell("/game");
    await user.click(screen.getByTestId("back-to-home-mock"));
    // Back to home — but no game session was actually started
    expect(screen.queryByTestId("resume-current-mock")).not.toBeInTheDocument();
  });

  it("Resume button appears after onGameSessionStarted fires", async () => {
    const user = userEvent.setup();
    renderAppShell("/game");
    // Simulate Game reporting a real game started
    await user.click(screen.getByTestId("game-session-started-mock"));
    await user.click(screen.getByTestId("back-to-home-mock"));
    expect(screen.getByTestId("resume-current-mock")).toBeInTheDocument();
  });

  it("clicking Resume navigates back to game screen", async () => {
    const user = userEvent.setup();
    renderAppShell("/game");
    await user.click(screen.getByTestId("game-session-started-mock"));
    await user.click(screen.getByTestId("back-to-home-mock"));
    await user.click(screen.getByTestId("resume-current-mock"));
    expect(screen.getByTestId("game-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("home-screen-mock")).not.toBeInTheDocument();
  });

  describe("isOnGameRoute prop", () => {
    it("Game receives isOnGameRoute=true when on /game path", () => {
      renderAppShell("/game");
      expect(screen.getByTestId("game-route-active")).toHaveTextContent("true");
    });

    it("Game receives isOnGameRoute=false when navigated away from /game", async () => {
      const user = userEvent.setup();
      renderAppShell("/game");
      await user.click(screen.getByTestId("back-to-home-mock"));
      // Game is still mounted (display:none) but isOnGameRoute should be false
      expect(screen.getByTestId("game-route-active")).toHaveTextContent("false");
    });
  });
});

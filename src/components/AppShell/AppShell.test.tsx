import * as React from "react";

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock heavy child components so AppShell tests stay fast and isolated.
vi.mock("@components/Game", () => ({
  default: (props: { onBackToHome?: () => void; onGameSessionStarted?: () => void }) => (
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

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Home screen by default", () => {
    render(<AppShell />);
    expect(screen.getByTestId("home-screen-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("game-mock")).not.toBeInTheDocument();
    expect(screen.queryByTestId("manage-teams-screen-mock")).not.toBeInTheDocument();
  });

  it("clicking New Game transitions to the game screen", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole("button", { name: /new game/i }));
    expect(screen.getByTestId("game-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("home-screen-mock")).not.toBeInTheDocument();
  });

  it("clicking Load Saved Game transitions to the game screen", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole("button", { name: /load saved game/i }));
    expect(screen.getByTestId("game-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("home-screen-mock")).not.toBeInTheDocument();
  });

  it("clicking Manage Teams transitions to the Manage Teams screen", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole("button", { name: /manage teams/i }));
    expect(screen.getByTestId("manage-teams-screen-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("home-screen-mock")).not.toBeInTheDocument();
  });

  it("Game component receives an onBackToHome callback", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole("button", { name: /new game/i }));
    expect(screen.getByTestId("back-to-home-mock")).toBeInTheDocument();
  });

  it("onBackToHome from Game routes back to the Home screen", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole("button", { name: /new game/i }));
    await user.click(screen.getByTestId("back-to-home-mock"));
    expect(screen.getByTestId("home-screen-mock")).toBeInTheDocument();
    // Game stays mounted (CSS-hidden) so Resume is possible — it is not removed from DOM.
    expect(screen.getByTestId("game-mock")).toBeInTheDocument();
  });

  it("Resume button does NOT appear after entering game screen without starting a session", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole("button", { name: /new game/i }));
    await user.click(screen.getByTestId("back-to-home-mock"));
    // Back to home — but no game session was actually started
    expect(screen.queryByTestId("resume-current-mock")).not.toBeInTheDocument();
  });

  it("Resume button appears after onGameSessionStarted fires", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole("button", { name: /new game/i }));
    // Simulate Game reporting a real game started
    await user.click(screen.getByTestId("game-session-started-mock"));
    await user.click(screen.getByTestId("back-to-home-mock"));
    expect(screen.getByTestId("resume-current-mock")).toBeInTheDocument();
  });

  it("clicking Resume navigates back to game screen", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole("button", { name: /new game/i }));
    await user.click(screen.getByTestId("game-session-started-mock"));
    await user.click(screen.getByTestId("back-to-home-mock"));
    await user.click(screen.getByTestId("resume-current-mock"));
    expect(screen.getByTestId("game-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("home-screen-mock")).not.toBeInTheDocument();
  });

  describe("Browser History API (pushState / popstate)", () => {
    it("calls replaceState with home screen on initial mount", () => {
      const replaceState = vi.spyOn(window.history, "replaceState");
      render(<AppShell />);
      expect(replaceState).toHaveBeenCalledWith(expect.objectContaining({ screen: "home" }), "");
    });

    it("pushes a game history entry when New Game is clicked", async () => {
      const pushState = vi.spyOn(window.history, "pushState");
      const user = userEvent.setup();
      render(<AppShell />);
      await user.click(screen.getByRole("button", { name: /new game/i }));
      expect(pushState).toHaveBeenCalledWith(expect.objectContaining({ screen: "game" }), "");
    });

    it("pushes a game history entry when Load Saved Game is clicked", async () => {
      const pushState = vi.spyOn(window.history, "pushState");
      const user = userEvent.setup();
      render(<AppShell />);
      await user.click(screen.getByRole("button", { name: /load saved game/i }));
      expect(pushState).toHaveBeenCalledWith(expect.objectContaining({ screen: "game" }), "");
    });

    it("pushes a manage-teams history entry when Manage Teams is clicked", async () => {
      const pushState = vi.spyOn(window.history, "pushState");
      const user = userEvent.setup();
      render(<AppShell />);
      await user.click(screen.getByRole("button", { name: /manage teams/i }));
      expect(pushState).toHaveBeenCalledWith(
        expect.objectContaining({ screen: "manage-teams" }),
        "",
      );
    });

    it("pushes a home history entry when Back to Home is triggered from game", async () => {
      const pushState = vi.spyOn(window.history, "pushState");
      const user = userEvent.setup();
      render(<AppShell />);
      await user.click(screen.getByRole("button", { name: /new game/i }));
      pushState.mockClear();
      await user.click(screen.getByTestId("back-to-home-mock"));
      expect(pushState).toHaveBeenCalledWith(expect.objectContaining({ screen: "home" }), "");
    });

    it("popstate with { screen: 'home' } restores the home screen", async () => {
      const user = userEvent.setup();
      render(<AppShell />);
      // Navigate to game first
      await user.click(screen.getByRole("button", { name: /new game/i }));
      expect(screen.queryByTestId("home-screen-mock")).not.toBeInTheDocument();

      // Simulate browser Back via popstate
      act(() => {
        window.dispatchEvent(new PopStateEvent("popstate", { state: { screen: "home" } }));
      });
      expect(screen.getByTestId("home-screen-mock")).toBeInTheDocument();
    });

    it("popstate with { screen: 'game' } restores game screen without new game request", async () => {
      const user = userEvent.setup();
      render(<AppShell />);
      await user.click(screen.getByRole("button", { name: /new game/i }));
      // Go back to home via popstate
      act(() => {
        window.dispatchEvent(new PopStateEvent("popstate", { state: { screen: "home" } }));
      });
      expect(screen.getByTestId("home-screen-mock")).toBeInTheDocument();

      // Simulate browser Forward — game screen restored without new session
      act(() => {
        window.dispatchEvent(new PopStateEvent("popstate", { state: { screen: "game" } }));
      });
      expect(screen.queryByTestId("home-screen-mock")).not.toBeInTheDocument();
      expect(screen.getByTestId("game-mock")).toBeInTheDocument();
    });

    it("popstate with unknown state is ignored", async () => {
      const user = userEvent.setup();
      render(<AppShell />);
      await user.click(screen.getByRole("button", { name: /new game/i }));
      // Fire a popstate with no state — should not throw or change screen
      expect(() => {
        act(() => {
          window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
        });
      }).not.toThrow();
    });
  });
});

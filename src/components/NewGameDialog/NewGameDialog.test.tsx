import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AL_FALLBACK, NL_FALLBACK } from "@utils/mlbTeams";
import * as mlbTeamsModule from "@utils/mlbTeams";

vi.mock("@utils/mlbTeams", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@utils/mlbTeams")>();
  return {
    ...mod,
    fetchMlbTeams: vi.fn().mockResolvedValue({ al: mod.AL_FALLBACK, nl: mod.NL_FALLBACK }),
  };
});

import { DEFAULT_AL_TEAM, DEFAULT_NL_TEAM } from "./constants";
import NewGameDialog from "./index";

HTMLDialogElement.prototype.showModal = vi.fn();
HTMLDialogElement.prototype.close = vi.fn();

const noop = vi.fn();

describe("NewGameDialog", () => {
  it("calls showModal on mount", () => {
    render(<NewGameDialog onStart={noop} />);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("defaults to Interleague matchup mode", () => {
    render(<NewGameDialog onStart={noop} />);
    const radio = screen.getByLabelText(/interleague/i) as HTMLInputElement;
    expect(radio.checked).toBe(true);
  });

  it("defaults to New York Yankees (home) vs New York Mets (away) in Interleague", () => {
    render(<NewGameDialog onStart={noop} />);
    expect((screen.getByLabelText(/home team/i) as HTMLSelectElement).value).toBe(DEFAULT_AL_TEAM);
    expect((screen.getByLabelText(/away team/i) as HTMLSelectElement).value).toBe(DEFAULT_NL_TEAM);
  });

  it("calls onStart with selected teams and null managedTeam when None selected", () => {
    const onStart = vi.fn();
    render(<NewGameDialog onStart={onStart} />);
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    expect(onStart).toHaveBeenCalledWith(DEFAULT_AL_TEAM, DEFAULT_NL_TEAM, null);
  });

  it("calls onStart with managedTeam=0 when Away is selected", () => {
    const onStart = vi.fn();
    render(<NewGameDialog onStart={onStart} />);
    fireEvent.click(screen.getByLabelText(new RegExp(`away \\(${DEFAULT_NL_TEAM}\\)`, "i")));
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    expect(onStart).toHaveBeenCalledWith(DEFAULT_AL_TEAM, DEFAULT_NL_TEAM, 0);
  });

  it("calls onStart with managedTeam=1 when Home is selected", () => {
    const onStart = vi.fn();
    render(<NewGameDialog onStart={onStart} />);
    fireEvent.click(screen.getByLabelText(new RegExp(`home \\(${DEFAULT_AL_TEAM}\\)`, "i")));
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    expect(onStart).toHaveBeenCalledWith(DEFAULT_AL_TEAM, DEFAULT_NL_TEAM, 1);
  });

  it("prevents dialog from being cancelled via keyboard escape", () => {
    render(<NewGameDialog onStart={noop} />);
    const dialog = screen.getByRole("dialog", { hidden: true });
    const event = new Event("cancel", { cancelable: true });
    act(() => {
      dialog.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it("does NOT show a Resume button when autoSaveName/onResume are not provided", () => {
    render(<NewGameDialog initialHome="A" initialAway="B" onStart={noop} />);
    expect(screen.queryByText(/▶ Resume/)).not.toBeInTheDocument();
  });

  it("shows Resume button when autoSaveName and onResume are provided", () => {
    render(
      <NewGameDialog
        initialHome="A"
        initialAway="B"
        onStart={noop}
        autoSaveName="Auto-save — A vs B · Inning 3"
        onResume={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /resume/i, hidden: true })).toBeInTheDocument();
    expect(screen.getByText(/inning 3/i)).toBeInTheDocument();
  });

  it("calls onResume when the Resume button is clicked", () => {
    const onResume = vi.fn();
    render(
      <NewGameDialog
        initialHome="A"
        initialAway="B"
        onStart={noop}
        autoSaveName="Auto-save — A vs B · Inning 5"
        onResume={onResume}
      />,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /resume/i, hidden: true }));
    });
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("shows the divider when a resume option is present", () => {
    render(
      <NewGameDialog
        initialHome="A"
        initialAway="B"
        onStart={noop}
        autoSaveName="My Save"
        onResume={noop}
      />,
    );
    expect(screen.getByText(/or start a new game/i)).toBeInTheDocument();
  });
});

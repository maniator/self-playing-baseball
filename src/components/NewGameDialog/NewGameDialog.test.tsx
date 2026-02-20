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
    render(<NewGameDialog onStart={noop} />);
    expect(screen.queryByText(/▶ Resume/)).not.toBeInTheDocument();
  });

  it("shows Resume button when autoSaveName and onResume are provided", () => {
    render(
      <NewGameDialog onStart={noop} autoSaveName="Auto-save — A vs B · Inning 3" onResume={noop} />,
    );
    expect(screen.getByRole("button", { name: /resume/i, hidden: true })).toBeInTheDocument();
    expect(screen.getByText(/inning 3/i)).toBeInTheDocument();
  });

  it("calls onResume when the Resume button is clicked", () => {
    const onResume = vi.fn();
    render(
      <NewGameDialog
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
    render(<NewGameDialog onStart={noop} autoSaveName="My Save" onResume={noop} />);
    expect(screen.getByText(/or start a new game/i)).toBeInTheDocument();
  });

  it("switching to AL vs AL mode checks AL vs AL radio", () => {
    render(<NewGameDialog onStart={noop} />);
    act(() => {
      fireEvent.click(screen.getByLabelText(/al vs al/i));
    });
    expect((screen.getByLabelText(/al vs al/i) as HTMLInputElement).checked).toBe(true);
  });

  it("switching to NL vs NL mode checks NL vs NL radio", () => {
    render(<NewGameDialog onStart={noop} />);
    act(() => {
      fireEvent.click(screen.getByLabelText(/nl vs nl/i));
    });
    expect((screen.getByLabelText(/nl vs nl/i) as HTMLInputElement).checked).toBe(true);
  });

  it("switching home league to NL checks NL home league radio", () => {
    render(<NewGameDialog onStart={noop} />);
    act(() => {
      fireEvent.click(screen.getByLabelText(/^nl$/i));
    });
    expect((screen.getByLabelText(/^nl$/i) as HTMLInputElement).checked).toBe(true);
  });

  it("switches to AL-only team lists when AL vs AL mode is selected", () => {
    render(<NewGameDialog onStart={noop} />);
    fireEvent.click(screen.getByLabelText(/al vs al/i));
    const homeSelect = screen.getByLabelText(/home team/i) as HTMLSelectElement;
    const options = Array.from(homeSelect.options).map((o) => o.value);
    expect(options).toContain("New York Yankees");
    expect(options).not.toContain("New York Mets");
  });

  it("switches to NL-only team lists when NL vs NL mode is selected", () => {
    render(<NewGameDialog onStart={noop} />);
    fireEvent.click(screen.getByLabelText(/nl vs nl/i));
    const awaySelect = screen.getByLabelText(/away team/i) as HTMLSelectElement;
    const options = Array.from(awaySelect.options).map((o) => o.value);
    expect(options).toContain("New York Mets");
    expect(options).not.toContain("New York Yankees");
  });

  it("shows NL away options when home team league is AL in Interleague", () => {
    render(<NewGameDialog onStart={noop} />);
    const awaySelect = screen.getByLabelText(/away team/i) as HTMLSelectElement;
    const options = Array.from(awaySelect.options).map((o) => o.value);
    expect(options).toContain("New York Mets");
    expect(options).not.toContain("New York Yankees");
  });

  it("shows AL away options when home team league is NL in Interleague", () => {
    render(<NewGameDialog onStart={noop} />);
    fireEvent.click(screen.getByLabelText(/^nl$/i));
    const awaySelect = screen.getByLabelText(/away team/i) as HTMLSelectElement;
    const options = Array.from(awaySelect.options).map((o) => o.value);
    expect(options).toContain("New York Yankees");
    expect(options).not.toContain("New York Mets");
  });

  it("shows NL home options when home team league is NL in Interleague", () => {
    render(<NewGameDialog onStart={noop} />);
    fireEvent.click(screen.getByLabelText(/^nl$/i));
    const homeSelect = screen.getByLabelText(/home team/i) as HTMLSelectElement;
    const options = Array.from(homeSelect.options).map((o) => o.value);
    expect(options).toContain("New York Mets");
    expect(options).not.toContain("New York Yankees");
  });

  it("excludes home team from away options in AL vs AL mode", () => {
    render(<NewGameDialog onStart={noop} />);
    fireEvent.click(screen.getByLabelText(/al vs al/i));
    const homeSelect = screen.getByLabelText(/home team/i) as HTMLSelectElement;
    const selectedHome = homeSelect.value;
    const awaySelect = screen.getByLabelText(/away team/i) as HTMLSelectElement;
    const awayOptions = Array.from(awaySelect.options).map((o) => o.value);
    expect(awayOptions).not.toContain(selectedHome);
  });

  it("home dropdown has all AL teams in AL vs AL mode", () => {
    render(<NewGameDialog onStart={noop} />);
    fireEvent.click(screen.getByLabelText(/al vs al/i));
    const homeSelect = screen.getByLabelText(/home team/i) as HTMLSelectElement;
    expect(homeSelect.options).toHaveLength(AL_FALLBACK.length);
  });

  it("home dropdown has all NL teams in NL vs NL mode", () => {
    render(<NewGameDialog onStart={noop} />);
    fireEvent.click(screen.getByLabelText(/nl vs nl/i));
    const homeSelect = screen.getByLabelText(/home team/i) as HTMLSelectElement;
    expect(homeSelect.options).toHaveLength(NL_FALLBACK.length);
  });

  it("renders with fallback teams when fetchMlbTeams rejects", () => {
    vi.mocked(mlbTeamsModule.fetchMlbTeams).mockRejectedValueOnce(new Error("network error"));
    render(<NewGameDialog onStart={noop} />);
    const homeSelect = screen.getByLabelText(/home team/i) as HTMLSelectElement;
    const awaySelect = screen.getByLabelText(/away team/i) as HTMLSelectElement;
    expect(Array.from(homeSelect.options).map((o) => o.value)).toContain("New York Yankees");
    expect(Array.from(awaySelect.options).map((o) => o.value)).toContain("New York Mets");
  });
});

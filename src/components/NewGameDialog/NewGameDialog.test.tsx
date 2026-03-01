import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AL_FALLBACK, NL_FALLBACK } from "@utils/mlbTeams";
import * as mlbTeamsModule from "@utils/mlbTeams";
import { generateRoster } from "@utils/roster";

vi.mock("@utils/mlbTeams", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@utils/mlbTeams")>();
  return {
    ...mod,
    fetchMlbTeams: vi.fn().mockResolvedValue({ al: mod.AL_FALLBACK, nl: mod.NL_FALLBACK }),
  };
});

// Mock rng so getSeed pre-fills the seed input and reinitSeed is trackable.
vi.mock("@utils/rng", () => ({
  getSeed: vi.fn(() => 0xdeadbeef),
  reinitSeed: vi.fn((s: string) => (s ? parseInt(s, 36) : 12345)),
}));

vi.mock("@hooks/useCustomTeams", () => ({
  useCustomTeams: vi.fn(() => ({
    teams: [],
    loading: false,
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
  })),
}));

import { DEFAULT_AL_TEAM, DEFAULT_NL_TEAM } from "./constants";
import NewGameDialog, { getSpEligiblePitchers } from "./index";

HTMLDialogElement.prototype.showModal = vi.fn();
HTMLDialogElement.prototype.close = vi.fn();

const noop = vi.fn();

const expectedOverrides = () => ({
  away: {},
  home: {},
  awayOrder: generateRoster(DEFAULT_NL_TEAM).batters.map((b) => b.id),
  homeOrder: generateRoster(DEFAULT_AL_TEAM).batters.map((b) => b.id),
});

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
    expect(onStart).toHaveBeenCalledWith(
      DEFAULT_AL_TEAM,
      DEFAULT_NL_TEAM,
      null,
      expectedOverrides(),
    );
  });

  it("calls onStart with managedTeam=0 when Away is selected", () => {
    const onStart = vi.fn();
    render(<NewGameDialog onStart={onStart} />);
    fireEvent.click(screen.getByLabelText(new RegExp(`away \\(${DEFAULT_NL_TEAM}\\)`, "i")));
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    expect(onStart).toHaveBeenCalledWith(DEFAULT_AL_TEAM, DEFAULT_NL_TEAM, 0, expectedOverrides());
  });

  it("calls onStart with managedTeam=1 when Home is selected", () => {
    const onStart = vi.fn();
    render(<NewGameDialog onStart={onStart} />);
    fireEvent.click(screen.getByLabelText(new RegExp(`home \\(${DEFAULT_AL_TEAM}\\)`, "i")));
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    expect(onStart).toHaveBeenCalledWith(DEFAULT_AL_TEAM, DEFAULT_NL_TEAM, 1, expectedOverrides());
  });

  it("prevents dialog from being canceled via keyboard escape", () => {
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

  it("renders a seed input pre-filled with the current seed (from getSeed)", () => {
    render(<NewGameDialog onStart={noop} />);
    const seedInput = screen.getByLabelText(/^seed$/i) as HTMLInputElement;
    // getSeed mock returns 0xdeadbeef = 3735928559; toString(36) = "1z141z4"
    expect(seedInput).toBeInTheDocument();
    expect(seedInput.value).toBe((0xdeadbeef).toString(36));
  });

  it("allows the user to type a custom seed", () => {
    render(<NewGameDialog onStart={noop} />);
    const seedInput = screen.getByLabelText(/^seed$/i) as HTMLInputElement;
    fireEvent.change(seedInput, { target: { value: "mycustomseed" } });
    expect(seedInput.value).toBe("mycustomseed");
  });

  it("calls reinitSeed with the typed seed when Play Ball is clicked", async () => {
    const { reinitSeed } = await import("@utils/rng");
    const onStart = vi.fn();
    render(<NewGameDialog onStart={onStart} />);
    const seedInput = screen.getByLabelText(/^seed$/i);
    fireEvent.change(seedInput, { target: { value: "myfixedseed" } });
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    expect(reinitSeed).toHaveBeenCalledWith("myfixedseed");
    expect(onStart).toHaveBeenCalled();
  });

  it("renders the seed hint text", () => {
    render(<NewGameDialog onStart={noop} />);
    expect(screen.getByText(/leave blank for a random game/i)).toBeInTheDocument();
  });

  it("does NOT show a Back to Home button when onBackToHome is not provided", () => {
    render(<NewGameDialog onStart={noop} />);
    expect(screen.queryByTestId("new-game-back-home-button")).not.toBeInTheDocument();
  });

  it("shows a Back to Home button when onBackToHome is provided", () => {
    render(<NewGameDialog onStart={noop} onBackToHome={noop} />);
    expect(screen.getByTestId("new-game-back-home-button")).toBeInTheDocument();
  });

  it("calls onBackToHome when the Back to Home button is clicked", () => {
    const onBackToHome = vi.fn();
    render(<NewGameDialog onStart={noop} onBackToHome={onBackToHome} />);
    act(() => {
      fireEvent.click(screen.getByTestId("new-game-back-home-button"));
    });
    expect(onBackToHome).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Custom team self-matchup validation
// ---------------------------------------------------------------------------

describe("NewGameDialog — custom team self-matchup validation", () => {
  const makeCustomTeam = (id: string, name: string) => ({
    id,
    schemaVersion: 1 as const,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    name,
    abbreviation: name.slice(0, 3).toUpperCase(),
    roster: {
      lineup: Array.from({ length: 9 }, (_, i) => ({
        id: `${id}_b${i}`,
        name: `Player ${i + 1}`,
        role: "batter" as const,
        batting: { contact: 60, power: 60, speed: 60 },
        position: ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"][i],
        handedness: "R" as const,
      })),
      bench: [],
      pitchers: [
        {
          id: `${id}_p1`,
          name: "Pitcher One",
          role: "pitcher" as const,
          batting: { contact: 35, power: 35, speed: 35 },
          pitching: { velocity: 60, control: 60, movement: 60 },
          position: "SP",
          handedness: "R" as const,
        },
      ],
    },
  });

  const teamA = makeCustomTeam("ct_aaa", "Alpha");
  const teamB = makeCustomTeam("ct_bbb", "Beta");

  beforeEach(async () => {
    const { useCustomTeams } = await import("@hooks/useCustomTeams");
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [teamA, teamB],
      loading: false,
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn(),
    } as unknown as ReturnType<typeof useCustomTeams>);
  });

  const switchToCustomTab = async () => {
    await act(async () => {
      fireEvent.click(screen.getByTestId("new-game-custom-teams-tab"));
    });
  };

  it("shows a validation error when the same custom team is selected on both sides", async () => {
    await act(async () => {
      render(<NewGameDialog onStart={noop} />);
    });
    await switchToCustomTab();

    // Both selectors default to different teams (teamA away, teamB home).
    // Change home to teamA so both sides have the same team.
    const homeSelect = screen.getByTestId("new-game-custom-home-team-select") as HTMLSelectElement;
    await act(async () => {
      fireEvent.change(homeSelect, { target: { value: teamA.id } });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("play-ball-button"));
    });

    expect(screen.getByTestId("team-validation-error")).toHaveTextContent(/must be different/i);
  });

  it("does not show a self-matchup error when two different custom teams are selected", async () => {
    await act(async () => {
      render(<NewGameDialog onStart={noop} />);
    });
    await switchToCustomTab();
    // Default selects teamA away, teamB home — already different.
    await act(async () => {
      fireEvent.click(screen.getByTestId("play-ball-button"));
    });
    const errEl = screen.queryByTestId("team-validation-error");
    // No self-matchup error
    expect(errEl?.textContent ?? "").not.toMatch(/must be different/i);
  });

  it("clears the self-matchup error once the matchup becomes valid", async () => {
    await act(async () => {
      render(<NewGameDialog onStart={noop} />);
    });
    await switchToCustomTab();

    // Force a self-matchup error first.
    const homeSelect = screen.getByTestId("new-game-custom-home-team-select") as HTMLSelectElement;
    await act(async () => {
      fireEvent.change(homeSelect, { target: { value: teamA.id } });
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("play-ball-button"));
    });
    expect(screen.getByTestId("team-validation-error")).toHaveTextContent(/must be different/i);

    // Now fix the matchup by selecting a different home team.
    await act(async () => {
      fireEvent.change(homeSelect, { target: { value: teamB.id } });
    });
    // Validation error should be cleared when the selection changes.
    expect(screen.queryByTestId("team-validation-error")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// getSpEligiblePitchers — unit tests
// ---------------------------------------------------------------------------

describe("getSpEligiblePitchers", () => {
  it("includes pitchers with no role set (legacy/stock teams)", () => {
    const pitchers = [
      { id: "p1", name: "Pitcher One" },
      { id: "p2", name: "Pitcher Two" },
    ];
    const result = getSpEligiblePitchers(pitchers);
    expect(result).toHaveLength(2);
    expect(result[0].idx).toBe(0);
    expect(result[1].idx).toBe(1);
  });

  it("includes SP-role pitchers", () => {
    const pitchers = [{ id: "p1", name: "Starter", pitchingRole: "SP" as const }];
    const result = getSpEligiblePitchers(pitchers);
    expect(result).toHaveLength(1);
    expect(result[0].idx).toBe(0);
  });

  it("includes SP/RP-role pitchers", () => {
    const pitchers = [{ id: "p1", name: "Two-way", pitchingRole: "SP/RP" as const }];
    const result = getSpEligiblePitchers(pitchers);
    expect(result).toHaveLength(1);
  });

  it("excludes RP-only pitchers", () => {
    const pitchers = [
      { id: "p1", name: "Reliever A", pitchingRole: "RP" as const },
      { id: "p2", name: "Reliever B", pitchingRole: "RP" as const },
    ];
    const result = getSpEligiblePitchers(pitchers);
    expect(result).toHaveLength(0);
  });

  it("when RP is at roster idx 0 and SP is at idx 1, returns only SP with its original idx", () => {
    const pitchers = [
      { id: "p1", name: "Reliever", pitchingRole: "RP" as const },
      { id: "p2", name: "Starter", pitchingRole: "SP" as const },
    ];
    const result = getSpEligiblePitchers(pitchers);
    // RP at index 0 is filtered out — SP at index 1 remains
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p2");
    // Original roster index is preserved — idx is 1, not 0
    expect(result[0].idx).toBe(1);
  });

  it("preserves original roster indices when filtering mixed roles", () => {
    const pitchers = [
      { id: "rp1", name: "Closer", pitchingRole: "RP" as const }, // idx 0 — excluded
      { id: "sp1", name: "Ace", pitchingRole: "SP" as const }, // idx 1 — included
      { id: "rp2", name: "Setup Man", pitchingRole: "RP" as const }, // idx 2 — excluded
      { id: "sw1", name: "Swingman", pitchingRole: "SP/RP" as const }, // idx 3 — included
    ];
    const result = getSpEligiblePitchers(pitchers);
    expect(result).toHaveLength(2);
    expect(result[0].idx).toBe(1);
    expect(result[1].idx).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// SP-eligibility validation when managed team has only RP pitchers
// ---------------------------------------------------------------------------

describe("NewGameDialog — managed custom team SP-eligibility validation", () => {
  const makeTeamWithRpOnly = (id: string, name: string) => ({
    id,
    schemaVersion: 1 as const,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    name,
    abbreviation: name.slice(0, 3).toUpperCase(),
    roster: {
      lineup: Array.from({ length: 9 }, (_, i) => ({
        id: `${id}_b${i}`,
        name: `Player ${i + 1}`,
        role: "batter" as const,
        batting: { contact: 60, power: 60, speed: 60 },
        position: ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"][i],
        handedness: "R" as const,
      })),
      bench: [],
      pitchers: [
        {
          id: `${id}_rp1`,
          name: "Closer",
          role: "pitcher" as const,
          batting: { contact: 35, power: 35, speed: 35 },
          pitching: { velocity: 60, control: 60, movement: 60 },
          position: "RP",
          handedness: "R" as const,
          pitchingRole: "RP" as const,
        },
      ],
    },
  });

  const makeTeamWithSp = (id: string, name: string) => ({
    id,
    schemaVersion: 1 as const,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    name,
    abbreviation: name.slice(0, 3).toUpperCase(),
    roster: {
      lineup: Array.from({ length: 9 }, (_, i) => ({
        id: `${id}_b${i}`,
        name: `Player ${i + 1}`,
        role: "batter" as const,
        batting: { contact: 60, power: 60, speed: 60 },
        position: ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"][i],
        handedness: "R" as const,
      })),
      bench: [],
      pitchers: [
        {
          id: `${id}_sp1`,
          name: "Ace",
          role: "pitcher" as const,
          batting: { contact: 35, power: 35, speed: 35 },
          pitching: { velocity: 60, control: 60, movement: 60 },
          position: "SP",
          handedness: "R" as const,
          pitchingRole: "SP" as const,
        },
      ],
    },
  });

  const rpTeam = makeTeamWithRpOnly("ct_rp", "Bullpen FC");
  const spTeam = makeTeamWithSp("ct_sp", "Starters SC");

  beforeEach(async () => {
    const { useCustomTeams } = await import("@hooks/useCustomTeams");
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [rpTeam, spTeam],
      loading: false,
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn(),
    } as unknown as ReturnType<typeof useCustomTeams>);
  });

  it("blocks game start and shows validation error when managed team has only RP pitchers", async () => {
    const onStart = vi.fn();
    await act(async () => {
      render(<NewGameDialog onStart={onStart} />);
    });
    // Switch to custom tab.
    await act(async () => {
      fireEvent.click(screen.getByTestId("new-game-custom-teams-tab"));
    });
    // Select managed = away (rpTeam is away by default).
    const managedAwayRadio = screen.getByLabelText(/away.*\(bullpen/i);
    await act(async () => {
      fireEvent.click(managedAwayRadio);
    });
    // Attempt to start.
    await act(async () => {
      fireEvent.click(screen.getByTestId("play-ball-button"));
    });
    // Should show an SP-eligibility error and NOT start the game.
    expect(onStart).not.toHaveBeenCalled();
    const errEl = screen.getByTestId("team-validation-error");
    expect(errEl.textContent).toMatch(/no SP-eligible pitchers/i);
  });

  it("allows game start when managed team has an SP pitcher", async () => {
    const onStart = vi.fn();
    await act(async () => {
      render(<NewGameDialog onStart={onStart} />);
    });
    // Switch to custom tab.
    await act(async () => {
      fireEvent.click(screen.getByTestId("new-game-custom-teams-tab"));
    });
    // Default: away=rpTeam (RP-only), home=spTeam (has SP). Manage the home team.
    const managedHomeRadio = screen.getByLabelText(/home.*\(starters/i);
    await act(async () => {
      fireEvent.click(managedHomeRadio);
    });
    // Attempt to start.
    await act(async () => {
      fireEvent.click(screen.getByTestId("play-ball-button"));
    });
    // No SP error — onStart should have been called.
    expect(screen.queryByTestId("team-validation-error")).not.toBeInTheDocument();
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

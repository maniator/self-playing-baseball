import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CustomTeamEditor from "./index";

// ─── JSDOM missing implementations ───────────────────────────────────────────
// scrollIntoView is not implemented in JSDOM.
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@hooks/useCustomTeams", () => ({
  useCustomTeams: vi.fn(() => ({
    teams: [],
    loading: false,
    createTeam: vi.fn().mockResolvedValue("ct_new"),
    updateTeam: vi.fn().mockResolvedValue(undefined),
    deleteTeam: vi.fn(),
  })),
}));

// Mock dnd-kit sensors: PointerSensor requires pointer events not supported in JSDOM.
vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    PointerSensor: class {
      static activators = [];
    },
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const noop = vi.fn();

const renderEditor = (props: Partial<React.ComponentProps<typeof CustomTeamEditor>> = {}) =>
  render(<CustomTeamEditor onSave={noop} onCancel={noop} {...props} />);

describe("CustomTeamEditor — create mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the editor with name input and team info fields", () => {
    renderEditor();
    expect(screen.getByTestId("custom-team-name-input")).toBeTruthy();
    expect(screen.getByTestId("custom-team-abbreviation-input")).toBeTruthy();
    expect(screen.getByTestId("custom-team-city-input")).toBeTruthy();
  });

  it("shows save and cancel buttons", () => {
    renderEditor();
    expect(screen.getByTestId("custom-team-save-button")).toBeTruthy();
    expect(screen.getByTestId("custom-team-cancel-button")).toBeTruthy();
  });

  it("shows regenerate defaults button", () => {
    renderEditor();
    expect(screen.getByTestId("custom-team-regenerate-defaults-button")).toBeTruthy();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    renderEditor({ onCancel });
    fireEvent.click(screen.getByTestId("custom-team-cancel-button"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("shows validation error when save is clicked without required fields", async () => {
    renderEditor();
    await act(async () => {
      fireEvent.click(screen.getByTestId("custom-team-save-button"));
    });
    // Error message should appear (team name is required)
    expect(screen.getByTestId("custom-team-editor-error-summary")).toBeTruthy();
  });

  it("fills team name field and updates state", () => {
    renderEditor();
    const nameInput = screen.getByTestId("custom-team-name-input");
    fireEvent.change(nameInput, { target: { value: "Test Eagles" } });
    expect((nameInput as HTMLInputElement).value).toBe("Test Eagles");
  });

  it("fills abbreviation field and updates state", () => {
    renderEditor();
    const abbrevInput = screen.getByTestId("custom-team-abbreviation-input");
    fireEvent.change(abbrevInput, { target: { value: "EAG" } });
    expect((abbrevInput as HTMLInputElement).value).toBe("EAG");
  });

  it("generate defaults button populates team fields", async () => {
    renderEditor();
    await act(async () => {
      fireEvent.click(screen.getByTestId("custom-team-regenerate-defaults-button"));
    });
    // After generating, name field should be non-empty.
    const nameInput = screen.getByTestId("custom-team-name-input") as HTMLInputElement;
    expect(nameInput.value.length).toBeGreaterThan(0);
  });

  it("add lineup player button adds a player row", async () => {
    renderEditor();
    const addBtn = screen.getByTestId("custom-team-add-lineup-player-button");
    await act(async () => {
      fireEvent.click(addBtn);
    });
    // After adding one player, a player name input should appear.
    const playerNameInputs = screen.getAllByPlaceholderText(/player name/i);
    expect(playerNameInputs.length).toBeGreaterThanOrEqual(1);
  });

  it("calls createTeam and onSave on successful save after generate defaults", async () => {
    const { useCustomTeams } = await import("@hooks/useCustomTeams");
    const mockCreate = vi.fn().mockResolvedValue("ct_created");
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [],
      loading: false,
      createTeam: mockCreate,
      updateTeam: vi.fn(),
      deleteTeam: vi.fn(),
    } as ReturnType<typeof useCustomTeams>);

    const onSave = vi.fn();
    renderEditor({ onSave });

    // Generate defaults to get a valid roster state.
    await act(async () => {
      fireEvent.click(screen.getByTestId("custom-team-regenerate-defaults-button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("custom-team-save-button"));
    });

    expect(mockCreate).toHaveBeenCalled();
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith("ct_created"));
  });

  it("add bench player and interact with PlayerRow handlers", async () => {
    renderEditor();
    // Add a bench player using the bench section add button.
    const addBenchBtn = screen.getByTestId("custom-team-add-bench-player-button");
    await act(async () => {
      fireEvent.click(addBenchBtn);
    });
    // A player name input should appear in the bench section.
    const playerNameInputs = screen.getAllByPlaceholderText(/player name/i);
    expect(playerNameInputs.length).toBeGreaterThanOrEqual(1);

    const nameInput = playerNameInputs[0];

    // Fire the onChange handler (covers the `(e) => onChange({ name: ... })` arrow fn).
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Bench Player" } });
    });
    expect((nameInput as HTMLInputElement).value).toBe("Bench Player");

    // Fire position select change (covers onChange for position).
    const positionSelect = screen.getAllByTestId("custom-team-player-position-select")[0];
    await act(async () => {
      fireEvent.change(positionSelect, { target: { value: "1B" } });
    });

    // Fire handedness select change.
    const handednessSelect = screen.getAllByTestId("custom-team-player-handedness-select")[0];
    await act(async () => {
      fireEvent.change(handednessSelect, { target: { value: "L" } });
    });

    // Fire remove button (covers onRemove).
    const removeBtn = screen.getByRole("button", { name: /remove player/i });
    await act(async () => {
      fireEvent.click(removeBtn);
    });
    // Player should be removed.
    expect(screen.queryAllByPlaceholderText(/player name/i)).toHaveLength(0);
  });

  it("add two bench players and verify they are rendered with drag handles", async () => {
    renderEditor();
    const addBenchBtn = screen.getByTestId("custom-team-add-bench-player-button");

    // Add two bench players.
    await act(async () => {
      fireEvent.click(addBenchBtn);
    });
    await act(async () => {
      fireEvent.click(addBenchBtn);
    });

    // Both players should be rendered.
    expect(screen.getAllByPlaceholderText(/player name/i)).toHaveLength(2);
    // Up/down buttons are gone — replaced by drag handles.
    expect(screen.queryAllByRole("button", { name: /move up/i })).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: /move down/i })).toHaveLength(0);
  });

  it("add pitcher and interact with pitcher-specific stat inputs", async () => {
    renderEditor();
    const addPitcherBtn = screen.getByTestId("custom-team-add-pitcher-button");
    await act(async () => {
      fireEvent.click(addPitcherBtn);
    });

    const playerNameInputs = screen.getAllByPlaceholderText(/player name/i);
    expect(playerNameInputs.length).toBeGreaterThanOrEqual(1);

    // Fire a range input change (covers the stat() helper's onChange handler).
    const rangeInputs = screen.getAllByRole("slider");
    if (rangeInputs.length > 0) {
      await act(async () => {
        fireEvent.change(rangeInputs[0], { target: { value: "75" } });
      });
    }
  });
});

describe("CustomTeamEditor — edit mode", () => {
  const makePlayer = (id: string, name: string, position: string) => ({
    id,
    name,
    role: "batter" as const,
    batting: { contact: 45, power: 45, speed: 45 },
    position,
    handedness: "R" as const,
  });

  const existingTeam = {
    id: "ct_edit",
    schemaVersion: 1 as const,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    name: "Existing Eagles",
    abbreviation: "EXE",
    city: "Austin",
    nickname: "Eagles",
    source: "custom" as const,
    roster: {
      schemaVersion: 1 as const,
      lineup: [
        makePlayer("p1", "Tom Adams", "C"),
        makePlayer("p2", "Jim Baker", "1B"),
        makePlayer("p3", "Bob Clark", "2B"),
        makePlayer("p4", "Dan Davis", "3B"),
        makePlayer("p5", "Sam Evans", "SS"),
        makePlayer("p6", "Pat Frank", "LF"),
        makePlayer("p7", "Ron Grant", "CF"),
        makePlayer("p8", "Lee Hayes", "RF"),
        makePlayer("p9", "Max Jones", "DH"),
      ],
      bench: [],
      pitchers: [],
    },
    metadata: { archived: false },
  };

  it("pre-fills form with existing team data", () => {
    renderEditor({ team: existingTeam });
    const nameInput = screen.getByTestId("custom-team-name-input") as HTMLInputElement;
    expect(nameInput.value).toBe("Existing Eagles");
    const abbrevInput = screen.getByTestId("custom-team-abbreviation-input") as HTMLInputElement;
    expect(abbrevInput.value).toBe("EXE");
  });

  it("calls updateTeam and onSave on successful save in edit mode", async () => {
    const { useCustomTeams } = await import("@hooks/useCustomTeams");
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useCustomTeams).mockReturnValue({
      teams: [],
      loading: false,
      createTeam: vi.fn(),
      updateTeam: mockUpdate,
      deleteTeam: vi.fn(),
    } as ReturnType<typeof useCustomTeams>);

    const onSave = vi.fn();
    renderEditor({ team: existingTeam, onSave });

    await act(async () => {
      fireEvent.click(screen.getByTestId("custom-team-save-button"));
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      "ct_edit",
      expect.objectContaining({ roster: expect.any(Object) }),
    );
    // Identity fields are locked and not passed in the update
    expect(mockUpdate).toHaveBeenCalledWith(
      "ct_edit",
      expect.not.objectContaining({ name: expect.any(String) }),
    );
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith("ct_edit"));
  });
});

describe("CustomTeamEditor — edit mode identity immutability", () => {
  const makePlayer = (id: string, name: string, position: string) => ({
    id,
    name,
    role: "batter" as const,
    batting: { contact: 45, power: 45, speed: 45 },
    position,
    handedness: "R" as const,
  });

  const existingTeam = {
    id: "ct_edit2",
    schemaVersion: 1 as const,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    name: "Lock Eagles",
    abbreviation: "LCK",
    city: "Portland",
    nickname: "Eagles",
    source: "custom" as const,
    roster: {
      schemaVersion: 1 as const,
      lineup: [
        makePlayer("ep1", "Alice Smith", "C"),
        makePlayer("ep2", "Bob Jones", "1B"),
        makePlayer("ep3", "Carol Lee", "2B"),
        makePlayer("ep4", "Dave Kim", "3B"),
        makePlayer("ep5", "Eve Park", "SS"),
        makePlayer("ep6", "Frank Liu", "LF"),
        makePlayer("ep7", "Grace Wang", "CF"),
        makePlayer("ep8", "Hank Chen", "RF"),
        makePlayer("ep9", "Iris Tan", "DH"),
      ],
      bench: [makePlayer("eb1", "Bench Benny", "C")],
      pitchers: [],
    },
    metadata: { archived: false },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("team name is read-only in edit mode", () => {
    renderEditor({ team: existingTeam });
    const nameInput = screen.getByTestId("custom-team-name-input") as HTMLInputElement;
    expect(nameInput.readOnly).toBe(true);
  });

  it("team abbreviation is read-only in edit mode", () => {
    renderEditor({ team: existingTeam });
    const abbrevInput = screen.getByTestId("custom-team-abbreviation-input") as HTMLInputElement;
    expect(abbrevInput.readOnly).toBe(true);
  });

  it("city is read-only in edit mode", () => {
    renderEditor({ team: existingTeam });
    const cityInput = screen.getByTestId("custom-team-city-input") as HTMLInputElement;
    expect(cityInput.readOnly).toBe(true);
  });

  it("existing player names are read-only", () => {
    renderEditor({ team: existingTeam });
    // All player name inputs for existing players should be read-only (no placeholder text)
    const playerNameInputs = screen
      .getAllByRole("textbox")
      .filter(
        (el) => (el as HTMLInputElement).getAttribute("aria-label") === "Player name",
      ) as HTMLInputElement[];
    // All lineup + bench players (ep1..ep9 + eb1) should be read-only
    expect(playerNameInputs.length).toBeGreaterThanOrEqual(1);
    playerNameInputs.forEach((input) => {
      expect(input.readOnly).toBe(true);
    });
  });

  it("new players added to lineup have editable names", async () => {
    renderEditor({ team: existingTeam });
    const addBtn = screen.getByTestId("custom-team-add-lineup-player-button");
    await act(async () => {
      fireEvent.click(addBtn);
    });
    // New player has a placeholder — only the new one will have placeholder text
    const playerNameInputs = screen.getAllByPlaceholderText(/player name/i) as HTMLInputElement[];
    expect(playerNameInputs.length).toBeGreaterThanOrEqual(1);
    // The new player's name input should NOT be read-only
    const lastInput = playerNameInputs[playerNameInputs.length - 1];
    expect(lastInput.readOnly).toBe(false);
  });

  it("new player name in edit mode can be typed and updated", async () => {
    renderEditor({ team: existingTeam });
    const addBtn = screen.getByTestId("custom-team-add-bench-player-button");
    await act(async () => {
      fireEvent.click(addBtn);
    });
    const playerNameInputs = screen.getAllByPlaceholderText(/player name/i) as HTMLInputElement[];
    const newPlayerInput = playerNameInputs[playerNameInputs.length - 1];
    expect(newPlayerInput.readOnly).toBe(false);
    // Typing must update the value (onChange is wired for new players)
    await act(async () => {
      fireEvent.change(newPlayerInput, { target: { value: "Brand New Slugger" } });
    });
    expect(newPlayerInput.value).toBe("Brand New Slugger");
  });

  it("identity lock hint is shown in edit mode", () => {
    renderEditor({ team: existingTeam });
    expect(screen.getByText("Team identity fields are locked after creation.")).toBeTruthy();
  });

  it("create mode: all team identity fields are editable", () => {
    renderEditor();
    const nameInput = screen.getByTestId("custom-team-name-input") as HTMLInputElement;
    expect(nameInput.readOnly).toBe(false);
    const abbrevInput = screen.getByTestId("custom-team-abbreviation-input") as HTMLInputElement;
    expect(abbrevInput.readOnly).toBe(false);
    const cityInput = screen.getByTestId("custom-team-city-input") as HTMLInputElement;
    expect(cityInput.readOnly).toBe(false);
  });
});

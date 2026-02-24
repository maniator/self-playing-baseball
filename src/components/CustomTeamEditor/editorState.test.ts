import { describe, expect, it } from "vitest";

import {
  editorReducer,
  editorStateToCreateInput,
  initEditorState,
  makePlayerId,
  validateEditorState,
} from "./editorState";

const makePlayer = (name = "Tom Adams", position = "C") => ({
  id: makePlayerId(),
  name,
  position,
  handedness: "R" as const,
  contact: 60,
  power: 60,
  speed: 60,
});

const validState = () =>
  initEditorState(undefined) as ReturnType<typeof initEditorState> & {
    name: string;
    lineup: ReturnType<typeof makePlayer>[];
  };

describe("initEditorState", () => {
  it("starts with empty fields for create mode", () => {
    const state = initEditorState();
    expect(state.name).toBe("");
    expect(state.lineup).toHaveLength(0);
    expect(state.error).toBe("");
  });

  it("pre-fills from an existing team doc", () => {
    const team = {
      id: "t1",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      name: "Eagles",
      city: "Austin",
      source: "custom" as const,
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "p1",
            name: "Jake Jones",
            role: "batter" as const,
            batting: { contact: 70, power: 65, speed: 55 },
          },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    };
    const state = initEditorState(team);
    expect(state.name).toBe("Eagles");
    expect(state.city).toBe("Austin");
    expect(state.lineup[0].name).toBe("Jake Jones");
    expect(state.lineup[0].contact).toBe(70);
  });

  it("loads position and handedness from an existing team doc", () => {
    const team = {
      id: "ct_pos",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      name: "Rockets",
      source: "custom" as const,
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "p1",
            name: "Sam Scott",
            role: "batter" as const,
            batting: { contact: 65, power: 60, speed: 70 },
            position: "SS",
            handedness: "L" as const,
          },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    };
    const state = initEditorState(team);
    expect(state.lineup[0].position).toBe("SS");
    expect(state.lineup[0].handedness).toBe("L");
  });

  it("defaults to empty position and R handedness for legacy docs missing those fields", () => {
    const team = {
      id: "ct_legacy",
      schemaVersion: 1,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      name: "Old Team",
      source: "custom" as const,
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "p1",
            name: "Ray Reed",
            role: "batter" as const,
            batting: { contact: 60, power: 60, speed: 60 },
            // no position or handedness
          },
        ],
        bench: [],
        pitchers: [],
      },
      metadata: { archived: false },
    };
    const state = initEditorState(team);
    expect(state.lineup[0].position).toBe("");
    expect(state.lineup[0].handedness).toBe("R");
  });
});

describe("validateEditorState", () => {
  it("requires team name", () => {
    const state = initEditorState();
    expect(validateEditorState(state)).toContain("Team name");
  });

  it("requires abbreviation when name is set", () => {
    const state = { ...initEditorState(), name: "Eagles", abbreviation: "" };
    expect(validateEditorState(state)).toContain("abbreviation");
  });

  it("rejects abbreviation shorter than 2 chars", () => {
    const state = { ...initEditorState(), name: "Eagles", abbreviation: "E" };
    expect(validateEditorState(state)).toContain("2–3");
  });

  it("rejects abbreviation longer than 3 chars", () => {
    const state = { ...initEditorState(), name: "Eagles", abbreviation: "EAGL" };
    expect(validateEditorState(state)).toContain("2–3");
  });

  it("accepts 2-char abbreviation", () => {
    const state = {
      ...initEditorState(),
      name: "Eagles",
      abbreviation: "EA",
      lineup: [
        makePlayer("P1", "C"),
        makePlayer("P2", "1B"),
        makePlayer("P3", "2B"),
        makePlayer("P4", "3B"),
        makePlayer("P5", "SS"),
        makePlayer("P6", "LF"),
        makePlayer("P7", "CF"),
        makePlayer("P8", "RF"),
        makePlayer("P9", "DH"),
      ],
    };
    expect(validateEditorState(state)).toBe("");
  });

  it("requires at least 1 lineup player", () => {
    const state = { ...initEditorState(), name: "Eagles", abbreviation: "EAG" };
    expect(validateEditorState(state)).toContain("lineup");
  });

  it("requires player names", () => {
    const state = {
      ...initEditorState(),
      name: "Eagles",
      abbreviation: "EAG",
      lineup: [{ ...makePlayer(""), contact: 60, power: 60, speed: 60 }],
    };
    expect(validateEditorState(state)).toContain("name");
  });

  it("returns empty string for a valid state with all required positions", () => {
    const state = {
      ...initEditorState(),
      name: "Eagles",
      abbreviation: "EAG",
      lineup: [
        makePlayer("P1", "C"),
        makePlayer("P2", "1B"),
        makePlayer("P3", "2B"),
        makePlayer("P4", "3B"),
        makePlayer("P5", "SS"),
        makePlayer("P6", "LF"),
        makePlayer("P7", "CF"),
        makePlayer("P8", "RF"),
        makePlayer("P9", "DH"),
      ],
    };
    expect(validateEditorState(state)).toBe("");
  });

  it("blocks save when a required field position is missing from lineup and bench", () => {
    const state = {
      ...initEditorState(),
      name: "Eagles",
      abbreviation: "EAG",
      // Has all positions except SS
      lineup: [
        makePlayer("P1", "C"),
        makePlayer("P2", "1B"),
        makePlayer("P3", "2B"),
        makePlayer("P4", "3B"),
        makePlayer("P5", "LF"),
        makePlayer("P6", "CF"),
        makePlayer("P7", "RF"),
        makePlayer("P8", "DH"),
      ],
    };
    const err = validateEditorState(state);
    expect(err).toBeTruthy();
    expect(err).toContain("SS");
  });

  it("reports all missing positions when multiple are absent", () => {
    const state = {
      ...initEditorState(),
      name: "Eagles",
      abbreviation: "EAG",
      lineup: [makePlayer("P1", "C"), makePlayer("P2", "1B")],
    };
    const err = validateEditorState(state);
    expect(err).toContain("2B");
    expect(err).toContain("3B");
    expect(err).toContain("SS");
    expect(err).toContain("LF");
    expect(err).toContain("CF");
    expect(err).toContain("RF");
  });

  it("bench players count toward covering required positions", () => {
    const state = {
      ...initEditorState(),
      name: "Eagles",
      abbreviation: "EAG",
      lineup: [
        makePlayer("P1", "C"),
        makePlayer("P2", "1B"),
        makePlayer("P3", "2B"),
        makePlayer("P4", "3B"),
        makePlayer("P5", "SS"),
        makePlayer("P6", "LF"),
        makePlayer("P7", "CF"),
      ],
      bench: [makePlayer("Bench", "RF")],
    };
    expect(validateEditorState(state)).toBe("");
  });
});

describe("editorReducer", () => {
  it("SET_FIELD updates name and clears error", () => {
    const state = { ...initEditorState(), error: "old error" };
    const next = editorReducer(state, { type: "SET_FIELD", field: "name", value: "Eagles" });
    expect(next.name).toBe("Eagles");
    expect(next.error).toBe("");
  });

  it("ADD_PLAYER appends to lineup", () => {
    const state = initEditorState();
    const player = makePlayer("Jake");
    const next = editorReducer(state, { type: "ADD_PLAYER", section: "lineup", player });
    expect(next.lineup).toHaveLength(1);
    expect(next.lineup[0].name).toBe("Jake");
  });

  it("REMOVE_PLAYER removes by index", () => {
    const p1 = makePlayer("A");
    const p2 = makePlayer("B");
    const state = { ...initEditorState(), lineup: [p1, p2] };
    const next = editorReducer(state, { type: "REMOVE_PLAYER", section: "lineup", index: 0 });
    expect(next.lineup).toHaveLength(1);
    expect(next.lineup[0].name).toBe("B");
  });

  it("MOVE_UP swaps player with predecessor", () => {
    const p1 = makePlayer("A");
    const p2 = makePlayer("B");
    const state = { ...initEditorState(), lineup: [p1, p2] };
    const next = editorReducer(state, { type: "MOVE_UP", section: "lineup", index: 1 });
    expect(next.lineup[0].name).toBe("B");
    expect(next.lineup[1].name).toBe("A");
  });

  it("MOVE_DOWN swaps player with successor", () => {
    const p1 = makePlayer("A");
    const p2 = makePlayer("B");
    const state = { ...initEditorState(), lineup: [p1, p2] };
    const next = editorReducer(state, { type: "MOVE_DOWN", section: "lineup", index: 0 });
    expect(next.lineup[0].name).toBe("B");
    expect(next.lineup[1].name).toBe("A");
  });

  it("MOVE_UP at index 0 is a no-op", () => {
    const p1 = makePlayer("A");
    const state = { ...initEditorState(), lineup: [p1] };
    const next = editorReducer(state, { type: "MOVE_UP", section: "lineup", index: 0 });
    expect(next.lineup[0].name).toBe("A");
  });

  it("REORDER reorders lineup by ordered IDs", () => {
    const p1 = makePlayer("A");
    const p2 = makePlayer("B");
    const p3 = makePlayer("C");
    const state = { ...initEditorState(), lineup: [p1, p2, p3] };
    const next = editorReducer(state, {
      type: "REORDER",
      section: "lineup",
      orderedIds: [p3.id, p1.id, p2.id],
    });
    expect(next.lineup.map((p) => p.name)).toEqual(["C", "A", "B"]);
  });
});

describe("editorStateToCreateInput", () => {
  it("maps editor state to CreateCustomTeamInput", () => {
    const player = makePlayer("Tom Adams");
    const state = {
      ...initEditorState(),
      name: "  Eagles  ",
      city: "Austin",
      nickname: "Birds",
      lineup: [player],
      bench: [],
      pitchers: [],
    };
    const input = editorStateToCreateInput(state);
    expect(input.name).toBe("Eagles");
    expect(input.city).toBe("Austin");
    expect(input.roster.lineup[0].name).toBe("Tom Adams");
    expect(input.roster.lineup[0].role).toBe("batter");
  });
});

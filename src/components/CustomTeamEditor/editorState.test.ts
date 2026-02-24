import { describe, expect, it } from "vitest";

import {
  editorReducer,
  editorStateToCreateInput,
  initEditorState,
  makePlayerId,
  validateEditorState,
} from "./editorState";

const makePlayer = (name = "Tom Adams") => ({
  id: makePlayerId(),
  name,
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
});

describe("validateEditorState", () => {
  it("requires team name", () => {
    const state = initEditorState();
    expect(validateEditorState(state)).toContain("Team name");
  });

  it("requires at least 1 lineup player", () => {
    const state = { ...initEditorState(), name: "Eagles" };
    expect(validateEditorState(state)).toContain("lineup");
  });

  it("requires player names", () => {
    const state = {
      ...initEditorState(),
      name: "Eagles",
      lineup: [{ ...makePlayer(""), contact: 60, power: 60, speed: 60 }],
    };
    expect(validateEditorState(state)).toContain("name");
  });

  it("returns empty string for a valid state", () => {
    const state = {
      ...initEditorState(),
      name: "Eagles",
      lineup: [makePlayer("Tom Adams")],
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

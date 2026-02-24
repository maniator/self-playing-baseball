import type { CustomTeamDraft } from "@features/customTeams/generation/generateDefaultTeam";

import type { CreateCustomTeamInput, CustomTeamDoc, TeamPlayer } from "@storage/types";

import { REQUIRED_FIELD_POSITIONS } from "./playerConstants";

/** A single player row as edited in the form (stats as numbers 0–100). */
export interface EditorPlayer {
  id: string;
  name: string;
  /** Position code (e.g. "C", "1B", "SS", "SP"). Empty string while unset. */
  position: string;
  /** Batting handedness. Defaults to "R" for new players. */
  handedness: "R" | "L" | "S";
  contact: number;
  power: number;
  speed: number;
  velocity?: number;
  control?: number;
  movement?: number;
}

export interface EditorState {
  name: string;
  city: string;
  nickname: string;
  lineup: EditorPlayer[];
  bench: EditorPlayer[];
  pitchers: EditorPlayer[];
  error: string;
}

export type EditorAction =
  | { type: "SET_FIELD"; field: "name" | "city" | "nickname"; value: string }
  | {
      type: "UPDATE_PLAYER";
      section: "lineup" | "bench" | "pitchers";
      index: number;
      player: Partial<EditorPlayer>;
    }
  | { type: "ADD_PLAYER"; section: "lineup" | "bench" | "pitchers"; player: EditorPlayer }
  | { type: "REMOVE_PLAYER"; section: "lineup" | "bench" | "pitchers"; index: number }
  | { type: "MOVE_UP"; section: "lineup" | "bench" | "pitchers"; index: number }
  | { type: "MOVE_DOWN"; section: "lineup" | "bench" | "pitchers"; index: number }
  /** Reorder section by new ordered list of player IDs (used by DnD drag-end). */
  | { type: "REORDER"; section: "lineup" | "bench" | "pitchers"; orderedIds: string[] }
  | { type: "APPLY_DRAFT"; draft: CustomTeamDraft }
  | { type: "SET_ERROR"; error: string };

let playerIdCounter = 0;
export const makePlayerId = (): string => `ep_${Date.now()}_${++playerIdCounter}`;

const moveItem = <T>(arr: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value, error: "" };
    case "UPDATE_PLAYER": {
      const list = [...state[action.section]];
      list[action.index] = { ...list[action.index], ...action.player };
      return { ...state, [action.section]: list, error: "" };
    }
    case "ADD_PLAYER":
      return { ...state, [action.section]: [...state[action.section], action.player], error: "" };
    case "REMOVE_PLAYER": {
      const list = state[action.section].filter((_, i) => i !== action.index);
      return { ...state, [action.section]: list, error: "" };
    }
    case "REORDER": {
      const lookup = new Map(state[action.section].map((p) => [p.id, p]));
      const reordered = action.orderedIds.flatMap((id) => {
        const p = lookup.get(id);
        return p ? [p] : [];
      });
      return { ...state, [action.section]: reordered };
    }
    case "MOVE_UP":
      return {
        ...state,
        [action.section]: moveItem(state[action.section], action.index, action.index - 1),
      };
    case "MOVE_DOWN":
      return {
        ...state,
        [action.section]: moveItem(state[action.section], action.index, action.index + 1),
      };
    case "APPLY_DRAFT":
      return {
        ...state,
        name: action.draft.name,
        city: action.draft.city,
        nickname: action.draft.nickname,
        lineup: action.draft.roster.lineup.map(draftPlayerToEditor),
        bench: action.draft.roster.bench.map(draftPlayerToEditor),
        pitchers: action.draft.roster.pitchers.map(draftPlayerToEditor),
        error: "",
      };
    case "SET_ERROR":
      return { ...state, error: action.error };
    default:
      return state;
  }
}

const draftPlayerToEditor = (p: CustomTeamDraft["roster"]["lineup"][number]): EditorPlayer => ({
  id: p.id,
  name: p.name,
  position: p.position ?? "",
  handedness: p.handedness ?? "R",
  contact: p.batting.contact,
  power: p.batting.power,
  speed: p.batting.speed,
  ...(p.pitching && {
    velocity: p.pitching.velocity,
    control: p.pitching.control,
    movement: p.pitching.movement,
  }),
});

const docPlayerToEditor = (p: TeamPlayer): EditorPlayer => ({
  id: p.id,
  name: p.name,
  position: p.position ?? "",
  handedness: p.handedness ?? "R",
  contact: p.batting.contact,
  power: p.batting.power,
  speed: p.batting.speed,
  ...(p.pitching && {
    velocity: p.pitching.velocity,
    control: p.pitching.control,
    movement: p.pitching.movement,
  }),
});

export const initEditorState = (team?: CustomTeamDoc): EditorState => ({
  name: team?.name ?? "",
  city: team?.city ?? "",
  nickname: team?.nickname ?? "",
  lineup: team?.roster.lineup.map(docPlayerToEditor) ?? [],
  bench: team?.roster.bench.map(docPlayerToEditor) ?? [],
  pitchers: team?.roster.pitchers.map(docPlayerToEditor) ?? [],
  error: "",
});

/** Validates the state and returns an error string or empty string if valid. */
export function validateEditorState(state: EditorState): string {
  if (!state.name.trim()) return "Team name is required.";
  if (state.lineup.length === 0) return "At least 1 lineup player is required.";
  for (const p of [...state.lineup, ...state.bench, ...state.pitchers]) {
    if (!p.name.trim()) return "All players must have a name.";
  }

  // Check that all required field positions are covered in lineup + bench.
  const fieldPlayers = [...state.lineup, ...state.bench];
  const coveredPositions = new Set(fieldPlayers.map((p) => p.position).filter(Boolean));
  const missingPositions = REQUIRED_FIELD_POSITIONS.filter((pos) => !coveredPositions.has(pos));
  if (missingPositions.length > 0) {
    return `Roster must include at least one player at each of: ${missingPositions.join(", ")}.`;
  }

  return "";
}

/** Maps EditorState to CreateCustomTeamInput. */
export function editorStateToCreateInput(state: EditorState): CreateCustomTeamInput {
  return {
    name: state.name.trim(),
    city: state.city.trim() || undefined,
    nickname: state.nickname.trim() || undefined,
    source: "custom",
    roster: {
      lineup: state.lineup.map(editorToTeamPlayer("batter")),
      bench: state.bench.map(editorToTeamPlayer("batter")),
      pitchers: state.pitchers.map(editorToTeamPlayer("pitcher")),
    },
  };
}

const editorToTeamPlayer =
  (role: "batter" | "pitcher") =>
  (p: EditorPlayer): TeamPlayer => ({
    id: p.id,
    name: p.name.trim(),
    role,
    position: p.position || undefined,
    handedness: p.handedness || undefined,
    batting: { contact: p.contact, power: p.power, speed: p.speed },
    ...(role === "pitcher" &&
      p.velocity !== undefined && {
        pitching: { velocity: p.velocity, control: p.control ?? 60, movement: p.movement ?? 60 },
      }),
  });

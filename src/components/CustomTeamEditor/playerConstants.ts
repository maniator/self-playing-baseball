/**
 * Position and handedness constants for the Custom Team Editor.
 * Reuses the canonical position set from src/utils/roster.ts
 * (BATTING_POSITIONS, POSITION_NAMES) as the single source of truth.
 */
import { BATTING_POSITIONS } from "@utils/roster";

/** Allowed batting positions for lineup/bench players. */
export const BATTER_POSITION_OPTIONS = [
  { value: "C", label: "Catcher" },
  { value: "1B", label: "First Base" },
  { value: "2B", label: "Second Base" },
  { value: "3B", label: "Third Base" },
  { value: "SS", label: "Shortstop" },
  { value: "LF", label: "Left Field" },
  { value: "CF", label: "Center Field" },
  { value: "RF", label: "Right Field" },
  { value: "DH", label: "DH" },
] as const;

/** Allowed positions for pitcher players. */
export const PITCHER_POSITION_OPTIONS = [
  { value: "SP", label: "Starting Pitcher" },
  { value: "RP", label: "Relief Pitcher" },
] as const;

export type BatterPosition = (typeof BATTER_POSITION_OPTIONS)[number]["value"];
export type PitcherPosition = (typeof PITCHER_POSITION_OPTIONS)[number]["value"];

/** Batting handedness options. */
export const HANDEDNESS_OPTIONS = [
  { value: "R", label: "Right" },
  { value: "L", label: "Left" },
  { value: "S", label: "Switch" },
] as const;

export type Handedness = "R" | "L" | "S";

/**
 * Field positions that must each appear at least once in the lineup + bench
 * before a custom team can be saved.  DH is excluded because it is optional.
 */
export const REQUIRED_FIELD_POSITIONS: ReadonlyArray<string> = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
] as const;

/**
 * Ordered positions for the 9 default lineup slots.
 * Sourced from BATTING_POSITIONS in roster.ts (same set).
 */
export const DEFAULT_LINEUP_POSITIONS: ReadonlyArray<string> = [...BATTING_POSITIONS] as const;

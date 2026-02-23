import type { State, StrikeoutEntry } from "./index";

/**
 * Returns true when the transition from `prev` to `next` represents a strikeout:
 * prev had 2 strikes, next reset the strike count, and no hit type was recorded
 * (a walk sets hitType = Hit.Walk; a strikeout leaves hitType undefined/null).
 */
export const wasStrikeout = (prev: State, next: State): boolean =>
  prev.strikes === 2 && next.strikes !== 2 && next.hitType == null;

/** Builds the StrikeoutEntry for the batter who just struck out. */
export const makeStrikeoutEntry = (state: State): StrikeoutEntry => ({
  team: state.atBat as 0 | 1,
  batterNum: state.batterIndex[state.atBat as 0 | 1] + 1,
});

/**
 * Appends a strikeout log entry to `next` when the play was a strikeout.
 * Compares `prev` (pre-action state) to `next` (post-action state).
 */
export const withStrikeoutLog = (prev: State, next: State): State =>
  wasStrikeout(prev, next)
    ? { ...next, strikeoutLog: [...next.strikeoutLog, makeStrikeoutEntry(prev)] }
    : next;

/**
 * Appends a decision log entry to `result` when `state` had a pending decision.
 * Uses `state.decisionLog` as the base so the new entry always follows the
 * original log, even if `result` was produced by a function that may have
 * modified other fields.
 */
export const withDecisionLog = (state: State, result: State, entry: string): State =>
  state.pendingDecision ? { ...result, decisionLog: [...state.decisionLog, entry] } : result;

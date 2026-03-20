import { generateRoster } from "@shared/utils/roster";

import type { State } from "./gameStateTypes";

/**
 * Returns the current batter's player ID.
 *
 * `lineupOrder` is the source of truth once teams are configured, but some
 * transient states (fresh state before setup wiring, malformed fixtures, or
 * partial restored payloads) may still have an empty lineup order. In that
 * case, fall back to the deterministic generated roster ID for this team/slot
 * so logs and stat keys never record an undefined playerId.
 */
export const resolveBatterPlayerId = (state: State, teamIdx: 0 | 1, slotIdx: number): string => {
  const fromLineup = state.lineupOrder?.[teamIdx]?.[slotIdx];
  if (fromLineup) return fromLineup;

  const generated = generateRoster(state.teams[teamIdx]).batters[slotIdx]?.id;
  if (generated) return generated;

  const slug =
    state.teams[teamIdx]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "team";
  return `${slug}_b${slotIdx}`;
};

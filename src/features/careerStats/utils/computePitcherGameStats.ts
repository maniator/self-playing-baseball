/**
 * Pitcher stats computation utilities.
 *
 * Computes per-pitcher statistics from the `pitcherGameLog` captured in game state,
 * including IP display, ERA, WHIP, and SV/HLD/BS.
 *
 * SV/HLD/BS rules are implemented in `computeSaveHoldBS.ts` (extracted for file-size).
 * See that module for the full rule documentation.
 */

import type { PitcherLogEntry } from "@feat/gameplay/context/index";

import { computeSaveHoldBS } from "./computeSaveHoldBS";

/** Derived pitching stats suitable for display or DB storage. */
export type PitcherGameResult = {
  pitcherId: string;
  outsPitched: number;
  battersFaced: number;
  pitchesThrown: number;
  hitsAllowed: number;
  walksAllowed: number;
  strikeoutsRecorded: number;
  runsAllowed: number;
  homersAllowed: number;
  /** Equal to runsAllowed in v1 (no error tracking yet). */
  earnedRuns: number;
  saves: number;
  holds: number;
  blownSaves: number;
};

/**
 * Formats an out-count to the X.Y IP display format:
 * X = full innings (floor), Y = remaining outs (0, 1, or 2).
 * Example: 7 outs → "2.1", 9 outs → "3.0", 10 outs → "3.1".
 */
export const formatIP = (outsPitched: number): string => {
  const full = Math.floor(outsPitched / 3);
  const partial = outsPitched % 3;
  return `${full}.${partial}`;
};

/**
 * Computes ERA from earned runs and outs pitched.
 * Returns null when outsPitched === 0 (undefined ERA — display as "—").
 */
export const computeERA = (earnedRuns: number, outsPitched: number): number | null => {
  if (outsPitched === 0) return null;
  return (earnedRuns * 27) / outsPitched; // 27 = 9 innings * 3 outs
};

/**
 * Computes WHIP from walks, hits allowed, and outs pitched.
 * Returns null when outsPitched === 0 (undefined WHIP — display as "—").
 */
export const computeWHIP = (
  walksAllowed: number,
  hitsAllowed: number,
  outsPitched: number,
): number | null => {
  if (outsPitched === 0) return null;
  // WHIP per inning: (BB + H) / (outs / 3)
  const innings = outsPitched / 3;
  return (walksAllowed + hitsAllowed) / innings;
};

/**
 * Converts the `pitcherGameLog` from game state into PitcherGameResult rows,
 * one per pitcher per team, ready to be written to the `pitcherGameStats` collection.
 *
 * @param pitcherGameLog - State.pitcherGameLog — [away pitchers, home pitchers]
 * @param finalScore     - Final [away, home] score for SV/HLD/BS computation.
 */
export const computePitcherGameStats = (
  pitcherGameLog: [PitcherLogEntry[], PitcherLogEntry[]],
  finalScore: [number, number],
): { teamIdx: 0 | 1; result: PitcherGameResult }[] => {
  const output: { teamIdx: 0 | 1; result: PitcherGameResult }[] = [];

  for (const teamIdx of [0, 1] as const) {
    const entries = pitcherGameLog[teamIdx];
    if (entries.length === 0) continue;

    // Only award saves to the WINNING team's pitchers (and BS/HLD to any team in save sit).
    // Ties result in teamWon=false for both teams — no SV/HLD awarded on a tied final.
    const otherIdx = teamIdx === 0 ? 1 : 0;
    const teamWon = finalScore[teamIdx] > finalScore[otherIdx];

    const saveHoldBS = computeSaveHoldBS(entries, teamWon, teamIdx);

    // Merge entries by pitcherId in case the same pitcher appears twice (rare edge case).
    const byPitcher: Record<string, PitcherLogEntry> = {};
    for (const entry of entries) {
      if (!byPitcher[entry.pitcherId]) {
        byPitcher[entry.pitcherId] = { ...entry };
      } else {
        // Merge: accumulate stats, keep first entry's inning/score for SV purposes.
        const existing = byPitcher[entry.pitcherId];
        existing.outsPitched += entry.outsPitched;
        existing.battersFaced += entry.battersFaced;
        existing.pitchesThrown = (existing.pitchesThrown ?? 0) + (entry.pitchesThrown ?? 0);
        existing.hitsAllowed += entry.hitsAllowed;
        existing.walksAllowed += entry.walksAllowed;
        existing.strikeoutsRecorded += entry.strikeoutsRecorded;
        existing.runsAllowed += entry.runsAllowed;
        existing.homersAllowed += entry.homersAllowed;
      }
    }

    for (const entry of Object.values(byPitcher)) {
      const svhb = saveHoldBS[entry.pitcherId] ?? { saves: 0, holds: 0, blownSaves: 0 };
      output.push({
        teamIdx,
        result: {
          pitcherId: entry.pitcherId,
          outsPitched: entry.outsPitched,
          battersFaced: entry.battersFaced,
          pitchesThrown: entry.pitchesThrown ?? 0,
          hitsAllowed: entry.hitsAllowed,
          walksAllowed: entry.walksAllowed,
          strikeoutsRecorded: entry.strikeoutsRecorded,
          runsAllowed: entry.runsAllowed,
          homersAllowed: entry.homersAllowed,
          earnedRuns: entry.runsAllowed, // v1: earnedRuns = runsAllowed
          saves: svhb.saves,
          holds: svhb.holds,
          blownSaves: svhb.blownSaves,
        },
      });
    }
  }

  return output;
};

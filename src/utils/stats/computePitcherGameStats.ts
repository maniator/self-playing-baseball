/**
 * Pitcher stats computation utilities.
 *
 * Computes per-pitcher statistics from the `pitcherGameLog` captured in game state,
 * including IP display, ERA, WHIP, and SV/HLD/BS.
 *
 * SV/HLD/BS rules (v1 simplified deterministic):
 *
 * SAVE (SV): Awarded to the winning team's finishing pitcher (last pitcher to record
 *   at least one out for the winning team) if:
 *   - They pitched at least 3 outs, AND
 *   - They entered with a lead ≤ 3 runs, AND
 *   - They did not give up the lead (runsAllowed < scoreOnEntry lead margin).
 *   Note: The starter who pitches a complete game shutout does NOT get a save.
 *
 * HOLD (HLD): Awarded to a relief pitcher (non-closer, non-starter) if:
 *   - They entered with a lead ≤ 3 runs, AND
 *   - They recorded at least 1 out, AND
 *   - They left the game with the lead intact (did not give up the lead or tie game).
 *
 * BLOWN SAVE (BS): Awarded to any relief pitcher who:
 *   - Entered in a save situation (lead ≤ 3 runs), AND
 *   - Gave up the tying or go-ahead run while pitching.
 */

import type { PitcherLogEntry } from "@context/index";

/** Derived pitching stats suitable for display or DB storage. */
export type PitcherGameResult = {
  pitcherId: string;
  outsPitched: number;
  battersFaced: number;
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
 * Determines which pitchers get SV, HLD, or BS for a single team's pitcher log.
 *
 * @param entries - Pitcher log entries for ONE team (the pitching team).
 * @param teamWon  - Whether this team won the game.
 * @param teamIdx  - 0 if this is the away team's pitchers, 1 if home.
 */
function computeSaveHoldBS(
  entries: PitcherLogEntry[],
  teamWon: boolean,
  teamIdx: 0 | 1,
): Record<string, { saves: number; holds: number; blownSaves: number }> {
  const result: Record<string, { saves: number; holds: number; blownSaves: number }> = {};

  const getOrCreate = (id: string) => {
    if (!result[id]) result[id] = { saves: 0, holds: 0, blownSaves: 0 };
    return result[id];
  };

  // Only award SV/HLD/BS if this team won (or at minimum was in a lead on entry).
  // SV only goes to the team that won.

  // Filter entries that had at least 1 out pitched.
  const withOuts = entries.filter((e) => e.outsPitched > 0);
  if (withOuts.length === 0) return result;

  // The "finishing pitcher" is the last entry with outsPitched > 0.
  const finisherIdx = withOuts.length - 1;

  for (let i = 0; i < withOuts.length; i++) {
    const entry = withOuts[i];
    const r = getOrCreate(entry.pitcherId);

    // Score when pitcher entered — compute their team's lead at entry.
    const [awayOnEntry, homeOnEntry] = entry.scoreOnEntry;
    const teamScoreOnEntry = teamIdx === 0 ? awayOnEntry : homeOnEntry;
    const oppScoreOnEntry = teamIdx === 0 ? homeOnEntry : awayOnEntry;
    const leadOnEntry = teamScoreOnEntry - oppScoreOnEntry;

    // Was this a save situation? Lead ≤ 3 (and team was leading).
    const isSaveSituation = leadOnEntry > 0 && leadOnEntry <= 3;

    if (!isSaveSituation) continue;

    // Did this pitcher blow the save? (give up tying/go-ahead run while pitching)
    // We check if the opponent caught up or took the lead while this pitcher was in.
    // Simplified: runsAllowed >= leadOnEntry means opponent caught up.
    const blew = entry.runsAllowed >= leadOnEntry;

    if (blew) {
      r.blownSaves++;
      // A blown save pitcher cannot also get a hold.
      continue;
    }

    // Pitcher held the lead — check for Save vs Hold.
    if (i === finisherIdx && teamWon) {
      // Finishing pitcher of the winning team in a save situation.
      if (entry.outsPitched >= 3) {
        r.saves++;
      } else {
        // Did not pitch enough — still a hold if they left with lead intact.
        r.holds++;
      }
    } else if (i !== finisherIdx) {
      // Not the finisher; non-starter relief pitcher who preserved a lead.
      r.holds++;
    }
    // The starter (i === 0) who never leaves does not get a save (complete game).
  }

  return result;
}

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
    const awayWon = finalScore[0] > finalScore[1];
    const teamWon = teamIdx === 0 ? awayWon : !awayWon;

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

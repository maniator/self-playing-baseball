/**
 * SV/HLD/BS eligibility rules engine for a single team's pitcher appearances in one game.
 *
 * Extracted from computePitcherGameStats.ts so each module stays under the ~200-line target.
 *
 * Rules summary:
 *  SAVE (SV)         — finishing relief pitcher (i !== 0) on the winning team, ≥ 3 outs pitched,
 *                       entered with lead ≤ 3 runs, did not blow the lead.
 *  HOLD (HLD)        — non-closing relief pitcher (i !== 0, i !== finisher) on the winning team,
 *                       entered with lead ≤ 3 runs, ≥ 1 out pitched, left lead intact.
 *  BLOWN SAVE (BS)   — any relief pitcher who entered in a save situation and allowed the tying
 *                       or go-ahead run.  0-out appearances are still eligible for BS.
 */

import type { PitcherLogEntry } from "@context/index";

/** Per-pitcher SV/HLD/BS totals for one game. */
export type SaveHoldBSResult = Record<string, { saves: number; holds: number; blownSaves: number }>;

/**
 * Determines which pitchers earn SV, HLD, or BS for a single team's pitcher log.
 *
 * @param entries  - Pitcher log entries for ONE team (the pitching team).
 * @param teamWon  - Whether this team won the game.
 * @param teamIdx  - 0 = away team's pitchers, 1 = home team's pitchers.
 */
export function computeSaveHoldBS(
  entries: PitcherLogEntry[],
  teamWon: boolean,
  teamIdx: 0 | 1,
): SaveHoldBSResult {
  const result: SaveHoldBSResult = {};

  const getOrCreate = (id: string) => {
    if (!result[id]) result[id] = { saves: 0, holds: 0, blownSaves: 0 };
    return result[id];
  };

  // The "finishing pitcher" is the last entry with outsPitched > 0.
  // Used to distinguish SV candidates from HLD candidates.
  let finisherIdx = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].outsPitched > 0) {
      finisherIdx = i;
      break;
    }
  }

  // Iterate ALL entries (including 0-out appearances) so that a pitcher who
  // enters in a save situation and gives up runs without recording an out
  // still receives a Blown Save.
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
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
    // Simplified: runsAllowed >= leadOnEntry means opponent caught up.
    const blew = entry.runsAllowed >= leadOnEntry;

    if (blew) {
      r.blownSaves++;
      // A blown-save pitcher cannot also get a hold.
      continue;
    }

    // SV and HLD require at least 1 out recorded.
    if (entry.outsPitched === 0) continue;

    // Pitcher held the lead — check for Save vs Hold.
    // The finishing pitcher can only receive a Save (never a Hold).
    // The starter (i === 0) never receives a Save or Hold — only relief pitchers qualify.
    if (i === finisherIdx && teamWon && i !== 0) {
      // Relief finishing pitcher of the winning team in a save situation.
      if (entry.outsPitched >= 3) {
        r.saves++;
      }
      // Finisher with < 3 outs: no save, no hold.
    } else if (i !== finisherIdx && i !== 0 && teamWon) {
      // Relief pitcher (not the starter, not the finisher) who preserved a lead for the winning team.
      r.holds++;
    }
  }

  // Enforce SV/HLD mutual exclusivity: a pitcher who earns a Save cannot also have a Hold.
  // This can occur when the same pitcher pitches multiple stints — once as middle relief (HLD)
  // and once as the finishing pitcher (SV). The Save takes precedence.
  for (const r of Object.values(result)) {
    if (r.saves > 0 && r.holds > 0) {
      r.holds = 0;
    }
  }

  return result;
}

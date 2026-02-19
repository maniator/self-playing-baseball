import { Hit } from "../constants/hitTypes";

/**
 * Advance runners using explicit, correct baseball rules.
 * Returns a fresh baseLayout tuple and run count — never mutates state arrays.
 *
 * Rules:
 *   HR     – all runners score, batter scores (grand-slam logic included)
 *   Triple – all runners score, batter to 3rd
 *   Double – runners on 2nd/3rd score; runner on 1st to 3rd; batter to 2nd
 *   Single – runner on 3rd scores; runner on 2nd to 3rd; runner on 1st to 2nd; batter to 1st
 *   Walk   – force advancement only (batter to 1st, each runner advances only if forced)
 *
 * TODO (future PR): Add grounder / double-play logic, directional-hit runner-advancement,
 * and caught-at-first-with-trailing-runner scenarios.  These require tracking ball direction
 * and individual runner speeds, which is a larger state change.
 */
export const advanceRunners = (
  type: Hit,
  oldBase: [number, number, number],
): { newBase: [number, number, number]; runsScored: number } => {
  const newBase: [number, number, number] = [0, 0, 0];
  let runsScored = 0;

  switch (type) {
    case Hit.Homerun:
      runsScored = oldBase.filter(Boolean).length + 1;
      break;

    case Hit.Triple:
      runsScored = oldBase.filter(Boolean).length;
      newBase[2] = 1;
      break;

    case Hit.Double:
      if (oldBase[2]) runsScored++;
      if (oldBase[1]) runsScored++;
      if (oldBase[0]) newBase[2] = 1;
      newBase[1] = 1;
      break;

    case Hit.Single:
      if (oldBase[2]) runsScored++;
      if (oldBase[1]) newBase[2] = 1;
      if (oldBase[0]) newBase[1] = 1;
      newBase[0] = 1;
      break;

    case Hit.Walk:
      if (oldBase[0]) {
        if (oldBase[1]) {
          if (oldBase[2]) {
            runsScored++;
          }
          newBase[2] = 1;
          newBase[1] = 1;
        } else {
          newBase[1] = 1;
          if (oldBase[2]) newBase[2] = 1;
        }
        newBase[0] = 1;
      } else {
        newBase[0] = 1;
        if (oldBase[1]) newBase[1] = 1;
        if (oldBase[2]) newBase[2] = 1;
      }
      break;

    default:
      throw new Error(`Not a possible hit type: ${type}`);
  }

  return { newBase, runsScored };
};

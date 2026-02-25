/** Maximum allowed sum of contact + power + speed for a hitter. */
export const HITTER_STAT_CAP = 150;
/** Maximum allowed sum of velocity + control + movement for a pitcher. */
export const PITCHER_STAT_CAP = 160;

/** Returns the stat total for a hitter (contact + power + speed). */
export function hitterStatTotal(contact: number, power: number, speed: number): number {
  return contact + power + speed;
}

/** Returns the stat total for a pitcher (velocity + control + movement). */
export function pitcherStatTotal(velocity: number, control: number, movement: number): number {
  return velocity + control + movement;
}

/** Returns remaining budget for a hitter, negative if over cap. */
export function hitterRemaining(contact: number, power: number, speed: number): number {
  return HITTER_STAT_CAP - hitterStatTotal(contact, power, speed);
}

/** Returns remaining budget for a pitcher, negative if over cap. */
export function pitcherRemaining(velocity: number, control: number, movement: number): number {
  return PITCHER_STAT_CAP - pitcherStatTotal(velocity, control, movement);
}

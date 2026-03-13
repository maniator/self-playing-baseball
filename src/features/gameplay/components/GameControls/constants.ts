export const SPEED_SLOW = 1200;
export const SPEED_NORMAL = 700;
export const SPEED_FAST = 150;
export const SPEED_INSTANT = 0;

/** Ordered from slowest (index 0) to fastest (index 3). */
export const SPEED_STEPS = [SPEED_SLOW, SPEED_NORMAL, SPEED_FAST, SPEED_INSTANT] as const;

/** Human-readable labels matching SPEED_STEPS by index. */
export const SPEED_STEP_LABELS = ["Slow", "Normal", "Fast", "Instant"] as const;

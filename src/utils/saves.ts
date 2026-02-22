import { getSeed } from "@utils/rng";

/** Returns the current seed as a base-36 string, falling back to "0". */
export const currentSeedStr = (): string => (getSeed() ?? 0).toString(36);

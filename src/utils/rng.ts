type SeedInitOptions = {
  writeToUrl?: boolean;
};

let seed: number | null = null;
let rng: (() => number) | null = null;
/** The current value of `a` inside the mulberry32 closure — captured after every call. */
let rngInternalA: number | null = null;

const mulberry32 = (a: number) => (): number => {
  a += 0x6d2b79f5;
  rngInternalA = a;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const parseSeed = (seedString: string): number | null => {
  const trimmed = seedString.trim();
  if (!trimmed) return null;
  const radix = /[a-z]/i.test(trimmed) ? 36 : 10;
  const parsed = parseInt(trimmed, radix);
  if (!Number.isFinite(parsed)) return null;
  return parsed >>> 0;
};

const generateSeed = (): number => ((Math.random() * 0xffffffff) ^ Date.now()) >>> 0;

export const initSeedFromUrl = ({ writeToUrl = false }: SeedInitOptions = {}): number | null => {
  if (typeof window === "undefined" || typeof window.location === "undefined") {
    return seed;
  }

  if (seed !== null && rng) {
    return seed;
  }

  const url = new URL(window.location.href);
  const seedParam = url.searchParams.get("seed");
  const nextSeed = parseSeed(seedParam ?? "") ?? generateSeed();
  seed = nextSeed;
  rng = mulberry32(seed);
  rngInternalA = seed; // pre-call state

  if (writeToUrl) {
    url.searchParams.set("seed", seed.toString(36));
    if (typeof window.history?.replaceState === "function") {
      window.history.replaceState(null, "", url.toString());
    }
  }

  return seed;
};

export const getSeed = (): number | null => {
  if (seed === null) {
    initSeedFromUrl({ writeToUrl: false });
  }
  return seed;
};

export const random = (): number => {
  if (!rng) {
    initSeedFromUrl({ writeToUrl: false });
  }
  if (!rng) {
    throw new Error("Random generator not initialized");
  }
  return rng();
};

export const buildReplayUrl = (decisionLog?: string[]): string => {
  const currentSeed = getSeed();
  if (typeof window === "undefined" || typeof window.location === "undefined") {
    return "";
  }
  const url = new URL(window.location.href);
  if (currentSeed !== null) {
    url.searchParams.set("seed", currentSeed.toString(36));
  }
  if (decisionLog && decisionLog.length > 0) {
    url.searchParams.set("decisions", encodeURIComponent(decisionLog.join(",")));
  } else {
    url.searchParams.delete("decisions");
  }
  return url.toString();
};

export const getDecisionsFromUrl = (): string[] => {
  if (typeof window === "undefined" || typeof window.location === "undefined") {
    return [];
  }
  const param = new URL(window.location.href).searchParams.get("decisions");
  if (!param) return [];
  return decodeURIComponent(param).split(",").filter(Boolean);
};

/**
 * Returns the current internal PRNG state (the value of `a` after the last
 * `random()` call, or the initial seed if no call has been made yet).
 * Store this alongside game state so the PRNG position can be fully restored.
 */
export const getRngState = (): number | null => rngInternalA;

/**
 * Restores the PRNG to a previously captured state so that the next
 * `random()` call produces the same value it would have in the original game.
 */
export const restoreRng = (state: number): void => {
  rng = mulberry32(state);
  rngInternalA = state;
};

/**
 * Re-initializes the PRNG from a caller-supplied seed string (base-36 or
 * decimal).  Unlike `initSeedFromUrl`, this can be called at any time —
 * e.g. when the user types a seed in the New Game dialog.
 *
 * If `seedStr` is blank or unparseable a fresh random seed is generated.
 * The resulting seed is written to the `?seed=` URL parameter so that
 * `buildReplayUrl()` and share-replay continue to work correctly.
 *
 * Returns the numeric seed that was actually applied.
 */
export const reinitSeed = (seedStr: string): number => {
  const parsed = parseSeed(seedStr);
  const nextSeed = parsed ?? generateSeed();
  seed = nextSeed;
  rng = mulberry32(seed);
  rngInternalA = seed;
  if (typeof window !== "undefined" && typeof window.history?.replaceState === "function") {
    const url = new URL(window.location.href);
    url.searchParams.set("seed", seed.toString(36));
    window.history.replaceState(null, "", url.toString());
  }
  return seed;
};

type SeedInitOptions = {
  writeToUrl?: boolean;
};

let seed: number | null = null;
let rng: (() => number) | null = null;

const mulberry32 = (a: number) => (): number => {
  let t = (a += 0x6d2b79f5);
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

const generateSeed = (): number =>
  (((Math.random() * 0xffffffff) ^ Date.now()) >>> 0);

export const initSeedFromUrl = ({ writeToUrl = false }: SeedInitOptions = {}): number | null => {
  if (typeof window === "undefined" || typeof window.location === "undefined") {
    return seed;
  }

  if (seed !== null && rng) {
    return seed;
  }

  const url = new URL(window.location.href);
  const seedParam = url.searchParams.get("seed");
  let nextSeed = seedParam ? parseSeed(seedParam) : null;

  if (nextSeed === null) {
    nextSeed = generateSeed();
  }

  seed = nextSeed;
  rng = mulberry32(seed);

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

export const buildReplayUrl = (): string => {
  const currentSeed = getSeed();
  if (typeof window === "undefined" || typeof window.location === "undefined") {
    return "";
  }
  const url = new URL(window.location.href);
  if (currentSeed !== null) {
    url.searchParams.set("seed", currentSeed.toString(36));
  }
  return url.toString();
};

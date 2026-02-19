let currentSeed = 0;
let generator: (() => number) | null = null;

const MAX_UINT32 = 0xFFFFFFFF;
const SEED_QUERY_PARAM = "seed";

const mulberry32 = (seed: number) => {
  let value = seed >>> 0;

  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const setSeed = (seed: number) => {
  currentSeed = seed >>> 0;
  generator = mulberry32(currentSeed);
};

const getSeedFromUrl = (): number | null => {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get(SEED_QUERY_PARAM);

  if (!seedParam) {
    return null;
  }

  const parsedBase10 = Number.parseInt(seedParam, 10);
  if (
    !Number.isNaN(parsedBase10) &&
    Number.isSafeInteger(parsedBase10) &&
    parsedBase10 >= 0 &&
    parsedBase10 <= MAX_UINT32
  ) {
    return parsedBase10 >>> 0;
  }

  const parsedBase36 = Number.parseInt(seedParam, 36);
  if (
    !Number.isNaN(parsedBase36) &&
    Number.isSafeInteger(parsedBase36) &&
    parsedBase36 >= 0 &&
    parsedBase36 <= MAX_UINT32
  ) {
    return parsedBase36 >>> 0;
  }

  return null;
};

const writeSeedToUrl = (seed: number) => {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set(SEED_QUERY_PARAM, seed.toString(36));
  window.history.replaceState(null, "", nextUrl.toString());
};

const createSeed = () => Math.floor(Math.random() * MAX_UINT32) >>> 0;

export const initSeedFromUrl = ({ writeToUrl = false }: { writeToUrl?: boolean } = {}) => {
  const existingSeed = getSeedFromUrl();
  const seedToUse = existingSeed === null ? createSeed() : existingSeed;

  setSeed(seedToUse);

  if (writeToUrl || existingSeed === null) {
    writeSeedToUrl(seedToUse);
  }

  return seedToUse;
};

const ensureInitialized = () => {
  if (!generator) {
    initSeedFromUrl();
  }
};

export const random = (): number => {
  ensureInitialized();
  if (!generator) {
    throw new Error("RNG not initialized");
  }
  return generator();
};

export const getSeed = (): number => {
  ensureInitialized();
  return currentSeed;
};

export const buildReplayUrl = () => {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set(SEED_QUERY_PARAM, getSeed().toString(36));
  return nextUrl.toString();
};

export { mulberry32 };

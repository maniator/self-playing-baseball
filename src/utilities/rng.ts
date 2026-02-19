let seed: number = (Date.now() >>> 0);

function createRng(s: number): () => number {
  let state = s >>> 0;
  return function () {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rng: () => number = createRng(seed);

export function getSeed(): number {
  return seed;
}

export function initSeedFromUrl({ writeToUrl = false }: { writeToUrl?: boolean } = {}): void {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get('seed');

  if (seedParam !== null) {
    const parsed = /^\d+$/.test(seedParam)
      ? parseInt(seedParam, 10)
      : parseInt(seedParam, 36);
    if (!isNaN(parsed)) {
      seed = parsed >>> 0;
    }
  } else {
    seed = (Date.now() >>> 0);
    if (writeToUrl) {
      params.set('seed', seed.toString(36));
      history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    }
  }

  rng = createRng(seed);
}

export function random(): number {
  return rng();
}

export function buildReplayUrl(): string {
  const params = new URLSearchParams(window.location.search);
  params.set('seed', seed.toString(36));
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

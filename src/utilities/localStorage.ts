export function loadBool(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === "true";
}

export function loadInt(key: string, fallback: number): number {
  const v = localStorage.getItem(key);
  return v === null ? fallback : parseInt(v, 10);
}

export function loadFloat(key: string, fallback: number): number {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  const f = parseFloat(v);
  return Number.isFinite(f) ? Math.max(0, Math.min(1, f)) : fallback;
}

export function loadString<T extends string>(key: string, fallback: T): T {
  const v = localStorage.getItem(key);
  return v === null ? fallback : (v as T);
}

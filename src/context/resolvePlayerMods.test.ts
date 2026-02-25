import { describe, expect, it } from "vitest";

import { buildResolvedMods, resolvePlayerMods, ZERO_MODS } from "./resolvePlayerMods";

describe("resolvePlayerMods", () => {
  it("returns ZERO_MODS for undefined", () => {
    expect(resolvePlayerMods(undefined)).toEqual(ZERO_MODS);
  });
  it("defaults all missing fields to 0", () => {
    expect(resolvePlayerMods({})).toEqual(ZERO_MODS);
  });
  it("preserves provided values", () => {
    const result = resolvePlayerMods({ contactMod: 10, speedMod: -5 });
    expect(result.contactMod).toBe(10);
    expect(result.speedMod).toBe(-5);
    expect(result.powerMod).toBe(0); // defaulted
  });
});

describe("buildResolvedMods", () => {
  it("returns empty record for empty overrides", () => {
    expect(buildResolvedMods({})).toEqual({});
  });
  it("builds resolved mods for each player", () => {
    const result = buildResolvedMods({
      p1: { contactMod: 10, powerMod: 5 },
      p2: { speedMod: -10 },
    });
    expect(result.p1.contactMod).toBe(10);
    expect(result.p1.powerMod).toBe(5);
    expect(result.p1.speedMod).toBe(0); // defaulted
    expect(result.p2.speedMod).toBe(-10);
    expect(result.p2.contactMod).toBe(0); // defaulted
  });
});

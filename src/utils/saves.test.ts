import { afterEach, describe, expect, it, vi } from "vitest";

import * as rngModule from "@utils/rng";

import { currentSeedStr } from "./saves";

describe("currentSeedStr", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the current seed as a base-36 string", () => {
    vi.spyOn(rngModule, "getSeed").mockReturnValue(255);
    expect(currentSeedStr()).toBe("73");
  });

  it("falls back to '0' when getSeed returns null", () => {
    vi.spyOn(rngModule, "getSeed").mockReturnValue(null);
    expect(currentSeedStr()).toBe("0");
  });

  it("returns non-zero base-36 values correctly", () => {
    vi.spyOn(rngModule, "getSeed").mockReturnValue(1296);
    expect(currentSeedStr()).toBe("100");
  });
});

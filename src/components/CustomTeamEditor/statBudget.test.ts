import { describe, expect, it } from "vitest";

import {
  HITTER_STAT_CAP,
  hitterRemaining,
  hitterStatTotal,
  PITCHER_STAT_CAP,
  pitcherRemaining,
  pitcherStatTotal,
} from "./statBudget";

describe("hitterStatTotal", () => {
  it("returns sum of contact + power + speed", () => {
    expect(hitterStatTotal(50, 60, 40)).toBe(150);
    expect(hitterStatTotal(0, 0, 0)).toBe(0);
    expect(hitterStatTotal(100, 100, 100)).toBe(300);
  });
});

describe("pitcherStatTotal", () => {
  it("returns sum of velocity + control + movement", () => {
    expect(pitcherStatTotal(60, 55, 45)).toBe(160);
    expect(pitcherStatTotal(0, 0, 0)).toBe(0);
    expect(pitcherStatTotal(100, 100, 100)).toBe(300);
  });
});

describe("hitterRemaining", () => {
  it("returns positive value when under cap", () => {
    const remaining = hitterRemaining(40, 40, 40);
    expect(remaining).toBe(HITTER_STAT_CAP - 120);
    expect(remaining).toBeGreaterThan(0);
  });

  it("returns zero when exactly at cap", () => {
    // 50 + 50 + 50 = 150 = HITTER_STAT_CAP
    expect(hitterRemaining(50, 50, 50)).toBe(0);
  });

  it("returns negative value when over cap", () => {
    const remaining = hitterRemaining(70, 70, 70);
    expect(remaining).toBeLessThan(0);
  });
});

describe("pitcherRemaining", () => {
  it("returns positive value when under cap", () => {
    const remaining = pitcherRemaining(40, 40, 40);
    expect(remaining).toBe(PITCHER_STAT_CAP - 120);
    expect(remaining).toBeGreaterThan(0);
  });

  it("returns zero when exactly at cap", () => {
    // PITCHER_STAT_CAP is 160; use values that sum to 160
    expect(pitcherRemaining(60, 50, 50)).toBe(0);
  });

  it("returns negative value when over cap", () => {
    const remaining = pitcherRemaining(70, 70, 70);
    expect(remaining).toBeLessThan(0);
  });
});

describe("cap constants", () => {
  it("HITTER_STAT_CAP is 150", () => {
    expect(HITTER_STAT_CAP).toBe(150);
  });

  it("PITCHER_STAT_CAP is 160", () => {
    expect(PITCHER_STAT_CAP).toBe(160);
  });
});

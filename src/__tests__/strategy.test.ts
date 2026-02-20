import { describe, it, expect, afterEach, vi } from "vitest";
import { stratMod } from "../Context/strategy";

afterEach(() => vi.restoreAllMocks());

describe("stratMod — all strategies × all stats", () => {
  const stats = ["walk", "strikeout", "homerun", "contact", "steal", "advance"] as const;
  const strategies = ["balanced", "aggressive", "patient", "contact", "power"] as const;

  it("balanced returns 1.0 for every stat", () => {
    stats.forEach(s => expect(stratMod("balanced", s)).toBe(1.0));
  });

  it("aggressive boosts homerun, steal, advance; reduces walk", () => {
    expect(stratMod("aggressive", "homerun")).toBeGreaterThan(1);
    expect(stratMod("aggressive", "steal")).toBeGreaterThan(1);
    expect(stratMod("aggressive", "advance")).toBeGreaterThan(1);
    expect(stratMod("aggressive", "walk")).toBeLessThan(1);
  });

  it("patient boosts walk; reduces steal and strikeout", () => {
    expect(stratMod("patient", "walk")).toBeGreaterThan(1);
    expect(stratMod("patient", "steal")).toBeLessThan(1);
    expect(stratMod("patient", "strikeout")).toBeLessThan(1);
  });

  it("contact reduces strikeout and homerun; boosts contact", () => {
    expect(stratMod("contact", "strikeout")).toBeLessThan(1);
    expect(stratMod("contact", "homerun")).toBeLessThan(1);
    expect(stratMod("contact", "contact")).toBeGreaterThan(1);
  });

  it("power boosts homerun greatly; reduces contact", () => {
    expect(stratMod("power", "homerun")).toBeGreaterThan(1.5);
    expect(stratMod("power", "contact")).toBeLessThan(1);
  });

  it("all strategies return finite numbers for all stats", () => {
    strategies.forEach(strat =>
      stats.forEach(stat => expect(Number.isFinite(stratMod(strat, stat))).toBe(true))
    );
  });

  it("exact values: aggressive steal = 1.3", () => expect(stratMod("aggressive", "steal")).toBe(1.3));
  it("exact values: patient walk = 1.4", () => expect(stratMod("patient", "walk")).toBe(1.4));
  it("exact values: power homerun = 1.6", () => expect(stratMod("power", "homerun")).toBe(1.6));
  it("exact values: contact strikeout = 0.7", () => expect(stratMod("contact", "strikeout")).toBe(0.7));
});

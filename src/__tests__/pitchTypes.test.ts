/**
 * Tests for src/constants/pitchTypes.ts
 */
import { describe, it, expect } from "vitest";
import {
  selectPitchType,
  pitchSwingRateMod,
  pitchStrikeZoneMod,
  pitchName,
} from "../constants/pitchTypes";
import type { PitchType } from "../constants/pitchTypes";

describe("selectPitchType – 0-2 count (expand zone with breaking balls)", () => {
  it("roll < 35 → slider", () => {
    expect(selectPitchType(0, 2, 10)).toBe("slider");
    expect(selectPitchType(0, 2, 34)).toBe("slider");
  });
  it("35 ≤ roll < 65 → curveball", () => {
    expect(selectPitchType(0, 2, 35)).toBe("curveball");
    expect(selectPitchType(0, 2, 64)).toBe("curveball");
  });
  it("65 ≤ roll < 80 → changeup", () => {
    expect(selectPitchType(0, 2, 65)).toBe("changeup");
    expect(selectPitchType(0, 2, 79)).toBe("changeup");
  });
  it("roll ≥ 80 → fastball", () => {
    expect(selectPitchType(0, 2, 80)).toBe("fastball");
    expect(selectPitchType(0, 2, 99)).toBe("fastball");
  });
});

describe("selectPitchType – 3-0 count (pitcher needs a strike)", () => {
  it("roll < 65 → fastball", () => {
    expect(selectPitchType(3, 0, 0)).toBe("fastball");
    expect(selectPitchType(3, 0, 64)).toBe("fastball");
  });
  it("65 ≤ roll < 82 → curveball", () => {
    expect(selectPitchType(3, 0, 65)).toBe("curveball");
    expect(selectPitchType(3, 0, 81)).toBe("curveball");
  });
  it("82 ≤ roll < 93 → changeup", () => {
    expect(selectPitchType(3, 0, 82)).toBe("changeup");
  });
  it("roll ≥ 93 → slider", () => {
    expect(selectPitchType(3, 0, 93)).toBe("slider");
    expect(selectPitchType(3, 0, 99)).toBe("slider");
  });
});

describe("selectPitchType – full count (3-2)", () => {
  it("roll < 45 → fastball", () => expect(selectPitchType(3, 2, 20)).toBe("fastball"));
  it("45 ≤ roll < 75 → slider", () => expect(selectPitchType(3, 2, 60)).toBe("slider"));
  it("roll ≥ 75 → curveball", () => expect(selectPitchType(3, 2, 90)).toBe("curveball"));
});

describe("selectPitchType – default / early count", () => {
  it("roll < 55 → fastball", () => expect(selectPitchType(1, 1, 30)).toBe("fastball"));
  it("55 ≤ roll < 75 → curveball", () => expect(selectPitchType(1, 1, 60)).toBe("curveball"));
  it("75 ≤ roll < 90 → slider", () => expect(selectPitchType(1, 1, 80)).toBe("slider"));
  it("roll ≥ 90 → changeup", () => expect(selectPitchType(1, 1, 95)).toBe("changeup"));
});

describe("pitchSwingRateMod", () => {
  it("fastball: 1.0 (baseline)", () => expect(pitchSwingRateMod("fastball")).toBe(1.00));
  it("curveball: 0.9 (harder to pick up)", () => expect(pitchSwingRateMod("curveball")).toBe(0.90));
  it("slider: 1.1 (induces chases)", () => expect(pitchSwingRateMod("slider")).toBe(1.10));
  it("changeup: 1.05 (batter out in front)", () => expect(pitchSwingRateMod("changeup")).toBe(1.05));
  it("all values are positive numbers", () => {
    const types: PitchType[] = ["fastball", "curveball", "slider", "changeup"];
    types.forEach(t => expect(pitchSwingRateMod(t)).toBeGreaterThan(0));
  });
});

describe("pitchStrikeZoneMod", () => {
  it("fastball: 1.0 (full zone)", () => expect(pitchStrikeZoneMod("fastball")).toBe(1.00));
  it("curveball: 0.85 (breaks out of zone)", () => expect(pitchStrikeZoneMod("curveball")).toBe(0.85));
  it("slider: 0.75 (lowest zone probability)", () => expect(pitchStrikeZoneMod("slider")).toBe(0.75));
  it("changeup: 0.90", () => expect(pitchStrikeZoneMod("changeup")).toBe(0.90));
  it("slider has lowest zone mod of all pitch types", () => {
    const types: PitchType[] = ["fastball", "curveball", "changeup"];
    types.forEach(t => expect(pitchStrikeZoneMod("slider")).toBeLessThan(pitchStrikeZoneMod(t)));
  });
});

describe("pitchName", () => {
  it("returns human-readable display names", () => {
    expect(pitchName("fastball")).toBe("Fastball");
    expect(pitchName("curveball")).toBe("Curveball");
    expect(pitchName("slider")).toBe("Slider");
    expect(pitchName("changeup")).toBe("Changeup");
  });
});

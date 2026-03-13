import { describe, expect, it } from "vitest";

import {
  buildHandednessMatchup,
  deterministicHandednessForPlayerId,
  getHandednessOutcomeModifiers,
  getMatchupBucket,
  resolveEffectiveBatterSide,
  resolvePitcherHandedness,
  resolvePlayerHandedness,
} from "./handednessMatchup";

describe("handednessMatchup", () => {
  it("resolves switch hitters to opposite side of pitcher", () => {
    expect(resolveEffectiveBatterSide("S", "R")).toBe("L");
    expect(resolveEffectiveBatterSide("S", "L")).toBe("R");
  });

  it("returns required matchup buckets", () => {
    expect(getMatchupBucket("R", "R")).toBe("R_R");
    expect(getMatchupBucket("R", "L")).toBe("R_L");
    expect(getMatchupBucket("L", "R")).toBe("L_R");
    expect(getMatchupBucket("L", "L")).toBe("L_L");
    expect(getMatchupBucket("S", "R")).toBe("S_R");
    expect(getMatchupBucket("S", "L")).toBe("S_L");
  });

  it("builds complete matchup context", () => {
    const matchup = buildHandednessMatchup("S", "R");
    expect(matchup).toEqual({
      batterHandedness: "S",
      pitcherHandedness: "R",
      effectiveBatterSide: "L",
      bucket: "S_R",
    });
  });

  it("returns batter-favored outcome modifiers for opposite-side matchups", () => {
    const modifiers = getHandednessOutcomeModifiers(buildHandednessMatchup("L", "R"));
    expect(modifiers.walkRateMultiplier).toBeGreaterThan(1);
    expect(modifiers.whiffRateMultiplier).toBeLessThan(1);
    expect(modifiers.hardContactMultiplier).toBeGreaterThan(1);
    expect(modifiers.promptDeltaPct).toBeGreaterThan(0);
  });

  it("returns pitcher-favored outcome modifiers for same-side matchups", () => {
    const modifiers = getHandednessOutcomeModifiers(buildHandednessMatchup("R", "R"));
    expect(modifiers.walkRateMultiplier).toBeLessThan(1);
    expect(modifiers.whiffRateMultiplier).toBeGreaterThan(1);
    expect(modifiers.hardContactMultiplier).toBeLessThan(1);
    expect(modifiers.promptDeltaPct).toBeLessThan(0);
  });

  it("applies stronger walk support in opposite-side buckets than same-side buckets", () => {
    const sameSide = getHandednessOutcomeModifiers(buildHandednessMatchup("R", "R"));
    const oppositeSide = getHandednessOutcomeModifiers(buildHandednessMatchup("L", "R"));

    expect(oppositeSide.walkRateMultiplier).toBeGreaterThan(sameSide.walkRateMultiplier);
    expect(oppositeSide.calledStrikeRateMultiplier).toBeLessThan(
      sameSide.calledStrikeRateMultiplier,
    );
    expect(oppositeSide.whiffRateMultiplier).toBeLessThan(sameSide.whiffRateMultiplier);
  });

  it("maps switch-hitter vs RHP modifiers to the left-handed profile", () => {
    const switchVsRight = getHandednessOutcomeModifiers(buildHandednessMatchup("S", "R"));
    const leftVsRight = getHandednessOutcomeModifiers(buildHandednessMatchup("L", "R"));
    expect(switchVsRight).toEqual(leftVsRight);
  });

  it("uses explicit handedness when provided", () => {
    expect(resolvePlayerHandedness("L", "player-1")).toBe("L");
  });

  it("uses deterministic fallback when handedness missing", () => {
    const one = resolvePlayerHandedness(undefined, "player-abc");
    const two = resolvePlayerHandedness(undefined, "player-abc");
    expect(one).toBe(two);
  });

  it("normalizes switch-handed pitchers to right-handed throw side", () => {
    expect(resolvePitcherHandedness("S", "p1")).toBe("R");
  });

  it("deterministic handedness function is stable", () => {
    expect(deterministicHandednessForPlayerId("same-id")).toBe(
      deterministicHandednessForPlayerId("same-id"),
    );
  });
});

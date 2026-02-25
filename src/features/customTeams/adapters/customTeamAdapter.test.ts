import { describe, expect, it } from "vitest";

import type { CustomTeamDoc } from "@storage/types";

import {
  customTeamToAbbreviation,
  customTeamToDisplayName,
  customTeamToGameId,
  customTeamToLineupOrder,
  customTeamToPlayerOverrides,
  resolveTeamLabel,
} from "./customTeamAdapter";

const makeTeam = (overrides: Partial<CustomTeamDoc> = {}): CustomTeamDoc => ({
  id: "ct_test_001",
  schemaVersion: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  name: "Eagles",
  city: "Austin",
  source: "custom",
  roster: {
    schemaVersion: 1,
    lineup: [
      {
        id: "p1",
        name: "Tom Adams",
        role: "batter",
        batting: { contact: 70, power: 65, speed: 60 },
      },
      {
        id: "p2",
        name: "Jake Baker",
        role: "batter",
        batting: { contact: 55, power: 80, speed: 50 },
      },
    ],
    bench: [
      {
        id: "p3",
        name: "Sam Cole",
        role: "batter",
        batting: { contact: 50, power: 50, speed: 50 },
      },
    ],
    pitchers: [
      {
        id: "p4",
        name: "Ray Davis",
        role: "pitcher",
        batting: { contact: 30, power: 25, speed: 30 },
        pitching: { velocity: 75, control: 65, movement: 70 },
      },
    ],
  },
  metadata: { archived: false },
  ...overrides,
});

describe("customTeamToGameId", () => {
  it("prefixes the team id with custom:", () => {
    expect(customTeamToGameId(makeTeam())).toBe("custom:ct_test_001");
  });

  it("is stable across calls", () => {
    const t = makeTeam();
    expect(customTeamToGameId(t)).toBe(customTeamToGameId(t));
  });
});

describe("customTeamToDisplayName", () => {
  it("returns city + name when city is set", () => {
    expect(customTeamToDisplayName(makeTeam())).toBe("Austin Eagles");
  });

  it("returns just name when city is absent", () => {
    expect(customTeamToDisplayName(makeTeam({ city: undefined }))).toBe("Eagles");
  });
});

describe("customTeamToLineupOrder", () => {
  it("returns the lineup player IDs in order", () => {
    expect(customTeamToLineupOrder(makeTeam())).toEqual(["p1", "p2"]);
  });
});

describe("customTeamToPlayerOverrides", () => {
  it("includes all players (lineup + bench + pitchers)", () => {
    const overrides = customTeamToPlayerOverrides(makeTeam());
    expect(Object.keys(overrides).sort()).toEqual(["p1", "p2", "p3", "p4"]);
  });

  it("sets nickname to player name", () => {
    const overrides = customTeamToPlayerOverrides(makeTeam());
    expect(overrides["p1"].nickname).toBe("Tom Adams");
  });

  it("converts stats 70 contact to +10 modifier (closest to 70-60=10)", () => {
    const overrides = customTeamToPlayerOverrides(makeTeam());
    expect(overrides["p1"].contactMod).toBe(10);
  });

  it("includes pitching mods for pitchers", () => {
    const overrides = customTeamToPlayerOverrides(makeTeam());
    expect(overrides["p4"].velocityMod).toBeDefined();
    expect(overrides["p4"].controlMod).toBeDefined();
  });

  it("does not include pitching mods for batters", () => {
    const overrides = customTeamToPlayerOverrides(makeTeam());
    expect(overrides["p1"].velocityMod).toBeUndefined();
  });
});

describe("customTeamToAbbreviation", () => {
  it("returns stored abbreviation for a custom team game ID", () => {
    const teams = [{ ...makeTeam(), id: "ct_abc", abbreviation: "EAG" }];
    expect(customTeamToAbbreviation("custom:ct_abc", teams)).toBe("EAG");
  });

  it("falls back to first-3-chars of team name when abbreviation is missing", () => {
    const teams = [{ ...makeTeam(), id: "ct_abc", name: "Eagles", abbreviation: undefined }];
    expect(customTeamToAbbreviation("custom:ct_abc", teams)).toBe("EAG");
  });

  it("returns undefined for a non-custom (MLB-style) team string", () => {
    expect(customTeamToAbbreviation("New York Yankees", [])).toBeUndefined();
  });

  it("returns undefined when the custom team ID is not found in the list", () => {
    expect(customTeamToAbbreviation("custom:missing", [])).toBeUndefined();
  });
});

describe("resolveTeamLabel", () => {
  it("returns MLB team name unchanged for non-custom team strings", () => {
    expect(resolveTeamLabel("New York Yankees", [])).toBe("New York Yankees");
  });

  it("returns full display name (City + Name) for a known custom team", () => {
    const teams = [{ ...makeTeam(), id: "ct_abc", city: "Austin", name: "Eagles" }];
    expect(resolveTeamLabel("custom:ct_abc", teams)).toBe("Austin Eagles");
  });

  it("returns just team name when custom team has no city", () => {
    const teams = [{ ...makeTeam(), id: "ct_abc", city: "", name: "Eagles" }];
    expect(resolveTeamLabel("custom:ct_abc", teams)).toBe("Eagles");
  });

  it("returns safe short fallback (not raw ID) for unknown custom team ID", () => {
    const result = resolveTeamLabel("custom:ct_unknown123", []);
    expect(result).not.toContain("custom:");
    expect(result.length).toBeLessThanOrEqual(8);
  });
});

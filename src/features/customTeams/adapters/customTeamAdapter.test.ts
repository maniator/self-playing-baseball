import { describe, expect, it } from "vitest";

import type { CustomTeamDoc } from "@storage/types";

import {
  customTeamToAbbreviation,
  customTeamToBenchRoster,
  customTeamToDisplayName,
  customTeamToGameId,
  customTeamToLineupOrder,
  customTeamToPitcherRoster,
  customTeamToPlayerOverrides,
  resolveCustomIdsInString,
  resolveTeamLabel,
  validateCustomTeamForGame,
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

describe("customTeamToBenchRoster", () => {
  it("returns bench player IDs in order", () => {
    expect(customTeamToBenchRoster(makeTeam())).toEqual(["p3"]);
  });

  it("returns empty array when bench is empty", () => {
    const team = makeTeam({
      roster: { ...makeTeam().roster, bench: [] },
    });
    expect(customTeamToBenchRoster(team)).toEqual([]);
  });
});

describe("customTeamToPitcherRoster", () => {
  it("returns pitcher IDs in order", () => {
    expect(customTeamToPitcherRoster(makeTeam())).toEqual(["p4"]);
  });

  it("returns empty array when pitchers is empty", () => {
    const team = makeTeam({
      roster: { ...makeTeam().roster, pitchers: [] },
    });
    expect(customTeamToPitcherRoster(team)).toEqual([]);
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

  it("includes movementMod for pitchers with non-default movement", () => {
    const overrides = customTeamToPlayerOverrides(makeTeam());
    // p4 has movement: 70 → offset = 70 - 60 = 10 → movementMod = 10
    expect(overrides["p4"].movementMod).toBe(10);
  });

  it("does not include pitching mods for batters", () => {
    const overrides = customTeamToPlayerOverrides(makeTeam());
    expect(overrides["p1"].velocityMod).toBeUndefined();
  });

  it("includes position in override when player has a position set", () => {
    const team = makeTeam({
      roster: {
        schemaVersion: 1,
        lineup: [
          {
            id: "p1",
            name: "Tom Adams",
            role: "batter",
            position: "C",
            batting: { contact: 70, power: 65, speed: 60 },
          },
        ],
        bench: [],
        pitchers: [],
      },
    });
    const overrides = customTeamToPlayerOverrides(team);
    expect(overrides["p1"].position).toBe("C");
  });

  it("omits position in override when player has no position set", () => {
    const overrides = customTeamToPlayerOverrides(makeTeam());
    expect(overrides["p1"].position).toBeUndefined();
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

  it("resolves a custom team ID that contains hyphens", () => {
    const teams = [{ ...makeTeam(), id: "ct-hyphen-id", city: "Test", name: "Rockets" }];
    expect(resolveTeamLabel("custom:ct-hyphen-id", teams)).toBe("Test Rockets");
  });
});

describe("resolveCustomIdsInString", () => {
  it("replaces a single custom: token with the team display name", () => {
    const teams = [{ ...makeTeam(), id: "ct_abc", city: "Austin", name: "Eagles" }];
    expect(resolveCustomIdsInString("custom:ct_abc hit a single", teams)).toBe(
      "Austin Eagles hit a single",
    );
  });

  it("replaces multiple custom: tokens in the same string", () => {
    const teams = [
      { ...makeTeam(), id: "ct_home", city: "Dallas", name: "Stars" },
      { ...makeTeam(), id: "ct_away", city: "Boston", name: "Reds" },
    ];
    const result = resolveCustomIdsInString("custom:ct_away at custom:ct_home", teams);
    expect(result).toBe("Boston Reds at Dallas Stars");
  });

  it("leaves non-custom strings unchanged", () => {
    expect(resolveCustomIdsInString("New York Yankees hit a homer", [])).toBe(
      "New York Yankees hit a homer",
    );
  });

  it("never emits raw custom: prefix for unknown IDs", () => {
    const result = resolveCustomIdsInString("Team custom:ct_unknown123 scored", []);
    expect(result).not.toContain("custom:");
    expect(result).not.toContain("ct_unknown");
  });

  it("returns a safe short fallback for unknown IDs (not the full internal ID)", () => {
    const result = resolveCustomIdsInString("custom:ct_verylongidthatshouldbetrimmed scored", []);
    // The unknown-id fallback must not exceed 8 chars
    const replacedPart = result.replace(" scored", "").trim();
    expect(replacedPart.length).toBeLessThanOrEqual(8);
  });

  it("handles empty string without error", () => {
    expect(resolveCustomIdsInString("", [])).toBe("");
  });

  it("handles a string with no tokens without error", () => {
    expect(resolveCustomIdsInString("no tokens here", [])).toBe("no tokens here");
  });
});

const FULL_LINEUP_POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];
const makeFullLineup = () =>
  FULL_LINEUP_POSITIONS.map((pos, i) => ({
    id: `pl_${i}`,
    name: `Player ${i + 1}`,
    role: "batter" as const,
    batting: { contact: 50, power: 50, speed: 50 },
    position: pos,
  }));

const makeValidTeam = (overrides: Partial<CustomTeamDoc> = {}): CustomTeamDoc => ({
  ...makeTeam(),
  roster: {
    schemaVersion: 1,
    lineup: makeFullLineup(),
    bench: [],
    pitchers: [
      {
        id: "sp1",
        name: "Ace Pitcher",
        role: "pitcher",
        batting: { contact: 30, power: 25, speed: 30 },
        pitching: { velocity: 75, control: 65, movement: 70 },
      },
    ],
  },
  ...overrides,
});

describe("validateCustomTeamForGame", () => {
  it("returns null for a valid team with all 9 lineup positions", () => {
    expect(validateCustomTeamForGame(makeValidTeam())).toBeNull();
  });

  it("returns error when lineup has a duplicate position", () => {
    const lineup = makeFullLineup();
    // Replace DH with a second C (duplicate C, missing DH)
    lineup[8] = { ...lineup[8], position: "C" };
    const team = makeValidTeam({
      roster: { ...makeValidTeam().roster, lineup },
    });
    const err = validateCustomTeamForGame(team);
    expect(err).toBeTruthy();
    expect(err).toContain("C");
    expect(err).toContain("duplicate");
  });

  it("returns error when lineup is missing a required position", () => {
    const lineup = makeFullLineup().slice(0, 8); // drop DH
    const team = makeValidTeam({
      roster: { ...makeValidTeam().roster, lineup },
    });
    const err = validateCustomTeamForGame(team);
    expect(err).toBeTruthy();
    expect(err).toContain("DH");
    expect(err).toContain("missing");
  });

  it("reports all duplicate positions when multiple are duplicated", () => {
    const lineup = makeFullLineup();
    lineup[7] = { ...lineup[7], position: "C" }; // RF slot → C (second C)
    lineup[8] = { ...lineup[8], position: "SS" }; // DH slot → SS (second SS)
    const team = makeValidTeam({
      roster: { ...makeValidTeam().roster, lineup },
    });
    const err = validateCustomTeamForGame(team);
    expect(err).toContain("C");
    expect(err).toContain("SS");
  });

  it("reports all missing positions when multiple are absent", () => {
    // Lineup with only C and 1B (7 required positions missing)
    const lineup = [
      {
        id: "p_a",
        name: "Player A",
        role: "batter" as const,
        batting: { contact: 50, power: 50, speed: 50 },
        position: "C",
      },
      {
        id: "p_b",
        name: "Player B",
        role: "batter" as const,
        batting: { contact: 50, power: 50, speed: 50 },
        position: "1B",
      },
    ];
    const team = makeValidTeam({
      roster: { ...makeValidTeam().roster, lineup },
    });
    const err = validateCustomTeamForGame(team);
    expect(err).toContain("2B");
    expect(err).toContain("3B");
    expect(err).toContain("SS");
  });
});

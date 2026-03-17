import { describe, expect, it } from "vitest";

import type { CreateCustomTeamInput } from "@storage/types";

import { buildNewTeamDoc } from "./customTeamDocBuilder";
import { buildTeamFingerprint } from "./customTeamSignatures";

// ── Fixtures ────────────────────────────────────────────────────────────────

const makeInput = (overrides: Partial<CreateCustomTeamInput> = {}): CreateCustomTeamInput => ({
  name: "Test Team",
  roster: { lineup: [], bench: [], pitchers: [] },
  ...overrides,
});

// ── buildNewTeamDoc ───────────────────────────────────────────────────────────

describe("buildNewTeamDoc", () => {
  it("returns a doc with the provided id", () => {
    const doc = buildNewTeamDoc(makeInput(), "ct_abc123");
    expect(doc.id).toBe("ct_abc123");
    expect("teamSeed" in doc).toBe(false);
  });

  it("sets createdAt and updatedAt to the current ISO timestamp", () => {
    const before = Date.now();
    const doc = buildNewTeamDoc(makeInput(), "ct_ts");
    const after = Date.now();
    const createdAt = new Date(doc.createdAt).getTime();
    const updatedAt = new Date(doc.updatedAt).getTime();
    expect(createdAt).toBeGreaterThanOrEqual(before);
    expect(createdAt).toBeLessThanOrEqual(after);
    expect(updatedAt).toBeGreaterThanOrEqual(before);
    expect(updatedAt).toBeLessThanOrEqual(after);
    expect(doc.createdAt).toBe(doc.updatedAt);
  });

  it("sets schemaVersion to 1", () => {
    const doc = buildNewTeamDoc(makeInput(), "ct_sv");
    expect(doc.schemaVersion).toBe(1);
  });

  it("sanitizes abbreviation via sanitizeAbbreviation (trims and uppercases)", () => {
    const doc = buildNewTeamDoc(makeInput({ abbreviation: " roc " }), "ct_abbr");
    expect(doc.abbreviation).toBe("ROC");
  });

  it("does not include abbreviation when input.abbreviation is omitted", () => {
    const doc = buildNewTeamDoc(makeInput(), "ct_no_abbr");
    expect("abbreviation" in doc).toBe(false);
  });

  it("sets nameLowercase from input.name", () => {
    const doc = buildNewTeamDoc(makeInput({ name: "Test Team" }), "ct_src");
    expect(doc.nameLowercase).toBe("test team");
  });

  it("lowercases nameLowercase regardless of input casing", () => {
    const doc = buildNewTeamDoc(makeInput({ name: "UPPER CASE" }), "ct_gen_src");
    expect(doc.nameLowercase).toBe("upper case");
  });

  it("sets metadata.archived to false when not provided", () => {
    const doc = buildNewTeamDoc(makeInput(), "ct_arch_false");
    expect(doc.metadata.archived).toBe(false);
  });

  it("sets metadata.archived to true when provided", () => {
    const doc = buildNewTeamDoc(makeInput({ metadata: { archived: true } }), "ct_arch_true");
    expect(doc.metadata.archived).toBe(true);
  });

  it("includes statsProfile when provided", () => {
    const doc = buildNewTeamDoc(makeInput({ statsProfile: "aggressive" }), "ct_stats");
    expect(doc.statsProfile).toBe("aggressive");
  });

  it("omits statsProfile when not provided", () => {
    const doc = buildNewTeamDoc(makeInput(), "ct_no_stats");
    expect("statsProfile" in doc).toBe(false);
  });

  it("does not embed roster (players live in players collection)", () => {
    const doc = buildNewTeamDoc(makeInput(), "ct_roster");
    expect((doc as unknown as Record<string, unknown>)["roster"]).toBeUndefined();
  });

  it("computes and sets fingerprint via buildTeamFingerprint", () => {
    const doc = buildNewTeamDoc(
      makeInput({ name: "Fingerprint FC", abbreviation: "FFC" }),
      "ct_fp",
    );
    expect(typeof doc.fingerprint).toBe("string");
    expect(doc.fingerprint).toMatch(/^[0-9a-f]{8}$/);
    // The fingerprint must match what buildTeamFingerprint would compute
    const expected = buildTeamFingerprint(doc);
    expect(doc.fingerprint).toBe(expected);
  });

  it("includes name from input", () => {
    const doc = buildNewTeamDoc(makeInput({ name: "River City Rockets" }), "ct_name");
    expect(doc.name).toBe("River City Rockets");
  });

  it("includes optional nickname, city, and slug when provided", () => {
    const doc = buildNewTeamDoc(
      makeInput({ nickname: "Rockets", city: "River City", slug: "river-city-rockets" }),
      "ct_extras",
    );
    expect(doc.nickname).toBe("Rockets");
    expect(doc.city).toBe("River City");
    expect(doc.slug).toBe("river-city-rockets");
  });

  it("omits optional nickname, city, and slug when not provided", () => {
    const doc = buildNewTeamDoc(makeInput(), "ct_no_extras");
    expect("nickname" in doc).toBe(false);
    expect("city" in doc).toBe(false);
    expect("slug" in doc).toBe(false);
  });
});

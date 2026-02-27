import { describe, expect, it } from "vitest";

import { generatePlayerId, generateSaveId, generateTeamId } from "./generateId";

describe("generateTeamId", () => {
  it("starts with ct_ prefix", () => {
    expect(generateTeamId()).toMatch(/^ct_/);
  });

  it("is unique across calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateTeamId()));
    expect(ids.size).toBe(100);
  });

  it("contains only URL-safe characters after prefix", () => {
    const id = generateTeamId();
    expect(id.slice(3)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("stays within RxDB schema maxLength of 128", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateTeamId().length).toBeLessThanOrEqual(128);
    }
  });
});

describe("generatePlayerId", () => {
  it("starts with p_ prefix", () => {
    expect(generatePlayerId()).toMatch(/^p_/);
  });

  it("is unique across calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generatePlayerId()));
    expect(ids.size).toBe(100);
  });
});

describe("generateSaveId", () => {
  it("starts with save_ prefix", () => {
    expect(generateSaveId()).toMatch(/^save_/);
  });

  it("is unique across calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSaveId()));
    expect(ids.size).toBe(100);
  });

  it("stays within RxDB schema maxLength of 128", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateSaveId().length).toBeLessThanOrEqual(128);
    }
  });
});

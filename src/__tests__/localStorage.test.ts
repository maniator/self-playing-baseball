import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadBool, loadInt, loadFloat, loadString } from "../utilities/localStorage";

describe("loadBool", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns true when stored value is "true"', () => {
    localStorage.setItem("key", "true");
    expect(loadBool("key", false)).toBe(true);
  });

  it('returns false when stored value is "false"', () => {
    localStorage.setItem("key", "false");
    expect(loadBool("key", true)).toBe(false);
  });

  it("returns fallback when key is missing", () => {
    expect(loadBool("missing", true)).toBe(true);
    expect(loadBool("missing2", false)).toBe(false);
  });
});

describe("loadInt", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("returns parsed integer when key exists", () => {
    localStorage.setItem("key", "42");
    expect(loadInt("key", 0)).toBe(42);
  });

  it("returns fallback when key is missing", () => {
    expect(loadInt("missing", 99)).toBe(99);
  });
});

describe("loadFloat", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("returns parsed float when key exists", () => {
    localStorage.setItem("key", "0.5");
    expect(loadFloat("key", 1)).toBe(0.5);
  });

  it("returns fallback when key is missing", () => {
    expect(loadFloat("missing", 0.8)).toBe(0.8);
  });

  it("returns fallback when stored value is NaN", () => {
    localStorage.setItem("key", "notanumber");
    expect(loadFloat("key", 0.3)).toBe(0.3);
  });

  it("clamps value greater than 1 to 1", () => {
    localStorage.setItem("key", "1.5");
    expect(loadFloat("key", 0.5)).toBe(1);
  });

  it("clamps value less than 0 to 0", () => {
    localStorage.setItem("key", "-0.5");
    expect(loadFloat("key", 0.5)).toBe(0);
  });
});

describe("loadString", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("returns stored string when key exists", () => {
    localStorage.setItem("key", "foo");
    expect(loadString("key", "bar")).toBe("foo");
  });

  it("returns fallback when key is missing", () => {
    expect(loadString("missing", "default")).toBe("default");
  });
});

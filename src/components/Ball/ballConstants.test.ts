import { describe, it, expect } from "vitest";
import { hitDistances } from "./constants";
import { Hit } from "@constants/hitTypes";

describe("hitDistances", () => {
  it("Walk distance is 0", () => {
    expect(hitDistances[Hit.Walk]).toBe(0);
  });

  it("Single < Double < Triple < Homerun", () => {
    expect(hitDistances[Hit.Single]).toBeLessThan(hitDistances[Hit.Double]);
    expect(hitDistances[Hit.Double]).toBeLessThan(hitDistances[Hit.Triple]);
    expect(hitDistances[Hit.Triple]).toBeLessThan(hitDistances[Hit.Homerun]);
  });

  it("all values are numbers", () => {
    for (const val of Object.values(hitDistances)) {
      expect(typeof val).toBe("number");
    }
  });
});

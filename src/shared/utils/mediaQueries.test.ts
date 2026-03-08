import { describe, expect, it } from "vitest";

import { breakpoints, mq } from "./mediaQueries";

describe("breakpoints", () => {
  it("mobile is 768", () => {
    expect(breakpoints.mobile).toBe(768);
  });

  it("desktop is 1024", () => {
    expect(breakpoints.desktop).toBe(1024);
  });
});

describe("mq", () => {
  it("mobile uses max-width with the mobile breakpoint", () => {
    expect(mq.mobile).toBe(`@media (max-width: ${breakpoints.mobile}px)`);
  });

  it("desktop uses min-width with the desktop breakpoint", () => {
    expect(mq.desktop).toBe(`@media (min-width: ${breakpoints.desktop}px)`);
  });

  it("tablet sits between mobile and desktop breakpoints", () => {
    expect(mq.tablet).toBe(
      `@media (min-width: ${breakpoints.mobile + 1}px) and (max-width: ${breakpoints.desktop - 1}px)`,
    );
  });

  it("notMobile uses min-width above the mobile breakpoint", () => {
    expect(mq.notMobile).toBe(`@media (min-width: ${breakpoints.mobile + 1}px)`);
  });

  it("mobile upper bound is below desktop lower bound", () => {
    expect(breakpoints.mobile).toBeLessThan(breakpoints.desktop);
  });
});

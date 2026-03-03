import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGameRefs } from "./useGameRefs";

describe("useGameRefs", () => {
  it("returns skipDecision false initially", () => {
    const { result } = renderHook(() =>
      useGameRefs({
        strikes: 0,
        balls: 0,
        pendingDecision: null,
      }),
    );
    expect(result.current.skipDecision).toBe(false);
  });

  it("sets skipDecision when pendingDecision transitions null→non-null→null", () => {
    const pending = { kind: "bunt" as const };
    const { result, rerender } = renderHook(
      ({ pd }) =>
        useGameRefs({
          strikes: 0,
          balls: 0,
          pendingDecision: pd,
        }),
      { initialProps: { pd: null as typeof pending | null } },
    );
    expect(result.current.skipDecision).toBe(false);
    rerender({ pd: pending });
    rerender({ pd: null });
    expect(result.current.skipDecision).toBe(true);
  });

  it("skipDecision persists across pitches (not reset after one pitch)", () => {
    const pending = { kind: "bunt" as const };
    const { result, rerender } = renderHook(
      ({ pd, strikes, balls }) =>
        useGameRefs({
          strikes,
          balls,
          pendingDecision: pd,
        }),
      { initialProps: { pd: null as typeof pending | null, strikes: 1, balls: 0 } },
    );
    rerender({ pd: pending, strikes: 1, balls: 0 });
    rerender({ pd: null, strikes: 1, balls: 0 });
    expect(result.current.skipDecision).toBe(true);
    rerender({ pd: null, strikes: 2, balls: 0 });
    expect(result.current.skipDecision).toBe(true);
  });

  it("skipDecision resets to false when new batter detected (count back to 0-0)", () => {
    const pending = { kind: "bunt" as const };
    const { result, rerender } = renderHook(
      ({ pd, strikes, balls }) =>
        useGameRefs({
          strikes,
          balls,
          pendingDecision: pd,
        }),
      { initialProps: { pd: null as typeof pending | null, strikes: 1, balls: 0 } },
    );
    rerender({ pd: pending, strikes: 1, balls: 0 });
    rerender({ pd: null, strikes: 1, balls: 0 });
    expect(result.current.skipDecision).toBe(true);
    rerender({ pd: null, strikes: 0, balls: 0 });
    expect(result.current.skipDecision).toBe(false);
  });
});

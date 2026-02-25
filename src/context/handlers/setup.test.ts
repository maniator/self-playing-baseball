/**
 * Targeted tests for src/context/handlers/setup.ts
 *
 * Verifies that:
 * - non-setup actions return undefined (sentinel)
 * - setTeams with an array payload updates team names
 * - setTeams with an object payload updates teams + optional playerOverrides + lineupOrder
 */

import { describe, expect, it } from "vitest";

import { makeState } from "@test/testHelpers";

import { handleSetupAction } from "./setup";

// ---------------------------------------------------------------------------
// Sentinel: non-setup actions return undefined
// ---------------------------------------------------------------------------

describe("handleSetupAction — non-setup actions return undefined", () => {
  it("returns undefined for 'reset'", () => {
    expect(handleSetupAction(makeState(), { type: "reset" })).toBeUndefined();
  });
  it("returns undefined for 'hit'", () => {
    expect(handleSetupAction(makeState(), { type: "hit" })).toBeUndefined();
  });
  it("returns undefined for 'nextInning'", () => {
    expect(handleSetupAction(makeState(), { type: "nextInning" })).toBeUndefined();
  });
  it("returns undefined for unknown action types", () => {
    expect(handleSetupAction(makeState(), { type: "__unknown__" })).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// setTeams — array payload
// ---------------------------------------------------------------------------

describe("handleSetupAction — setTeams (array payload)", () => {
  it("updates team names", () => {
    const state = makeState({ teams: ["A", "B"] });
    const next = handleSetupAction(state, { type: "setTeams", payload: ["Yankees", "Red Sox"] });
    expect(next?.teams).toEqual(["Yankees", "Red Sox"]);
  });

  it("does not change other state fields", () => {
    const state = makeState({ score: [3, 2], outs: 1 });
    const next = handleSetupAction(state, { type: "setTeams", payload: ["X", "Y"] });
    expect(next?.score).toEqual([3, 2]);
    expect(next?.outs).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// setTeams — object payload
// ---------------------------------------------------------------------------

describe("handleSetupAction — setTeams (object payload)", () => {
  it("updates teams from object payload", () => {
    const state = makeState({ teams: ["A", "B"] });
    const next = handleSetupAction(state, {
      type: "setTeams",
      payload: { teams: ["Cubs", "Sox"] },
    });
    expect(next?.teams).toEqual(["Cubs", "Sox"]);
  });

  it("applies playerOverrides when provided", () => {
    const overrides = [{ pitcher1: { nickname: "Ace" } }, {}] as [
      Record<string, object>,
      Record<string, object>,
    ];
    const state = makeState();
    const next = handleSetupAction(state, {
      type: "setTeams",
      payload: { teams: ["A", "B"], playerOverrides: overrides as never },
    });
    expect(next?.playerOverrides).toEqual(overrides);
  });

  it("applies lineupOrder when provided", () => {
    const lineup: [string[], string[]] = [
      ["p1", "p2"],
      ["p3", "p4"],
    ];
    const state = makeState();
    const next = handleSetupAction(state, {
      type: "setTeams",
      payload: { teams: ["A", "B"], lineupOrder: lineup },
    });
    expect(next?.lineupOrder).toEqual(lineup);
  });

  it("omits playerOverrides from result when not provided", () => {
    const originalOverrides = makeState().playerOverrides;
    const state = makeState();
    const next = handleSetupAction(state, {
      type: "setTeams",
      payload: { teams: ["A", "B"] },
    });
    // playerOverrides should remain unchanged (not reset)
    expect(next?.playerOverrides).toEqual(originalOverrides);
  });

  it("computes lineupPositions from lineupOrder + playerOverrides positions", () => {
    const state = makeState();
    const next = handleSetupAction(state, {
      type: "setTeams",
      payload: {
        teams: ["A", "B"],
        lineupOrder: [
          ["p1", "p2"],
          ["p3", "p4"],
        ] as [string[], string[]],
        playerOverrides: [
          { p1: { position: "SS" }, p2: { position: "CF" } },
          { p3: { position: "1B" }, p4: { position: "LF" } },
        ] as never,
      },
    });
    expect(next?.lineupPositions).toEqual([
      ["SS", "CF"],
      ["1B", "LF"],
    ]);
  });

  it("lineupPositions entries default to empty string when position is absent", () => {
    const state = makeState();
    const next = handleSetupAction(state, {
      type: "setTeams",
      payload: {
        teams: ["A", "B"],
        lineupOrder: [["p1", "p2"], ["p3"]] as [string[], string[]],
        playerOverrides: [{ p1: { nickname: "Alice" } }, {}] as never,
      },
    });
    expect(next?.lineupPositions?.[0]).toEqual(["", ""]);
    expect(next?.lineupPositions?.[1]).toEqual([""]);
  });

  it("preserves existing lineupPositions when lineupOrder is not provided", () => {
    const state = makeState({
      lineupPositions: [
        ["SS", "CF"],
        ["1B", "LF"],
      ] as [string[], string[]],
    });
    const next = handleSetupAction(state, {
      type: "setTeams",
      payload: { teams: ["A", "B"] },
    });
    expect(next?.lineupPositions).toEqual([
      ["SS", "CF"],
      ["1B", "LF"],
    ]);
  });
});

/**
 * Targeted tests for src/context/handlers/lifecycle.ts
 *
 * Verifies that:
 * - non-lifecycle actions return undefined (sentinel)
 * - reset returns a fresh game state (reusing createFreshGameState from Stage 1)
 * - restore_game correctly backfills optional fields on older saves
 * - nextInning increments the inning counter
 */

import { describe, expect, it } from "vitest";

import { Hit } from "@constants/hitTypes";
import { makeState } from "@test/testHelpers";

import { handleLifecycleAction } from "./lifecycle";

// ---------------------------------------------------------------------------
// Sentinel: non-lifecycle actions return undefined
// ---------------------------------------------------------------------------

describe("handleLifecycleAction — non-lifecycle actions return undefined", () => {
  it("returns undefined for 'hit'", () => {
    expect(handleLifecycleAction(makeState(), { type: "hit" })).toBeUndefined();
  });
  it("returns undefined for 'setTeams'", () => {
    expect(
      handleLifecycleAction(makeState(), { type: "setTeams", payload: ["A", "B"] }),
    ).toBeUndefined();
  });
  it("returns undefined for 'skip_decision'", () => {
    expect(handleLifecycleAction(makeState(), { type: "skip_decision" })).toBeUndefined();
  });
  it("returns undefined for unknown action types", () => {
    expect(handleLifecycleAction(makeState(), { type: "__unknown__" })).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("handleLifecycleAction — reset", () => {
  it("returns a fresh state with zeroed counts", () => {
    const state = makeState({ strikes: 2, balls: 3, outs: 2, score: [5, 3] });
    const next = handleLifecycleAction(state, { type: "reset" });
    expect(next?.strikes).toBe(0);
    expect(next?.balls).toBe(0);
    expect(next?.outs).toBe(0);
    expect(next?.score).toEqual([0, 0]);
  });

  it("preserves the current teams", () => {
    const state = makeState({ teams: ["Yankees", "Mets"] });
    const next = handleLifecycleAction(state, { type: "reset" });
    expect(next?.teams).toEqual(["Yankees", "Mets"]);
  });

  it("resets gameOver to false", () => {
    const state = makeState({ gameOver: true });
    const next = handleLifecycleAction(state, { type: "reset" });
    expect(next?.gameOver).toBe(false);
  });

  it("clears decisionLog and pinchHitterStrategy", () => {
    const state = makeState({
      decisionLog: ["3:skip"],
      pinchHitterStrategy: "power",
    });
    const next = handleLifecycleAction(state, { type: "reset" });
    expect(next?.decisionLog).toHaveLength(0);
    expect(next?.pinchHitterStrategy).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// restore_game — backfills older save fields
// ---------------------------------------------------------------------------

describe("handleLifecycleAction — restore_game", () => {
  it("backfills rbi from runs on playLog entries that lack rbi", () => {
    const oldPlayLog = [
      { inning: 1, half: 0 as const, batterNum: 1, team: 0 as const, event: Hit.Single, runs: 1 },
    ];
    const restored = makeState({ playLog: oldPlayLog });
    const next = handleLifecycleAction(makeState(), { type: "restore_game", payload: restored });
    expect(next?.playLog[0].rbi).toBe(1);
  });

  it("preserves existing rbi values and does not overwrite them", () => {
    const playLog = [
      {
        inning: 1,
        half: 0 as const,
        batterNum: 2,
        team: 0 as const,
        event: Hit.Double,
        runs: 2,
        rbi: 2,
      },
    ];
    const restored = makeState({ playLog });
    const next = handleLifecycleAction(makeState(), { type: "restore_game", payload: restored });
    expect(next?.playLog[0].rbi).toBe(2);
  });

  it("handles empty playLog without error", () => {
    const next = handleLifecycleAction(makeState(), { type: "restore_game", payload: makeState() });
    expect(next?.playLog).toHaveLength(0);
  });

  it("backfills strikeoutLog and outLog when missing", () => {
    const restored = { ...makeState(), strikeoutLog: undefined, outLog: undefined };
    const next = handleLifecycleAction(makeState(), {
      type: "restore_game",
      payload: restored as ReturnType<typeof makeState>,
    });
    expect(Array.isArray(next?.strikeoutLog)).toBe(true);
    expect(Array.isArray(next?.outLog)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// nextInning
// ---------------------------------------------------------------------------

describe("handleLifecycleAction — nextInning", () => {
  it("increments the inning counter", () => {
    const state = makeState({ inning: 3 });
    const next = handleLifecycleAction(state, { type: "nextInning" });
    expect(next?.inning).toBe(4);
  });

  it("does not mutate any other fields", () => {
    const state = makeState({ inning: 5, score: [2, 3], outs: 1 });
    const next = handleLifecycleAction(state, { type: "nextInning" });
    expect(next?.score).toEqual([2, 3]);
    expect(next?.outs).toBe(1);
  });
});

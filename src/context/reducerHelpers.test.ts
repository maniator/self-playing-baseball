import { describe, expect, it } from "vitest";

import { Hit } from "@constants/hitTypes";
import { makeState } from "@test/testHelpers";

import {
  applyHandlersInOrder,
  makeStrikeoutEntry,
  wasStrikeout,
  withDecisionLog,
  withStrikeoutLog,
} from "./reducerHelpers";

describe("wasStrikeout", () => {
  it("returns true when prev had 2 strikes, next reset strikes, and no hit type", () => {
    const prev = makeState({ strikes: 2 });
    const next = makeState({ strikes: 0, hitType: undefined });
    expect(wasStrikeout(prev, next)).toBe(true);
  });

  it("returns false when prev had fewer than 2 strikes", () => {
    const prev = makeState({ strikes: 1 });
    const next = makeState({ strikes: 0, hitType: undefined });
    expect(wasStrikeout(prev, next)).toBe(false);
  });

  it("returns false when next still has 2 strikes (count unchanged)", () => {
    const prev = makeState({ strikes: 2 });
    const next = makeState({ strikes: 2, hitType: undefined });
    expect(wasStrikeout(prev, next)).toBe(false);
  });

  it("returns false when a hit type was recorded (e.g. walk on looking)", () => {
    const prev = makeState({ strikes: 2 });
    const next = makeState({ strikes: 0, hitType: Hit.Walk });
    expect(wasStrikeout(prev, next)).toBe(false);
  });
});

describe("makeStrikeoutEntry", () => {
  it("uses atBat as team and adds 1 to batterIndex", () => {
    const state = makeState({ atBat: 0, batterIndex: [3, 0] });
    const entry = makeStrikeoutEntry(state);
    expect(entry).toEqual({ team: 0, batterNum: 4 });
  });

  it("works for the home team (atBat = 1)", () => {
    const state = makeState({ atBat: 1, batterIndex: [0, 7] });
    const entry = makeStrikeoutEntry(state);
    expect(entry).toEqual({ team: 1, batterNum: 8 });
  });
});

describe("withStrikeoutLog", () => {
  it("appends a strikeout entry when a strikeout occurred", () => {
    const prev = makeState({ strikes: 2, atBat: 0, batterIndex: [2, 0] });
    const next = makeState({ strikes: 0, hitType: undefined, strikeoutLog: [] });
    const result = withStrikeoutLog(prev, next);
    expect(result.strikeoutLog).toHaveLength(1);
    expect(result.strikeoutLog[0]).toEqual({ team: 0, batterNum: 3 });
  });

  it("does not modify strikeoutLog when no strikeout occurred", () => {
    const prev = makeState({ strikes: 1 });
    const next = makeState({ strikes: 2, strikeoutLog: [] });
    const result = withStrikeoutLog(prev, next);
    expect(result.strikeoutLog).toHaveLength(0);
    expect(result).toBe(next); // same reference when unchanged
  });

  it("preserves existing strikeoutLog entries", () => {
    const existing = [{ team: 1 as const, batterNum: 5 }];
    const prev = makeState({ strikes: 2, atBat: 0, batterIndex: [0, 0] });
    const next = makeState({ strikes: 0, hitType: undefined, strikeoutLog: existing });
    const result = withStrikeoutLog(prev, next);
    expect(result.strikeoutLog).toHaveLength(2);
    expect(result.strikeoutLog[0]).toEqual({ team: 1, batterNum: 5 });
  });
});

describe("withDecisionLog", () => {
  it("appends the entry when a decision was pending", () => {
    const state = makeState({
      pendingDecision: { kind: "bunt" },
      decisionLog: [],
      pitchKey: 3,
    });
    const result = makeState({ decisionLog: [] });
    const next = withDecisionLog(state, result, "3:bunt");
    expect(next.decisionLog).toEqual(["3:bunt"]);
  });

  it("returns result unchanged when no decision was pending", () => {
    const state = makeState({ pendingDecision: null, decisionLog: [] });
    const result = makeState({ decisionLog: [] });
    const next = withDecisionLog(state, result, "3:bunt");
    expect(next).toBe(result); // same reference
    expect(next.decisionLog).toEqual([]);
  });

  it("uses state.decisionLog as the base (not result.decisionLog)", () => {
    const state = makeState({
      pendingDecision: { kind: "bunt" },
      decisionLog: ["1:skip"],
      pitchKey: 5,
    });
    // result has a different decisionLog that should be ignored
    const result = makeState({ decisionLog: ["other"] });
    const next = withDecisionLog(state, result, "5:bunt");
    expect(next.decisionLog).toEqual(["1:skip", "5:bunt"]);
  });

  it("does not mutate state or result", () => {
    const originalLog = ["1:skip"];
    const state = makeState({
      pendingDecision: { kind: "ibb" },
      decisionLog: originalLog,
      pitchKey: 2,
    });
    const result = makeState({ decisionLog: [] });
    withDecisionLog(state, result, "2:ibb");
    expect(state.decisionLog).toBe(originalLog); // unchanged
    expect(result.decisionLog).toEqual([]); // unchanged
  });
});

describe("applyHandlersInOrder", () => {
  it("returns the result of the first handler that returns non-undefined", () => {
    const state = makeState({ strikes: 0 });
    const expected = makeState({ strikes: 1 });
    const handler1 = () => undefined;
    const handler2 = () => expected;
    const handler3 = () => makeState({ strikes: 2 }); // should never run
    const result = applyHandlersInOrder(state, { type: "any" }, [handler1, handler2, handler3]);
    expect(result).toBe(expected);
  });

  it("throws when no handler claims the action", () => {
    const state = makeState();
    expect(() =>
      applyHandlersInOrder(state, { type: "unknown_action" }, [() => undefined, () => undefined]),
    ).toThrow("No such reducer type as unknown_action");
  });

  it("returns immediately on the first match (skips remaining handlers)", () => {
    const state = makeState();
    let secondHandlerCalled = false;
    const first = () => makeState({ strikes: 1 });
    const second = () => {
      secondHandlerCalled = true;
      return makeState({ strikes: 2 });
    };
    applyHandlersInOrder(state, { type: "any" }, [first, second]);
    expect(secondHandlerCalled).toBe(false);
  });

  it("tries all handlers before throwing when none match", () => {
    let callCount = 0;
    const handler = () => {
      callCount++;
      return undefined;
    };
    expect(() =>
      applyHandlersInOrder(makeState(), { type: "x" }, [handler, handler, handler]),
    ).toThrow();
    expect(callCount).toBe(3);
  });
});

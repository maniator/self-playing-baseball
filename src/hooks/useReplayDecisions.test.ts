import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as rngModule from "@utils/rng";

import { useReplayDecisions } from "./useReplayDecisions";

afterEach(() => vi.restoreAllMocks());

describe("useReplayDecisions", () => {
  it("dispatches skip_decision when entry matches pitchKey", () => {
    vi.spyOn(rngModule, "getDecisionsFromUrl").mockReturnValue(["5:skip"]);
    const dispatch = vi.fn();
    renderHook(() => useReplayDecisions(dispatch, { kind: "bunt" as const }, 5, "balanced"));
    expect(dispatch).toHaveBeenCalledWith({ type: "skip_decision" });
  });

  it("does not dispatch when pitchKey does not match", () => {
    vi.spyOn(rngModule, "getDecisionsFromUrl").mockReturnValue(["5:skip"]);
    const dispatch = vi.fn();
    renderHook(() => useReplayDecisions(dispatch, { kind: "bunt" as const }, 3, "balanced"));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when pendingDecision is null", () => {
    vi.spyOn(rngModule, "getDecisionsFromUrl").mockReturnValue(["5:skip"]);
    const dispatch = vi.fn();
    renderHook(() => useReplayDecisions(dispatch, null, 5, "balanced"));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatches bunt_attempt for bunt entries", () => {
    vi.spyOn(rngModule, "getDecisionsFromUrl").mockReturnValue(["7:bunt"]);
    const dispatch = vi.fn();
    renderHook(() => useReplayDecisions(dispatch, { kind: "bunt" as const }, 7, "contact"));
    expect(dispatch).toHaveBeenCalledWith({
      type: "bunt_attempt",
      payload: { strategy: "contact" },
    });
  });

  it("dispatches set_one_pitch_modifier for take entries", () => {
    vi.spyOn(rngModule, "getDecisionsFromUrl").mockReturnValue(["2:take"]);
    const dispatch = vi.fn();
    renderHook(() => useReplayDecisions(dispatch, { kind: "count30" as const }, 2, "patient"));
    expect(dispatch).toHaveBeenCalledWith({ type: "set_one_pitch_modifier", payload: "take" });
  });

  it("dispatches steal_attempt with correct base and successPct", () => {
    vi.spyOn(rngModule, "getDecisionsFromUrl").mockReturnValue(["9:steal:1:80"]);
    const dispatch = vi.fn();
    renderHook(() =>
      useReplayDecisions(
        dispatch,
        { kind: "steal" as const, base: 1 as const, successPct: 80 },
        9,
        "aggressive",
      ),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "steal_attempt",
      payload: { base: 1, successPct: 80 },
    });
  });

  it("skips stale entries when pitchKey has advanced past entry", () => {
    vi.spyOn(rngModule, "getDecisionsFromUrl").mockReturnValue(["3:skip", "8:skip"]);
    const dispatch = vi.fn();
    const { rerender } = renderHook(
      ({ pk }) => useReplayDecisions(dispatch, { kind: "bunt" as const }, pk, "balanced"),
      { initialProps: { pk: 8 } },
    );
    rerender({ pk: 8 });
    expect(dispatch).toHaveBeenCalledWith({ type: "skip_decision" });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("ignores malformed pinch entry with missing strategy part", () => {
    vi.spyOn(rngModule, "getDecisionsFromUrl").mockReturnValue(["5:pinch"]);
    const dispatch = vi.fn();
    renderHook(() =>
      useReplayDecisions(dispatch, { kind: "pinch_hitter" as const }, 5, "balanced"),
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("ignores malformed pinch entry with invalid strategy value", () => {
    vi.spyOn(rngModule, "getDecisionsFromUrl").mockReturnValue(["5:pinch:invalid"]);
    const dispatch = vi.fn();
    renderHook(() =>
      useReplayDecisions(dispatch, { kind: "pinch_hitter" as const }, 5, "balanced"),
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("ignores malformed shift entry with missing direction part", () => {
    vi.spyOn(rngModule, "getDecisionsFromUrl").mockReturnValue(["5:shift"]);
    const dispatch = vi.fn();
    renderHook(() =>
      useReplayDecisions(dispatch, { kind: "defensive_shift" as const }, 5, "balanced"),
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatches set_defensive_shift false for shift:off entry", () => {
    vi.spyOn(rngModule, "getDecisionsFromUrl").mockReturnValue(["5:shift:off"]);
    const dispatch = vi.fn();
    renderHook(() =>
      useReplayDecisions(dispatch, { kind: "defensive_shift" as const }, 5, "balanced"),
    );
    expect(dispatch).toHaveBeenCalledWith({ type: "set_defensive_shift", payload: false });
  });

  it("dispatches set_pinch_hitter_strategy for valid pinch entry", () => {
    vi.spyOn(rngModule, "getDecisionsFromUrl").mockReturnValue(["5:pinch:power"]);
    const dispatch = vi.fn();
    renderHook(() =>
      useReplayDecisions(dispatch, { kind: "pinch_hitter" as const }, 5, "balanced"),
    );
    expect(dispatch).toHaveBeenCalledWith({ type: "set_pinch_hitter_strategy", payload: "power" });
  });
});

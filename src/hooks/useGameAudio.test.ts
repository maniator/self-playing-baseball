import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as announceModule from "@utils/announce";

import { useGameAudio } from "./useGameAudio";

afterEach(() => vi.restoreAllMocks());

describe("useGameAudio", () => {
  it("calls playVictoryFanfare when gameOver transitions false → true", () => {
    const fanfare = vi.spyOn(announceModule, "playVictoryFanfare").mockImplementation(() => {});
    const dispatchLog = vi.fn();
    const { rerender } = renderHook(({ go }) => useGameAudio(1, 0, go, dispatchLog), {
      initialProps: { go: false },
    });
    expect(fanfare).not.toHaveBeenCalled();
    rerender({ go: true });
    expect(fanfare).toHaveBeenCalledOnce();
  });

  it("does not call playVictoryFanfare when gameOver stays false", () => {
    const fanfare = vi.spyOn(announceModule, "playVictoryFanfare").mockImplementation(() => {});
    const dispatchLog = vi.fn();
    const { rerender } = renderHook(({ go }) => useGameAudio(1, 0, go, dispatchLog), {
      initialProps: { go: false },
    });
    rerender({ go: false });
    expect(fanfare).not.toHaveBeenCalled();
  });

  it("calls play7thInningStretch and logs message at inning 7, atBat 1", () => {
    const stretch = vi.spyOn(announceModule, "play7thInningStretch").mockImplementation(() => {});
    const dispatchLog = vi.fn();
    const { rerender } = renderHook(
      ({ inning, atBat }) => useGameAudio(inning, atBat, false, dispatchLog),
      { initialProps: { inning: 6, atBat: 0 } },
    );
    expect(stretch).not.toHaveBeenCalled();
    rerender({ inning: 7, atBat: 1 });
    expect(stretch).toHaveBeenCalledOnce();
    expect(dispatchLog).toHaveBeenCalledWith(expect.objectContaining({ type: "log" }));
  });

  it("returns a betweenInningsPauseRef that is set true on inning change", () => {
    const dispatchLog = vi.fn();
    vi.spyOn(announceModule, "play7thInningStretch").mockImplementation(() => {});
    const { result, rerender } = renderHook(
      ({ inning, atBat }) => useGameAudio(inning, atBat, false, dispatchLog),
      { initialProps: { inning: 1, atBat: 0 } },
    );
    rerender({ inning: 2, atBat: 0 });
    expect(result.current.current).toBe(true);
  });
});

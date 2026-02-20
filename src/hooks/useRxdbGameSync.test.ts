import * as React from "react";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GameAction } from "@context/index";
import * as saveStoreModule from "@storage/saveStore";

import { useRxdbGameSync } from "./useRxdbGameSync";

vi.mock("@storage/saveStore", () => ({
  SaveStore: {
    appendEvents: vi.fn().mockResolvedValue(undefined),
    updateProgress: vi.fn().mockResolvedValue(undefined),
  },
}));

const makeRefs = (saveId: string | null = "save_1") => ({
  rxSaveIdRef: { current: saveId } as React.MutableRefObject<string | null>,
  actionBufferRef: { current: [] as GameAction[] } as React.MutableRefObject<GameAction[]>,
});

describe("useRxdbGameSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not flush on initial render", () => {
    const { rxSaveIdRef, actionBufferRef } = makeRefs();
    renderHook(() => useRxdbGameSync(rxSaveIdRef, actionBufferRef, 0, 1, 0, [0, 0], false));
    expect(saveStoreModule.SaveStore.appendEvents).not.toHaveBeenCalled();
  });

  it("does not call updateProgress on initial render", () => {
    const { rxSaveIdRef, actionBufferRef } = makeRefs();
    renderHook(() => useRxdbGameSync(rxSaveIdRef, actionBufferRef, 0, 1, 0, [0, 0], false));
    expect(saveStoreModule.SaveStore.updateProgress).not.toHaveBeenCalled();
  });

  it("flushes game events to appendEvents when pitchKey advances", () => {
    const { rxSaveIdRef, actionBufferRef } = makeRefs();
    let pitchKey = 0;
    const { rerender } = renderHook(() =>
      useRxdbGameSync(rxSaveIdRef, actionBufferRef, pitchKey, 1, 0, [0, 0], false),
    );

    actionBufferRef.current.push({ type: "hit", payload: { hitType: "single" } });
    act(() => {
      pitchKey = 1;
      rerender();
    });

    expect(saveStoreModule.SaveStore.appendEvents).toHaveBeenCalledWith("save_1", [
      { type: "hit", at: 0, payload: { hitType: "single" } },
    ]);
  });

  it("clears the buffer even when no saveId is set", () => {
    const { rxSaveIdRef, actionBufferRef } = makeRefs(null);
    let pitchKey = 0;
    const { rerender } = renderHook(() =>
      useRxdbGameSync(rxSaveIdRef, actionBufferRef, pitchKey, 1, 0, [0, 0], false),
    );

    actionBufferRef.current.push({ type: "hit", payload: {} });
    act(() => {
      pitchKey = 1;
      rerender();
    });

    expect(saveStoreModule.SaveStore.appendEvents).not.toHaveBeenCalled();
    expect(actionBufferRef.current).toHaveLength(0);
  });

  it("filters out non-game-event actions (reset, setTeams, restore_game)", () => {
    const { rxSaveIdRef, actionBufferRef } = makeRefs();
    let pitchKey = 0;
    const { rerender } = renderHook(() =>
      useRxdbGameSync(rxSaveIdRef, actionBufferRef, pitchKey, 1, 0, [0, 0], false),
    );

    actionBufferRef.current.push(
      { type: "reset" },
      { type: "setTeams", payload: { teams: ["A", "B"] } },
      { type: "strike", payload: { swung: true } },
    );
    act(() => {
      pitchKey = 1;
      rerender();
    });

    expect(saveStoreModule.SaveStore.appendEvents).toHaveBeenCalledWith("save_1", [
      { type: "strike", at: 0, payload: { swung: true } },
    ]);
  });

  it("does not call appendEvents when only non-game actions were buffered", () => {
    const { rxSaveIdRef, actionBufferRef } = makeRefs();
    let pitchKey = 0;
    const { rerender } = renderHook(() =>
      useRxdbGameSync(rxSaveIdRef, actionBufferRef, pitchKey, 1, 0, [0, 0], false),
    );

    actionBufferRef.current.push({ type: "reset" }, { type: "setTeams", payload: {} });
    act(() => {
      pitchKey = 1;
      rerender();
    });

    expect(saveStoreModule.SaveStore.appendEvents).not.toHaveBeenCalled();
  });

  it("calls updateProgress on half-inning transition", () => {
    const { rxSaveIdRef, actionBufferRef } = makeRefs();
    let atBat = 0;
    const { rerender } = renderHook(() =>
      useRxdbGameSync(rxSaveIdRef, actionBufferRef, 5, 1, atBat, [2, 1], false),
    );

    act(() => {
      atBat = 1;
      rerender();
    });

    expect(saveStoreModule.SaveStore.updateProgress).toHaveBeenCalledWith("save_1", 5, {
      scoreSnapshot: { away: 2, home: 1 },
      inningSnapshot: { inning: 1, atBat: 1 },
    });
  });

  it("does not call updateProgress when halfKey does not change", () => {
    const { rxSaveIdRef, actionBufferRef } = makeRefs();
    let score: [number, number] = [0, 0];
    const { rerender } = renderHook(() =>
      useRxdbGameSync(rxSaveIdRef, actionBufferRef, 0, 1, 0, score, false),
    );

    act(() => {
      score = [1, 0];
      rerender();
    });

    expect(saveStoreModule.SaveStore.updateProgress).not.toHaveBeenCalled();
  });

  it("does not call updateProgress on half-inning when no saveId", () => {
    const { rxSaveIdRef, actionBufferRef } = makeRefs(null);
    let atBat = 0;
    const { rerender } = renderHook(() =>
      useRxdbGameSync(rxSaveIdRef, actionBufferRef, 0, 1, atBat, [0, 0], false),
    );

    act(() => {
      atBat = 1;
      rerender();
    });

    expect(saveStoreModule.SaveStore.updateProgress).not.toHaveBeenCalled();
  });

  it("calls updateProgress with scoreSnapshot when game ends", async () => {
    const { rxSaveIdRef, actionBufferRef } = makeRefs();
    let gameOver = false;
    const { rerender } = renderHook(() =>
      useRxdbGameSync(rxSaveIdRef, actionBufferRef, 10, 9, 1, [3, 2], gameOver),
    );

    await act(async () => {
      gameOver = true;
      rerender();
    });

    expect(saveStoreModule.SaveStore.updateProgress).toHaveBeenCalledWith("save_1", 10, {
      scoreSnapshot: { away: 3, home: 2 },
    });
  });

  it("does not call updateProgress on game over when no saveId", async () => {
    const { rxSaveIdRef, actionBufferRef } = makeRefs(null);
    let gameOver = false;
    const { rerender } = renderHook(() =>
      useRxdbGameSync(rxSaveIdRef, actionBufferRef, 0, 9, 1, [0, 0], gameOver),
    );

    await act(async () => {
      gameOver = true;
      rerender();
    });

    expect(saveStoreModule.SaveStore.updateProgress).not.toHaveBeenCalled();
  });
});

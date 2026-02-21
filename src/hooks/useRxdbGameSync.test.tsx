import * as React from "react";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContextValue, GameAction } from "@context/index";
import { GameContext } from "@context/index";
import * as saveStoreModule from "@storage/saveStore";
import { makeContextValue } from "@test/testHelpers";

import { useRxdbGameSync } from "./useRxdbGameSync";

vi.mock("@storage/saveStore", () => ({
  SaveStore: {
    appendEvents: vi.fn().mockResolvedValue(undefined),
    updateProgress: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@utils/rng", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/rng")>();
  return { ...actual, getRngState: vi.fn().mockReturnValue(42) };
});

const makeRefs = (saveId: string | null = "save_1") => ({
  rxSaveIdRef: { current: saveId } as React.MutableRefObject<string | null>,
  actionBufferRef: { current: [] as GameAction[] } as React.MutableRefObject<GameAction[]>,
});

/** Renders useRxdbGameSync with a controllable context. */
const renderSync = (
  refs: ReturnType<typeof makeRefs>,
  ctxOverrides: Partial<ContextValue> = {},
) => {
  const ctx = makeContextValue(ctxOverrides);
  return renderHook(() => useRxdbGameSync(refs.rxSaveIdRef, refs.actionBufferRef), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <GameContext.Provider value={ctx}>{children}</GameContext.Provider>
    ),
  });
};

describe("useRxdbGameSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not flush on initial render", () => {
    const refs = makeRefs();
    renderSync(refs);
    expect(saveStoreModule.SaveStore.appendEvents).not.toHaveBeenCalled();
  });

  it("does not call updateProgress on initial render", () => {
    const refs = makeRefs();
    renderSync(refs);
    expect(saveStoreModule.SaveStore.updateProgress).not.toHaveBeenCalled();
  });

  it("flushes game events to appendEvents when pitchKey advances", () => {
    const refs = makeRefs();
    let ctx = makeContextValue({ pitchKey: 0, inning: 1, atBat: 0, gameOver: false });
    const { rerender } = renderHook(() => useRxdbGameSync(refs.rxSaveIdRef, refs.actionBufferRef), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <GameContext.Provider value={ctx}>{children}</GameContext.Provider>
      ),
    });

    refs.actionBufferRef.current.push({ type: "hit", payload: { hitType: "single" } });
    act(() => {
      ctx = makeContextValue({ pitchKey: 1, inning: 1, atBat: 0, gameOver: false });
      rerender();
    });

    expect(saveStoreModule.SaveStore.appendEvents).toHaveBeenCalledWith("save_1", [
      { type: "hit", at: 0, payload: { hitType: "single" } },
    ]);
  });

  it("clears the buffer even when no saveId is set", () => {
    const refs = makeRefs(null);
    let ctx = makeContextValue({ pitchKey: 0 });
    const { rerender } = renderHook(() => useRxdbGameSync(refs.rxSaveIdRef, refs.actionBufferRef), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <GameContext.Provider value={ctx}>{children}</GameContext.Provider>
      ),
    });

    refs.actionBufferRef.current.push({ type: "hit", payload: {} });
    act(() => {
      ctx = makeContextValue({ pitchKey: 1 });
      rerender();
    });

    expect(saveStoreModule.SaveStore.appendEvents).not.toHaveBeenCalled();
    expect(refs.actionBufferRef.current).toHaveLength(0);
  });

  it("filters out non-game-event actions (reset, setTeams, restore_game)", () => {
    const refs = makeRefs();
    let ctx = makeContextValue({ pitchKey: 0 });
    const { rerender } = renderHook(() => useRxdbGameSync(refs.rxSaveIdRef, refs.actionBufferRef), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <GameContext.Provider value={ctx}>{children}</GameContext.Provider>
      ),
    });

    refs.actionBufferRef.current.push(
      { type: "reset" },
      { type: "setTeams", payload: { teams: ["A", "B"] } },
      { type: "strike", payload: { swung: true } },
    );
    act(() => {
      ctx = makeContextValue({ pitchKey: 1 });
      rerender();
    });

    expect(saveStoreModule.SaveStore.appendEvents).toHaveBeenCalledWith("save_1", [
      { type: "strike", at: 0, payload: { swung: true } },
    ]);
  });

  it("does not call appendEvents when only non-game actions were buffered", () => {
    const refs = makeRefs();
    let ctx = makeContextValue({ pitchKey: 0 });
    const { rerender } = renderHook(() => useRxdbGameSync(refs.rxSaveIdRef, refs.actionBufferRef), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <GameContext.Provider value={ctx}>{children}</GameContext.Provider>
      ),
    });

    refs.actionBufferRef.current.push({ type: "reset" }, { type: "setTeams", payload: {} });
    act(() => {
      ctx = makeContextValue({ pitchKey: 1 });
      rerender();
    });

    expect(saveStoreModule.SaveStore.appendEvents).not.toHaveBeenCalled();
  });

  it("calls updateProgress with stateSnapshot on half-inning transition", () => {
    const refs = makeRefs();
    let ctx = makeContextValue({
      pitchKey: 5,
      inning: 1,
      atBat: 0,
      score: [2, 1] as [number, number],
    });
    const { rerender } = renderHook(() => useRxdbGameSync(refs.rxSaveIdRef, refs.actionBufferRef), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <GameContext.Provider value={ctx}>{children}</GameContext.Provider>
      ),
    });

    act(() => {
      ctx = makeContextValue({
        pitchKey: 5,
        inning: 1,
        atBat: 1,
        score: [2, 1] as [number, number],
      });
      rerender();
    });

    expect(saveStoreModule.SaveStore.updateProgress).toHaveBeenCalledWith(
      "save_1",
      5,
      expect.objectContaining({
        scoreSnapshot: { away: 2, home: 1 },
        inningSnapshot: { inning: 1, atBat: 1 },
        stateSnapshot: expect.objectContaining({ rngState: 42 }),
      }),
    );
  });

  it("does not call updateProgress when halfKey does not change", () => {
    const refs = makeRefs();
    let ctx = makeContextValue({ inning: 2, atBat: 0 });
    const { rerender } = renderHook(() => useRxdbGameSync(refs.rxSaveIdRef, refs.actionBufferRef), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <GameContext.Provider value={ctx}>{children}</GameContext.Provider>
      ),
    });

    act(() => {
      ctx = makeContextValue({ inning: 2, atBat: 0, strikes: 1 });
      rerender();
    });

    expect(saveStoreModule.SaveStore.updateProgress).not.toHaveBeenCalled();
  });

  it("does not call updateProgress on half-inning when no saveId", () => {
    const refs = makeRefs(null);
    let ctx = makeContextValue({ inning: 1, atBat: 0 });
    const { rerender } = renderHook(() => useRxdbGameSync(refs.rxSaveIdRef, refs.actionBufferRef), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <GameContext.Provider value={ctx}>{children}</GameContext.Provider>
      ),
    });

    act(() => {
      ctx = makeContextValue({ inning: 1, atBat: 1 });
      rerender();
    });

    expect(saveStoreModule.SaveStore.updateProgress).not.toHaveBeenCalled();
  });

  it("calls updateProgress with stateSnapshot when game ends", async () => {
    const refs = makeRefs();
    let ctx = makeContextValue({
      pitchKey: 10,
      inning: 9,
      atBat: 1,
      score: [3, 2] as [number, number],
      gameOver: false,
    });
    const { rerender } = renderHook(() => useRxdbGameSync(refs.rxSaveIdRef, refs.actionBufferRef), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <GameContext.Provider value={ctx}>{children}</GameContext.Provider>
      ),
    });

    await act(async () => {
      ctx = makeContextValue({
        pitchKey: 10,
        inning: 9,
        atBat: 1,
        score: [3, 2] as [number, number],
        gameOver: true,
      });
      rerender();
    });

    expect(saveStoreModule.SaveStore.updateProgress).toHaveBeenCalledWith(
      "save_1",
      10,
      expect.objectContaining({
        scoreSnapshot: { away: 3, home: 2 },
        stateSnapshot: expect.objectContaining({ rngState: 42 }),
      }),
    );
  });

  it("does not call updateProgress on game over when no saveId", async () => {
    const refs = makeRefs(null);
    let ctx = makeContextValue({ gameOver: false });
    const { rerender } = renderHook(() => useRxdbGameSync(refs.rxSaveIdRef, refs.actionBufferRef), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <GameContext.Provider value={ctx}>{children}</GameContext.Provider>
      ),
    });

    await act(async () => {
      ctx = makeContextValue({ gameOver: true });
      rerender();
    });

    expect(saveStoreModule.SaveStore.updateProgress).not.toHaveBeenCalled();
  });
});

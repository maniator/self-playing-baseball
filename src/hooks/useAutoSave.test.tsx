import * as React from "react";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ContextValue } from "@context/index";
import { GameContext } from "@context/index";
import { makeContextValue } from "@test/testHelpers";
import * as savesModule from "@utils/saves";

import { useAutoSave } from "./useAutoSave";

vi.mock("@utils/rng", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/rng")>();
  return { ...actual, getSeed: vi.fn().mockReturnValue(12345) };
});

/** Creates a named wrapper whose context can be updated via the returned ref. */
const makeCtxWrapper = (ctxGetter: () => ContextValue) => {
  function ContextWrapper({ children }: { children: React.ReactNode }) {
    return <GameContext.Provider value={ctxGetter()}>{children}</GameContext.Provider>;
  }
  return ContextWrapper;
};

describe("useAutoSave", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("does NOT auto-save on initial render", () => {
    const writeSpy = vi.spyOn(savesModule, "writeAutoSave");
    const ctx = makeContextValue({ inning: 1, atBat: 0, gameOver: false });
    renderHook(() => useAutoSave("balanced", 0, false), {
      wrapper: makeCtxWrapper(() => ctx),
    });
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("auto-saves when atBat changes (half-inning transition)", () => {
    const writeSpy = vi.spyOn(savesModule, "writeAutoSave");
    let ctx = makeContextValue({ inning: 1, atBat: 0, gameOver: false });
    const { rerender } = renderHook(() => useAutoSave("balanced", 0, false), {
      wrapper: makeCtxWrapper(() => ctx),
    });
    expect(writeSpy).not.toHaveBeenCalled();
    act(() => {
      ctx = makeContextValue({ inning: 1, atBat: 1, gameOver: false });
      rerender();
    });
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it("auto-saves when inning changes", () => {
    const writeSpy = vi.spyOn(savesModule, "writeAutoSave");
    let ctx = makeContextValue({ inning: 1, atBat: 1, gameOver: false });
    const { rerender } = renderHook(() => useAutoSave("balanced", 0, false), {
      wrapper: makeCtxWrapper(() => ctx),
    });
    act(() => {
      ctx = makeContextValue({ inning: 2, atBat: 0, gameOver: false });
      rerender();
    });
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it("auto-saves when game ends", () => {
    const writeSpy = vi.spyOn(savesModule, "writeAutoSave");
    let ctx = makeContextValue({ inning: 9, atBat: 1, gameOver: false });
    const { rerender } = renderHook(() => useAutoSave("balanced", 0, false), {
      wrapper: makeCtxWrapper(() => ctx),
    });
    act(() => {
      ctx = makeContextValue({ inning: 9, atBat: 1, gameOver: true });
      rerender();
    });
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT save again when halfKey stays the same (same inning + atBat)", () => {
    const writeSpy = vi.spyOn(savesModule, "writeAutoSave");
    let ctx = makeContextValue({ inning: 2, atBat: 0, gameOver: false });
    const { rerender } = renderHook(() => useAutoSave("balanced", 0, false), {
      wrapper: makeCtxWrapper(() => ctx),
    });
    act(() => {
      ctx = makeContextValue({ inning: 2, atBat: 0, strikes: 1, gameOver: false });
      rerender();
    });
    expect(writeSpy).not.toHaveBeenCalled();
  });
});

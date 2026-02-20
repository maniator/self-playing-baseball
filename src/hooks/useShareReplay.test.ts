import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as rngModule from "@utils/rng";

import { useShareReplay } from "./useShareReplay";

afterEach(() => vi.restoreAllMocks());

describe("useShareReplay", () => {
  it("copies URL to clipboard when navigator.clipboard is available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    vi.spyOn(rngModule, "buildReplayUrl").mockReturnValue("https://example.com?seed=abc");
    const dispatchLog = vi.fn();

    const { result } = renderHook(() => useShareReplay({ dispatchLog }));
    await act(async () => {
      result.current.handleShareReplay();
    });
    expect(writeText).toHaveBeenCalledWith("https://example.com?seed=abc");
  });

  it("logs copied message after successful clipboard write", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    vi.spyOn(rngModule, "buildReplayUrl").mockReturnValue("https://example.com?seed=abc");
    const dispatchLog = vi.fn();

    const { result } = renderHook(() => useShareReplay({ dispatchLog }));
    await act(async () => {
      result.current.handleShareReplay();
    });
    expect(dispatchLog).toHaveBeenCalledWith(expect.objectContaining({ type: "log" }));
  });

  it("calls buildReplayUrl with no arguments (seed only)", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    const spy = vi
      .spyOn(rngModule, "buildReplayUrl")
      .mockReturnValue("https://example.com?seed=abc");
    const dispatchLog = vi.fn();

    const { result } = renderHook(() => useShareReplay({ dispatchLog }));
    await act(async () => {
      result.current.handleShareReplay();
    });
    expect(spy).toHaveBeenCalledWith();
  });

  it("falls back to window.prompt when navigator.clipboard is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);
    vi.spyOn(rngModule, "buildReplayUrl").mockReturnValue("https://example.com?seed=xyz");
    const dispatchLog = vi.fn();

    const { result } = renderHook(() => useShareReplay({ dispatchLog }));
    act(() => {
      result.current.handleShareReplay();
    });
    expect(promptSpy).toHaveBeenCalledWith("Copy this seed link:", "https://example.com?seed=xyz");
  });
});

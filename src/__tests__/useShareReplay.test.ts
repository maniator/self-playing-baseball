import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as rngModule from "../utilities/rng";
import { useShareReplay } from "../GameControls/hooks/useShareReplay";

afterEach(() => vi.restoreAllMocks());

describe("useShareReplay", () => {
  it("copies URL to clipboard when navigator.clipboard is available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, writable: true, configurable: true });
    vi.spyOn(rngModule, "buildReplayUrl").mockReturnValue("https://example.com?seed=abc");
    const dispatchLog = vi.fn();

    const { result } = renderHook(() => useShareReplay({ managerMode: false, decisionLog: [], dispatchLog }));
    await act(async () => { result.current.handleShareReplay(); });
    expect(writeText).toHaveBeenCalledWith("https://example.com?seed=abc");
  });

  it("logs copied message after successful clipboard write", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, writable: true, configurable: true });
    vi.spyOn(rngModule, "buildReplayUrl").mockReturnValue("https://example.com?seed=abc");
    const dispatchLog = vi.fn();

    const { result } = renderHook(() => useShareReplay({ managerMode: false, decisionLog: [], dispatchLog }));
    await act(async () => { result.current.handleShareReplay(); });
    expect(dispatchLog).toHaveBeenCalledWith(expect.objectContaining({ type: "log" }));
  });

  it("passes decisionLog to buildReplayUrl when managerMode is true", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, writable: true, configurable: true });
    const spy = vi.spyOn(rngModule, "buildReplayUrl").mockReturnValue("https://example.com?seed=abc&decisions=1:skip");
    const dispatchLog = vi.fn();

    const { result } = renderHook(() =>
      useShareReplay({ managerMode: true, decisionLog: ["1:skip"], dispatchLog })
    );
    await act(async () => { result.current.handleShareReplay(); });
    expect(spy).toHaveBeenCalledWith(["1:skip"]);
  });

  it("does NOT pass decisionLog to buildReplayUrl when managerMode is false", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, writable: true, configurable: true });
    const spy = vi.spyOn(rngModule, "buildReplayUrl").mockReturnValue("https://example.com?seed=abc");
    const dispatchLog = vi.fn();

    const { result } = renderHook(() =>
      useShareReplay({ managerMode: false, decisionLog: ["1:skip"], dispatchLog })
    );
    await act(async () => { result.current.handleShareReplay(); });
    expect(spy).toHaveBeenCalledWith(undefined);
  });
});

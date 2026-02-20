import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useKeyboardPitch } from "./useKeyboardPitch";

afterEach(() => vi.restoreAllMocks());

describe("useKeyboardPitch", () => {
  it("calls handleClick on keyup when autoPlay is false and game has started", () => {
    const handleClick = vi.fn();
    renderHook(() =>
      useKeyboardPitch(
        { current: false } as any,
        { current: handleClick } as any,
        { current: true } as any,
      ),
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    });
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("does nothing on keyup when autoPlay is true", () => {
    const handleClick = vi.fn();
    renderHook(() =>
      useKeyboardPitch(
        { current: true } as any,
        { current: handleClick } as any,
        { current: true } as any,
      ),
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    });
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("does not call handleClick when game has not started", () => {
    const handleClick = vi.fn();
    renderHook(() =>
      useKeyboardPitch(
        { current: false } as any,
        { current: handleClick } as any,
        { current: false } as any,
      ),
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    });
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("removes keyup listener on unmount", () => {
    const handleClick = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardPitch(
        { current: false } as any,
        { current: handleClick } as any,
        { current: true } as any,
      ),
    );
    unmount();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    });
    expect(handleClick).not.toHaveBeenCalled();
  });
});

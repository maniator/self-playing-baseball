import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardPitch } from "./useKeyboardPitch";

afterEach(() => vi.restoreAllMocks());

describe("useKeyboardPitch", () => {
  it("calls handleClick on keyup when autoPlay is false", () => {
    const handleClick = vi.fn();
    renderHook(() =>
      useKeyboardPitch({ current: false } as any, { current: handleClick } as any)
    );
    act(() => { window.dispatchEvent(new KeyboardEvent("keyup", { key: " " })); });
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("does nothing on keyup when autoPlay is true", () => {
    const handleClick = vi.fn();
    renderHook(() =>
      useKeyboardPitch({ current: true } as any, { current: handleClick } as any)
    );
    act(() => { window.dispatchEvent(new KeyboardEvent("keyup", { key: " " })); });
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("removes keyup listener on unmount", () => {
    const handleClick = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardPitch({ current: false } as any, { current: handleClick } as any)
    );
    unmount();
    act(() => { window.dispatchEvent(new KeyboardEvent("keyup", { key: " " })); });
    expect(handleClick).not.toHaveBeenCalled();
  });
});

import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import UpdateBanner from "./index";

describe("UpdateBanner", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { reload: vi.fn() },
    });
  });

  it("renders the update warning message", () => {
    render(<UpdateBanner onDismiss={vi.fn()} />);
    expect(screen.getByTestId("update-banner")).toBeInTheDocument();
    expect(
      screen.getByText(/new version of BlipIt Baseball Legends is available/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/unexpected game behavior/i)).toBeInTheDocument();
  });

  it("has role=alert for screen-reader accessibility", () => {
    render(<UpdateBanner onDismiss={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("calls window.location.reload when the Reload button is clicked", () => {
    render(<UpdateBanner onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /reload app/i }));
    expect(window.location.reload).toHaveBeenCalledOnce();
  });

  it("calls onDismiss when the dismiss button is clicked", () => {
    const onDismiss = vi.fn();
    render(<UpdateBanner onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss update notice/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("does not call window.location.reload when dismiss is clicked", () => {
    render(<UpdateBanner onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss update notice/i }));
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it("does not call onDismiss when reload is clicked", () => {
    const onDismiss = vi.fn();
    render(<UpdateBanner onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /reload app/i }));
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

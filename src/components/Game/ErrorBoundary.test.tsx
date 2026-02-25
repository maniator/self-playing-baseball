import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary";

/** Helper component that throws on first render. */
const Thrower: React.FunctionComponent<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error("test error message");
  return <div>Safe content</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // Suppress the expected React error boundary console output in tests.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Safe content")).toBeTruthy();
  });

  it("shows error UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText("⚾ Something went wrong")).toBeTruthy();
    expect(screen.getByText("test error message")).toBeTruthy();
    expect(screen.getByRole("button", { name: /reset/i })).toBeTruthy();
  });

  it("calls window.location.reload when Reset is clicked", () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { reload: reloadMock },
    });

    render(
      <ErrorBoundary>
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(reloadMock).toHaveBeenCalled();
  });
});

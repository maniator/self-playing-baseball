import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary, isChunkLoadError } from "./ErrorBoundary";

/** Helper component that throws on first render. */
const Thrower: React.FunctionComponent<{ message?: string }> = ({ message }) => {
  if (message) throw new Error(message);
  return <div>Safe content</div>;
};

/** Throws an error whose .name is set to the given value. */
const NamedThrower: React.FunctionComponent<{ name: string; message: string }> = ({
  name,
  message,
}) => {
  const err = new Error(message);
  err.name = name;
  throw err;
};

describe("isChunkLoadError", () => {
  it("returns true for ChunkLoadError name", () => {
    const err = new Error("some chunk error");
    err.name = "ChunkLoadError";
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("returns true for ChunkLoadError in message", () => {
    expect(isChunkLoadError(new Error("ChunkLoadError: loading chunk 42 failed"))).toBe(true);
  });

  it("returns true for 'Loading chunk N failed' message", () => {
    expect(isChunkLoadError(new Error("Loading chunk 7 failed."))).toBe(true);
  });

  it("returns true for 'Failed to fetch dynamically imported module'", () => {
    expect(
      isChunkLoadError(new Error("Failed to fetch dynamically imported module: /assets/foo.js")),
    ).toBe(true);
  });

  it("returns true for 'error loading dynamically imported module' (case-insensitive)", () => {
    expect(
      isChunkLoadError(new Error("Error loading dynamically imported module /assets/bar.js")),
    ).toBe(true);
  });

  it("returns true for 'Unable to preload CSS'", () => {
    expect(isChunkLoadError(new Error("Unable to preload CSS for /assets/main.css"))).toBe(true);
  });

  it("returns true for a plain string value", () => {
    expect(isChunkLoadError("ChunkLoadError: failed")).toBe(true);
  });

  it("returns false for a generic runtime error", () => {
    expect(isChunkLoadError(new Error("test error message"))).toBe(false);
  });

  it("returns false for a DB/schema mismatch error", () => {
    expect(isChunkLoadError(new Error("RxError DB6: schema hash mismatch"))).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // Suppress the expected React error boundary console output in tests.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Safe content")).toBeTruthy();
  });

  describe("non-chunk error (DB/schema mismatch)", () => {
    it("shows Reset & Reload button", () => {
      render(
        <ErrorBoundary>
          <Thrower message="test error message" />
        </ErrorBoundary>,
      );
      expect(screen.getByText("⚾ Something went wrong")).toBeTruthy();
      expect(screen.getByText("test error message")).toBeTruthy();
      expect(screen.getByRole("button", { name: /reset/i })).toBeTruthy();
    });

    it("does NOT show Reload app or Hard reload buttons", () => {
      render(
        <ErrorBoundary>
          <Thrower message="RxError DB6: schema hash mismatch" />
        </ErrorBoundary>,
      );
      expect(screen.queryByRole("button", { name: /reload app/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /hard reload/i })).toBeNull();
    });

    it("calls window.location.reload when Reset is clicked", () => {
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { reload: reloadMock },
      });

      render(
        <ErrorBoundary>
          <Thrower message="test error message" />
        </ErrorBoundary>,
      );
      fireEvent.click(screen.getByRole("button", { name: /reset/i }));
      expect(reloadMock).toHaveBeenCalled();
    });
  });

  describe("chunk-load error", () => {
    it("shows Reload app and Hard reload buttons", () => {
      render(
        <ErrorBoundary>
          <Thrower message="Failed to fetch dynamically imported module: /assets/chunk-abc.js" />
        </ErrorBoundary>,
      );
      expect(screen.getByRole("button", { name: /reload app/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /hard reload/i })).toBeTruthy();
    });

    it("does NOT show Reset & Reload button", () => {
      render(
        <ErrorBoundary>
          <Thrower message="Loading chunk 3 failed." />
        </ErrorBoundary>,
      );
      expect(screen.queryByRole("button", { name: /reset/i })).toBeNull();
    });

    it("shows the update hint copy", () => {
      render(
        <ErrorBoundary>
          <Thrower message="Loading chunk 3 failed." />
        </ErrorBoundary>,
      );
      expect(screen.getByText(/this usually happens after an update/i)).toBeTruthy();
    });

    it("calls window.location.reload when Reload app is clicked", () => {
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { reload: reloadMock },
      });

      render(
        <ErrorBoundary>
          <Thrower message="Failed to fetch dynamically imported module: /assets/foo.js" />
        </ErrorBoundary>,
      );
      fireEvent.click(screen.getByRole("button", { name: /reload app/i }));
      expect(reloadMock).toHaveBeenCalled();
    });

    it("also works for ChunkLoadError by error name", () => {
      render(
        <ErrorBoundary>
          <NamedThrower name="ChunkLoadError" message="chunk load failed" />
        </ErrorBoundary>,
      );
      expect(screen.getByRole("button", { name: /reload app/i })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /reset/i })).toBeNull();
    });
  });
});

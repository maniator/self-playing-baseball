import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ContactPage from "./index";

const renderPage = (initialPath = "/contact") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<div data-testid="home-page-mock" />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ContactPage", () => {
  beforeEach(() => {
    // Default to online state
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders contact page content", () => {
    renderPage();

    expect(screen.getByTestId("contact-page")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /naftali@lubin.dev/i })).toHaveAttribute(
      "href",
      "mailto:naftali@lubin.dev",
    );
  });

  it("renders GitHub issue link pointing to the correct repo when online", () => {
    renderPage();

    const link = screen.getByTestId("contact-page-issue-link");
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("https://github.com/maniator/blipit-legends/issues/new"),
    );
    // Should include template and labels params
    expect(link).toHaveAttribute("href", expect.stringContaining("template=bug_report.md"));
    expect(link).toHaveAttribute("href", expect.stringContaining("labels=bug"));
    // Should include pre-filled environment info
    expect(link).toHaveAttribute("href", expect.stringContaining("Environment"));
  });

  it("shows offline note instead of GitHub link when offline", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

    renderPage();

    expect(screen.queryByTestId("contact-page-issue-link")).not.toBeInTheDocument();
    expect(screen.getByTestId("contact-page-offline-note")).toBeInTheDocument();
  });

  it("switches to offline note when window fires the offline event", () => {
    renderPage();

    // Initially online — link is visible
    expect(screen.getByTestId("contact-page-issue-link")).toBeInTheDocument();

    act(() => {
      fireEvent(window, new Event("offline"));
    });

    expect(screen.queryByTestId("contact-page-issue-link")).not.toBeInTheDocument();
    expect(screen.getByTestId("contact-page-offline-note")).toBeInTheDocument();
  });

  it("switches back to GitHub link when window fires the online event", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    renderPage();

    // Initially offline — note is visible
    expect(screen.getByTestId("contact-page-offline-note")).toBeInTheDocument();

    act(() => {
      fireEvent(window, new Event("online"));
    });

    expect(screen.queryByTestId("contact-page-offline-note")).not.toBeInTheDocument();
    expect(screen.getByTestId("contact-page-issue-link")).toBeInTheDocument();
  });

  it("shows extra hint copy when opened from error boundary", () => {
    renderPage("/contact?source=error-boundary");

    expect(screen.getByTestId("contact-page-error-boundary-hint")).toBeInTheDocument();
  });

  it("includes source=error-boundary in issue URL when opened from error boundary", () => {
    renderPage("/contact?source=error-boundary");

    const link = screen.getByTestId("contact-page-issue-link");
    expect(link).toHaveAttribute("href", expect.stringContaining("error-boundary"));
  });
});

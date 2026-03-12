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
    const emailLink = screen.getByRole("link", { name: /naftali@lubin.dev/i });
    expect(emailLink).toHaveAttribute("href", expect.stringContaining("mailto:naftali@lubin.dev"));
    expect(emailLink).toHaveAttribute("href", expect.stringContaining("subject="));
    expect(emailLink).toHaveAttribute("href", expect.stringContaining("body="));
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

  it("pre-fills email subject and body with environment info", () => {
    renderPage();

    const emailLink = screen.getByTestId("contact-page-email-link");
    const href = emailLink.getAttribute("href") ?? "";
    const decoded = decodeURIComponent(href);
    expect(decoded).toContain("mailto:naftali@lubin.dev");
    expect(decoded).toContain("Bug report");
    expect(decoded).toContain("Browser/UA:");
    expect(decoded).toContain("URL:");
    // Uses the same template structure as the GitHub issue form
    expect(decoded).toContain("**Describe the bug**");
    expect(decoded).toContain("**To Reproduce**");
    expect(decoded).toContain("**Expected behavior**");
  });

  it("email includes source=error-boundary when opened from error boundary", () => {
    renderPage("/contact?source=error-boundary");

    const emailLink = screen.getByTestId("contact-page-email-link");
    expect(decodeURIComponent(emailLink.getAttribute("href") ?? "")).toContain("error-boundary");
  });

  it("email uses url param as reported URL when provided", () => {
    renderPage("/contact?source=error-boundary&url=https%3A%2F%2Fexample.com%2Fgame");

    const emailLink = screen.getByTestId("contact-page-email-link");
    expect(decodeURIComponent(emailLink.getAttribute("href") ?? "")).toContain(
      "https://example.com/game",
    );
  });
});

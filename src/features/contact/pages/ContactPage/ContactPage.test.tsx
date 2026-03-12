import * as React from "react";

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

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
  it("renders contact page content", () => {
    renderPage();

    expect(screen.getByTestId("contact-page")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /naftali@lubin.dev/i })).toHaveAttribute(
      "href",
      "mailto:naftali@lubin.dev",
    );
  });

  it("renders GitHub issue shortcut link", () => {
    renderPage();

    expect(screen.getByTestId("contact-page-issue-link")).toHaveAttribute(
      "href",
      "https://github.com/maniator/self-playing-baseball/issues/new?template=bug_report.md&labels=bug",
    );
  });

  it("shows extra hint copy when opened from error boundary", () => {
    renderPage("/contact?source=error-boundary");

    expect(screen.getByTestId("contact-page-error-boundary-hint")).toBeInTheDocument();
  });
});

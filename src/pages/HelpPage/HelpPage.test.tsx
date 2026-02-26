import * as React from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import HelpPage from "./index";

function renderHelpPage() {
  return render(
    <MemoryRouter initialEntries={["/help"]}>
      <Routes>
        <Route path="/help" element={<HelpPage />} />
        <Route index element={<div data-testid="home-screen" />} />
        <Route path="/" element={<div data-testid="home-screen" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("HelpPage", () => {
  it("renders the help page", () => {
    renderHelpPage();
    expect(screen.getByTestId("help-page")).toBeInTheDocument();
  });

  it("shows the How to Play heading", () => {
    renderHelpPage();
    expect(screen.getByText(/how to play/i)).toBeInTheDocument();
  });

  it("shows a back button", () => {
    renderHelpPage();
    expect(screen.getByTestId("help-page-back-button")).toBeInTheDocument();
  });

  it("back button navigates back in history", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/", "/help"]}>
        <Routes>
          <Route path="/" element={<div data-testid="home-screen" />} />
          <Route path="/help" element={<HelpPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("help-page")).toBeInTheDocument();
    await user.click(screen.getByTestId("help-page-back-button"));
    expect(screen.getByTestId("home-screen")).toBeInTheDocument();
  });

  it("shows help content sections", () => {
    renderHelpPage();
    expect(screen.getByText("Basics")).toBeInTheDocument();
    expect(screen.getByText("Game Flow")).toBeInTheDocument();
    // Manager Mode appears as a section header and in body text — use getAllBy
    expect(screen.getAllByText(/manager mode/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/saves.*sharing/i)).toBeInTheDocument();
  });
});

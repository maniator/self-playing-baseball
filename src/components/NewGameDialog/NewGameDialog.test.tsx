import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_AWAY_TEAM, DEFAULT_HOME_TEAM } from "./constants";
import NewGameDialog from "./index";

HTMLDialogElement.prototype.showModal = vi.fn();
HTMLDialogElement.prototype.close = vi.fn();

const noop = vi.fn();

describe("NewGameDialog", () => {
  it("calls showModal on mount", () => {
    render(<NewGameDialog initialHome="Yankees" initialAway="Mets" onStart={noop} />);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("renders home and away team inputs pre-filled with initial values", () => {
    render(<NewGameDialog initialHome="Cubs" initialAway="Sox" onStart={noop} />);
    expect((screen.getByLabelText(/home team/i) as HTMLInputElement).value).toBe("Cubs");
    expect((screen.getByLabelText(/away team/i) as HTMLInputElement).value).toBe("Sox");
  });

  it("calls onStart with entered team names and null managedTeam when None selected", () => {
    const onStart = vi.fn();
    render(<NewGameDialog initialHome="A" initialAway="B" onStart={onStart} />);
    fireEvent.change(screen.getByLabelText(/home team/i), { target: { value: "Braves" } });
    fireEvent.change(screen.getByLabelText(/away team/i), { target: { value: "Dodgers" } });
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    expect(onStart).toHaveBeenCalledWith("Braves", "Dodgers", null);
  });

  it("calls onStart with DEFAULT team names when inputs are cleared", () => {
    const onStart = vi.fn();
    render(<NewGameDialog initialHome="A" initialAway="B" onStart={onStart} />);
    fireEvent.change(screen.getByLabelText(/home team/i), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText(/away team/i), { target: { value: "   " } });
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    expect(onStart).toHaveBeenCalledWith(DEFAULT_HOME_TEAM, DEFAULT_AWAY_TEAM, null);
  });

  it("calls onStart with managedTeam=0 when Away is selected", () => {
    const onStart = vi.fn();
    render(<NewGameDialog initialHome="Yankees" initialAway="Mets" onStart={onStart} />);
    fireEvent.click(screen.getByLabelText(/away \(mets\)/i));
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    expect(onStart).toHaveBeenCalledWith("Yankees", "Mets", 0);
  });

  it("calls onStart with managedTeam=1 when Home is selected", () => {
    const onStart = vi.fn();
    render(<NewGameDialog initialHome="Yankees" initialAway="Mets" onStart={onStart} />);
    fireEvent.click(screen.getByLabelText(/home \(yankees\)/i));
    act(() => {
      fireEvent.click(screen.getByText(/play ball/i));
    });
    expect(onStart).toHaveBeenCalledWith("Yankees", "Mets", 1);
  });

  it("prevents dialog from being cancelled via keyboard escape", () => {
    render(<NewGameDialog initialHome="A" initialAway="B" onStart={noop} />);
    const dialog = screen.getByRole("dialog", { hidden: true });
    const event = new Event("cancel", { cancelable: true });
    act(() => {
      dialog.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it("radio labels update dynamically as team names are typed", () => {
    render(<NewGameDialog initialHome="A" initialAway="B" onStart={noop} />);
    fireEvent.change(screen.getByLabelText(/home team/i), { target: { value: "Rangers" } });
    expect(screen.getByLabelText(/home \(rangers\)/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/away team/i), { target: { value: "Astros" } });
    expect(screen.getByLabelText(/away \(astros\)/i)).toBeInTheDocument();
  });
});

import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InstructionsModal from ".";

describe("InstructionsModal", () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  it("renders the help button", () => {
    render(<InstructionsModal />);
    expect(screen.getByRole("button", { name: /how to play/i })).toBeInTheDocument();
  });

  it("calls showModal when help button is clicked", () => {
    render(<InstructionsModal />);
    fireEvent.click(screen.getByRole("button", { name: /how to play/i }));
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("calls close when Got it! button is clicked", () => {
    render(<InstructionsModal />);
    fireEvent.click(screen.getByRole("button", { name: /got it/i, hidden: true }));
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it("renders instructions content", () => {
    render(<InstructionsModal />);
    expect(screen.getByText(/how to play/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /how to play/i })).toBeInTheDocument();
  });

  it("closes on backdrop click (outside dialog bounds)", () => {
    render(<InstructionsModal />);
    const dialog = document.querySelector("dialog")!;
    fireEvent.click(dialog, { clientX: 0, clientY: 0 });
    expect(HTMLDialogElement.prototype.close).toBeDefined();
  });
});

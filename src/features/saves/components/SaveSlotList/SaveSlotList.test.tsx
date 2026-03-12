import * as React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@storage/saveIO", () => ({
  formatSaveDate: vi.fn(() => "Jan 1, 2025"),
}));

// jsdom doesn't implement window.confirm; provide a controllable mock.
const confirmMock = vi.fn(() => true);
vi.stubGlobal("confirm", confirmMock);

import type { SaveDoc } from "@storage/types";

import SaveSlotList from "./index";

const makeSave = (overrides: Partial<SaveDoc> = {}): SaveDoc =>
  ({
    id: "save_1",
    name: "Test Save",
    seed: "abc",
    homeTeamId: "Home",
    awayTeamId: "Away",
    createdAt: 1000,
    updatedAt: 2000,
    progressIdx: 0,
    schemaVersion: 1,
    ...overrides,
  }) as SaveDoc;

const defaultProps = {
  saves: [makeSave()],
  onLoad: vi.fn(),
  onExport: vi.fn(),
  onDelete: vi.fn(),
};

describe("SaveSlotList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmMock.mockReturnValue(true);
  });

  it("renders save slot items", () => {
    render(<SaveSlotList {...defaultProps} />);
    expect(screen.getByText("Test Save")).toBeInTheDocument();
  });

  it("shows a delete button for each save", () => {
    render(<SaveSlotList {...defaultProps} />);
    expect(screen.getByTestId("delete-save-button")).toBeInTheDocument();
  });

  it("calls window.confirm before deleting a save", () => {
    const onDelete = vi.fn();
    render(<SaveSlotList {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByTestId("delete-save-button"));
    expect(confirmMock).toHaveBeenCalledWith("Delete this save? This cannot be undone.");
  });

  it("calls onDelete with the save id when confirm returns true", () => {
    const onDelete = vi.fn();
    render(<SaveSlotList {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByTestId("delete-save-button"));
    expect(onDelete).toHaveBeenCalledWith("save_1");
  });

  it("does NOT call onDelete when confirm returns false", () => {
    confirmMock.mockReturnValue(false);
    const onDelete = vi.fn();
    render(<SaveSlotList {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByTestId("delete-save-button"));
    expect(onDelete).not.toHaveBeenCalled();
  });
});

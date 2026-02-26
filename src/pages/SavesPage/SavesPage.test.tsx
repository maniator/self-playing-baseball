import * as React from "react";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock SaveStore so tests don't need IndexedDB
vi.mock("@storage/saveStore", () => ({
  SaveStore: {
    listSaves: vi.fn().mockResolvedValue([]),
    deleteSave: vi.fn().mockResolvedValue(undefined),
    exportRxdbSave: vi.fn().mockResolvedValue("{}"),
    importRxdbSave: vi.fn().mockResolvedValue({ id: "save_1", name: "Test Save" }),
  },
}));

import { SaveStore } from "@storage/saveStore";
import type { SaveDoc } from "@storage/types";

import SavesPage from "./index";

const mockOnLoadSave = vi.fn();

/** Wraps SavesPage inside a MemoryRouter with outlet context. */
function renderSavesPage(initialPath = "/saves") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/"
          element={<Outlet context={{ onLoadSave: mockOnLoadSave, onStartGame: vi.fn() }} />}
        >
          <Route path="saves" element={<SavesPage />} />
          <Route index element={<div data-testid="home-screen" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const makeSave = (overrides: Partial<SaveDoc> = {}): SaveDoc =>
  ({
    id: "save_1",
    name: "Team A vs Team B",
    seed: "abc123",
    matchupMode: "manual",
    homeTeamId: "TeamB",
    awayTeamId: "TeamA",
    createdAt: 1000000,
    updatedAt: 1000000,
    progressIdx: 0,
    schemaVersion: 1,
    ...overrides,
  }) as SaveDoc;

describe("SavesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SaveStore.listSaves).mockResolvedValue([]);
  });

  it("renders the saves page", async () => {
    renderSavesPage();
    await waitFor(() => expect(screen.getByTestId("saves-page")).toBeInTheDocument());
  });

  it("shows empty state when no saves exist", async () => {
    renderSavesPage();
    await waitFor(() => expect(screen.getByTestId("saves-page-empty")).toBeInTheDocument());
    expect(screen.getByText(/no saves yet/i)).toBeInTheDocument();
  });

  it("shows saves list when saves exist", async () => {
    vi.mocked(SaveStore.listSaves).mockResolvedValue([makeSave()]);
    renderSavesPage();
    await waitFor(() => expect(screen.getByTestId("saves-list")).toBeInTheDocument());
    expect(screen.getByText("Team A vs Team B")).toBeInTheDocument();
  });

  it("calls onLoadSave when Load button is clicked", async () => {
    const save = makeSave();
    vi.mocked(SaveStore.listSaves).mockResolvedValue([save]);
    const user = userEvent.setup();
    renderSavesPage();
    await waitFor(() => expect(screen.getByTestId("load-save-button")).toBeInTheDocument());
    await user.click(screen.getByTestId("load-save-button"));
    expect(mockOnLoadSave).toHaveBeenCalledWith(save);
  });

  it("deletes a save when Delete button is clicked", async () => {
    const save = makeSave();
    vi.mocked(SaveStore.listSaves).mockResolvedValue([save]);
    const user = userEvent.setup();
    renderSavesPage();
    await waitFor(() => expect(screen.getByTestId("delete-save-button")).toBeInTheDocument());
    await user.click(screen.getByTestId("delete-save-button"));
    expect(SaveStore.deleteSave).toHaveBeenCalledWith("save_1");
  });

  it("shows import file input", async () => {
    renderSavesPage();
    await waitFor(() => expect(screen.getByTestId("saves-page")).toBeInTheDocument());
    expect(screen.getByTestId("import-save-file-input")).toBeInTheDocument();
  });

  it("Back to Home button navigates to /", async () => {
    renderSavesPage();
    await waitFor(() => expect(screen.getByTestId("saves-page-back-button")).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByTestId("saves-page-back-button"));
    expect(screen.getByTestId("home-screen")).toBeInTheDocument();
  });

  it("shows import error when import fails", async () => {
    vi.mocked(SaveStore.importRxdbSave).mockRejectedValue(new Error("Invalid JSON"));
    const user = userEvent.setup();
    renderSavesPage();
    await waitFor(() => expect(screen.getByTestId("saves-page")).toBeInTheDocument());

    const file = new File(['{"invalid": true}'], "save.json", { type: "application/json" });
    const input = screen.getByTestId("import-save-file-input");
    await user.upload(input, file);

    await waitFor(() => expect(screen.getByTestId("import-error")).toBeInTheDocument());
    expect(screen.getByText(/invalid json/i)).toBeInTheDocument();
  });

  it("calls onLoadSave after successful file import", async () => {
    const importedSave = makeSave({ id: "imported_save" });
    vi.mocked(SaveStore.importRxdbSave).mockResolvedValue(importedSave);
    const user = userEvent.setup();
    renderSavesPage();
    await waitFor(() => expect(screen.getByTestId("saves-page")).toBeInTheDocument());

    const file = new File(['{"valid": true}'], "save.json", { type: "application/json" });
    const input = screen.getByTestId("import-save-file-input");
    await user.upload(input, file);

    await waitFor(() => expect(mockOnLoadSave).toHaveBeenCalledWith(importedSave));
  });

  it("calls exportRxdbSave when Export button is clicked", async () => {
    const save = makeSave();
    vi.mocked(SaveStore.listSaves).mockResolvedValue([save]);
    vi.mocked(SaveStore.exportRxdbSave).mockResolvedValue(JSON.stringify({ test: "data" }));
    const user = userEvent.setup();
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const createObjectURL = vi.fn().mockReturnValue("blob:test");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window, "URL", {
      value: { createObjectURL, revokeObjectURL },
      writable: true,
    });
    renderSavesPage();
    await waitFor(() => expect(screen.getByTestId("export-save-button")).toBeInTheDocument());
    await user.click(screen.getByTestId("export-save-button"));
    await waitFor(() => expect(SaveStore.exportRxdbSave).toHaveBeenCalledWith("save_1"));
  });
});

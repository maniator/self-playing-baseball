import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Strategy } from "@context/index";
import { GameContext } from "@context/index";
import * as saveStoreModule from "@storage/saveStore";
import type { SaveDoc } from "@storage/types";
import { makeContextValue, makeState } from "@test/testHelpers";

import SavesModal from ".";

HTMLDialogElement.prototype.showModal = vi.fn().mockImplementation(function (
  this: HTMLDialogElement,
) {
  this.setAttribute("open", "");
});
HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
});

vi.mock("@storage/saveStore", () => ({
  SaveStore: {
    listSaves: vi.fn().mockResolvedValue([]),
    createSave: vi.fn().mockResolvedValue("rxdb-save-1"),
    updateProgress: vi.fn().mockResolvedValue(undefined),
    deleteSave: vi.fn().mockResolvedValue(undefined),
    exportRxdbSave: vi.fn().mockResolvedValue('{"version":1,"header":{},"events":[],"sig":"abc"}'),
    importRxdbSave: vi.fn().mockResolvedValue("imported-id"),
  },
}));

vi.mock("@utils/rng", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/rng")>();
  return {
    ...actual,
    getRngState: vi.fn().mockReturnValue(42),
    currentSeedStr: vi.fn().mockReturnValue("abc"),
  };
});

const noop = vi.fn();

const makeSlot = (overrides: Partial<SaveDoc> = {}): SaveDoc => ({
  id: "save_1",
  name: "Test save",
  createdAt: 1000,
  updatedAt: 2000,
  seed: "abc",
  matchupMode: "default",
  homeTeamId: "Home",
  awayTeamId: "Away",
  progressIdx: 5,
  setup: {
    homeTeam: "Home",
    awayTeam: "Away",
    strategy: "balanced" as Strategy,
    managedTeam: 0,
    managerMode: false,
  },
  stateSnapshot: {
    state: makeState() as unknown as Record<string, unknown>,
    rngState: 42,
  },
  schemaVersion: 1,
  ...overrides,
});

const renderModal = (
  props: Partial<React.ComponentProps<typeof SavesModal>> = {},
  ctxOverrides: Partial<ReturnType<typeof makeContextValue>> = {},
) =>
  render(
    <GameContext.Provider value={makeContextValue(ctxOverrides)}>
      <SavesModal
        strategy="balanced"
        managedTeam={0}
        managerMode={false}
        currentSaveId={null}
        onSaveIdChange={noop}
        {...props}
      />
    </GameContext.Provider>,
  );

const openPanel = () =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /open saves panel/i }));
  });

describe("SavesModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveStoreModule.SaveStore.listSaves).mockResolvedValue([]);
    HTMLDialogElement.prototype.showModal = vi.fn().mockImplementation(function (
      this: HTMLDialogElement,
    ) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (
      this: HTMLDialogElement,
    ) {
      this.removeAttribute("open");
    });
  });

  it("renders the Saves button", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /open saves panel/i })).toBeInTheDocument();
  });

  it("opens the dialog when Saves button is clicked", async () => {
    renderModal();
    await openPanel();
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /save current game/i })).toBeInTheDocument();
  });

  it("shows 'Update save' when currentSaveId is provided", async () => {
    renderModal({ currentSaveId: "save_1" });
    await openPanel();
    expect(screen.getByRole("button", { name: /update save/i })).toBeInTheDocument();
  });

  it("calls updateProgress and onSaveIdChange when Update save button is clicked (existing save)", async () => {
    const onSaveIdChange = vi.fn();
    renderModal({ currentSaveId: "save_1", onSaveIdChange });
    await openPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /update save/i }));
    });
    expect(saveStoreModule.SaveStore.updateProgress).toHaveBeenCalledWith(
      "save_1",
      expect.any(Number),
      expect.any(Object),
    );
  });

  it("calls createSave when Save current game is clicked", async () => {
    renderModal();
    await openPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save current game/i }));
    });
    expect(saveStoreModule.SaveStore.createSave).toHaveBeenCalled();
  });

  it("shows saved slot name after opening", async () => {
    vi.mocked(saveStoreModule.SaveStore.listSaves).mockResolvedValue([makeSlot()]);
    renderModal();
    await openPanel();
    expect(screen.getByText("Test save")).toBeInTheDocument();
  });

  it("calls dispatch + onSaveIdChange when Load is clicked", async () => {
    const slot = makeSlot();
    vi.mocked(saveStoreModule.SaveStore.listSaves).mockResolvedValue([slot]);
    const onSaveIdChange = vi.fn();
    const dispatch = vi.fn();
    renderModal({ onSaveIdChange }, { dispatch });
    await openPanel();
    fireEvent.click(screen.getAllByRole("button", { name: /^load$/i })[0]);
    expect(dispatch).toHaveBeenCalledWith({
      type: "restore_game",
      payload: slot.stateSnapshot?.state,
    });
    expect(onSaveIdChange).toHaveBeenCalledWith(slot.id);
  });

  it("calls onSetupRestore with setup fields when Load is clicked", async () => {
    const slot = makeSlot();
    vi.mocked(saveStoreModule.SaveStore.listSaves).mockResolvedValue([slot]);
    const onSetupRestore = vi.fn();
    renderModal({ onSetupRestore });
    await openPanel();
    fireEvent.click(screen.getAllByRole("button", { name: /^load$/i })[0]);
    expect(onSetupRestore).toHaveBeenCalledWith({
      strategy: "balanced",
      managedTeam: 0,
      managerMode: false,
    });
  });

  it("calls SaveStore.deleteSave when ✕ is clicked", async () => {
    vi.mocked(saveStoreModule.SaveStore.listSaves).mockResolvedValue([makeSlot()]);
    renderModal();
    await openPanel();
    fireEvent.click(screen.getByRole("button", { name: /delete save/i }));
    expect(saveStoreModule.SaveStore.deleteSave).toHaveBeenCalledWith("save_1");
  });

  it("calls onSaveIdChange(null) when the current save is deleted", async () => {
    const onSaveIdChange = vi.fn();
    vi.mocked(saveStoreModule.SaveStore.listSaves).mockResolvedValue([makeSlot()]);
    renderModal({ currentSaveId: "save_1", onSaveIdChange });
    await openPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /delete save/i }));
    });
    expect(onSaveIdChange).toHaveBeenCalledWith(null);
  });

  it("shows an error message when import text is invalid JSON", async () => {
    vi.mocked(saveStoreModule.SaveStore.importRxdbSave).mockRejectedValue(
      new Error("Invalid JSON"),
    );
    renderModal();
    await openPanel();
    fireEvent.change(screen.getByRole("textbox", { name: /import save json/i }), {
      target: { value: "not-json" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /import from text/i }));
    });
    expect(screen.getByText("Invalid JSON")).toBeInTheDocument();
  });

  it("calls importRxdbSave on successful paste import", async () => {
    renderModal();
    await openPanel();
    fireEvent.change(screen.getByRole("textbox", { name: /import save json/i }), {
      target: { value: '{"valid":"json"}' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /import from text/i }));
    });
    expect(saveStoreModule.SaveStore.importRxdbSave).toHaveBeenCalledWith('{"valid":"json"}');
  });

  it("shows 'Failed to read file' when FileReader errors", async () => {
    const mockReader = {
      onload: null as ((e: ProgressEvent) => void) | null,
      onerror: null as (() => void) | null,
      readAsText: vi.fn().mockImplementation(function (this: typeof mockReader) {
        this.onerror?.();
      }),
    };
    vi.spyOn(global, "FileReader").mockImplementation(() => mockReader as unknown as FileReader);

    const { container } = renderModal();
    await openPanel();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, "files", {
      value: [new File(["bad"], "bad.json", { type: "application/json" })],
    });
    await act(async () => {
      fireEvent.change(fileInput);
    });
    expect(screen.getByText(/failed to read file/i)).toBeInTheDocument();
  });

  it("calls exportRxdbSave and createObjectURL when Export is clicked", async () => {
    const slot = makeSlot();
    vi.mocked(saveStoreModule.SaveStore.listSaves).mockResolvedValue([slot]);
    (URL as unknown as Record<string, unknown>).createObjectURL = vi
      .fn()
      .mockReturnValue("blob:fake");
    (URL as unknown as Record<string, unknown>).revokeObjectURL = vi.fn();
    try {
      renderModal();
      await openPanel();
      await act(async () => {
        fireEvent.click(screen.getAllByRole("button", { name: /^export$/i })[0]);
      });
      expect(saveStoreModule.SaveStore.exportRxdbSave).toHaveBeenCalledWith(slot.id);
    } finally {
      delete (URL as unknown as Record<string, unknown>).createObjectURL;
      delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
    }
  });

  it("updates URL seed on load", async () => {
    const slot = makeSlot({ seed: "xyzseed" });
    vi.mocked(saveStoreModule.SaveStore.listSaves).mockResolvedValue([slot]);
    renderModal();
    await openPanel();
    const spy = vi.spyOn(window.history, "replaceState");
    fireEvent.click(screen.getAllByRole("button", { name: /^load$/i })[0]);
    const calledUrl = spy.mock.calls[0]?.[2] as string;
    expect(calledUrl).toContain("xyzseed");
    spy.mockRestore();
  });
});

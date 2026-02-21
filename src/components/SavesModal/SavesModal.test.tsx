import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Strategy } from "@context/index";
import { GameContext } from "@context/index";
import type { SaveStoreHook } from "@hooks/useSaveStore";
import { useSaveStore } from "@hooks/useSaveStore";
import { SaveStore } from "@storage/saveStore";
import type { GameSaveSetup, SaveDoc } from "@storage/types";
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

const mockSetup: GameSaveSetup = {
  strategy: "balanced" as Strategy,
  managedTeam: null,
  managerMode: false,
  homeTeam: "Home",
  awayTeam: "Away",
  playerOverrides: [{}, {}],
  lineupOrder: [[], []],
};

const makeSlot = (overrides: Partial<SaveDoc> = {}): SaveDoc => ({
  id: "save_1",
  name: "Test save",
  createdAt: 1000,
  updatedAt: 2000,
  seed: "abc",
  matchupMode: "manual",
  homeTeamId: "Home",
  awayTeamId: "Away",
  progressIdx: 5,
  setup: mockSetup,
  schemaVersion: 1,
  ...overrides,
});

vi.mock("@storage/saveStore", () => ({
  SaveStore: {
    listSaves: vi.fn().mockResolvedValue([]),
    createSave: vi.fn().mockResolvedValue("save_1"),
    updateProgress: vi.fn().mockResolvedValue(undefined),
    deleteSave: vi.fn().mockResolvedValue(undefined),
    exportRxdbSave: vi.fn().mockResolvedValue('{"version":1,"sig":"abc","header":{},"events":[]}'),
    importRxdbSave: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock useSaveStore so tests can control the saves list without needing a real
// RxDB subscription (the hook now uses savesCollection() rather than listSaves).
vi.mock("@hooks/useSaveStore");

// Routes hook write-operations through the mocked SaveStore so existing
// `expect(SaveStore.X).toHaveBeenCalled()` assertions still pass.
const makeSaveStoreHook = (saves: SaveDoc[] = []): SaveStoreHook => ({
  saves,
  savesLoading: false,
  createSave: SaveStore.createSave,
  appendEvents: vi.fn().mockResolvedValue(undefined),
  updateProgress: SaveStore.updateProgress,
  deleteSave: SaveStore.deleteSave,
  exportRxdbSave: SaveStore.exportRxdbSave,
  importRxdbSave: SaveStore.importRxdbSave,
});

vi.mock("@utils/rng", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/rng")>();
  return { ...actual, getRngState: vi.fn().mockReturnValue(42) };
});

vi.mock("@utils/saves", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/saves")>();
  return { ...actual, currentSeedStr: vi.fn().mockReturnValue("abc") };
});

const noop = vi.fn();

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

/** Clicks the Saves button to open the dialog. */
const openPanel = () =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /open saves panel/i }));
  });

describe("SavesModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { SaveStore } = await import("@storage/saveStore");
    vi.mocked(SaveStore.listSaves).mockResolvedValue([]);
    // Default: empty saves list
    vi.mocked(useSaveStore).mockReturnValue(makeSaveStoreHook([]));
    // Restore showModal/close mock implementations after vi.clearAllMocks()
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

  it("calls SaveStore.createSave and onSaveIdChange when save button is clicked", async () => {
    const { SaveStore } = await import("@storage/saveStore");
    const onSaveIdChange = vi.fn();
    renderModal({ onSaveIdChange });
    await openPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save current game/i }));
      await vi.waitFor(() => expect(SaveStore.createSave).toHaveBeenCalled());
    });
    expect(onSaveIdChange).toHaveBeenCalledWith("save_1");
  });

  it("shows saved slot name after opening", async () => {
    vi.mocked(useSaveStore).mockReturnValue(makeSaveStoreHook([makeSlot()]));
    renderModal();
    await openPanel();
    expect(screen.getByText("Test save")).toBeInTheDocument();
  });

  it("calls SaveStore.updateProgress + dispatch + onSaveIdChange when Load is clicked", async () => {
    const slot = makeSlot({
      stateSnapshot: { state: makeState(), rngState: 42 },
    });
    vi.mocked(useSaveStore).mockReturnValue(makeSaveStoreHook([slot]));
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

  it("calls onSetupRestore with typed setup when Load is clicked", async () => {
    const slot = makeSlot();
    vi.mocked(useSaveStore).mockReturnValue(makeSaveStoreHook([slot]));
    const onSetupRestore = vi.fn();
    renderModal({ onSetupRestore });
    await openPanel();
    fireEvent.click(screen.getAllByRole("button", { name: /^load$/i })[0]);
    expect(onSetupRestore).toHaveBeenCalledWith({
      strategy: slot.setup.strategy,
      managedTeam: slot.setup.managedTeam ?? 0,
      managerMode: slot.setup.managerMode,
    });
  });

  it("calls SaveStore.deleteSave when ✕ is clicked", async () => {
    vi.mocked(useSaveStore).mockReturnValue(makeSaveStoreHook([makeSlot()]));
    renderModal();
    await openPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /delete save/i }));
    });
    expect(SaveStore.deleteSave).toHaveBeenCalledWith("save_1");
  });

  it("shows an error message when import text is invalid", async () => {
    const { SaveStore } = await import("@storage/saveStore");
    vi.mocked(SaveStore.importRxdbSave).mockRejectedValue(new Error("Invalid JSON"));
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

  it("calls SaveStore.importRxdbSave on successful paste import", async () => {
    const { SaveStore } = await import("@storage/saveStore");
    renderModal();
    await openPanel();
    fireEvent.change(screen.getByRole("textbox", { name: /import save json/i }), {
      target: { value: '{"valid":"json"}' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /import from text/i }));
    });
    expect(SaveStore.importRxdbSave).toHaveBeenCalledWith('{"valid":"json"}');
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

  it("calls onSaveIdChange(null) when the current save is deleted", async () => {
    const onSaveIdChange = vi.fn();
    vi.mocked(useSaveStore).mockReturnValue(makeSaveStoreHook([makeSlot()]));
    renderModal({ currentSaveId: "save_1", onSaveIdChange });
    await openPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /delete save/i }));
    });
    expect(onSaveIdChange).toHaveBeenCalledWith(null);
  });

  it("calls SaveStore.exportRxdbSave and createObjectURL when Export is clicked", async () => {
    const { SaveStore } = await import("@storage/saveStore");
    const slot = makeSlot();
    vi.mocked(useSaveStore).mockReturnValue(makeSaveStoreHook([slot]));
    (URL as unknown as Record<string, unknown>).createObjectURL = vi
      .fn()
      .mockReturnValue("blob:fake");
    (URL as unknown as Record<string, unknown>).revokeObjectURL = vi.fn();
    try {
      renderModal();
      await openPanel();
      await act(async () => {
        fireEvent.click(screen.getAllByRole("button", { name: /^export$/i })[0]);
        await vi.waitFor(() =>
          expect((URL as unknown as Record<string, unknown>).createObjectURL).toHaveBeenCalled(),
        );
      });
      expect(SaveStore.exportRxdbSave).toHaveBeenCalledWith(slot.id);
    } finally {
      delete (URL as unknown as Record<string, unknown>).createObjectURL;
      delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
    }
  });

  it("updates URL seed on load", async () => {
    const slot = makeSlot({ seed: "xyzseed" });
    vi.mocked(useSaveStore).mockReturnValue(makeSaveStoreHook([slot]));
    renderModal();
    await openPanel();
    const spy = vi.spyOn(window.history, "replaceState");
    fireEvent.click(screen.getAllByRole("button", { name: /^load$/i })[0]);
    const calledUrl = spy.mock.calls[0]?.[2] as string;
    expect(calledUrl).toContain("xyzseed");
    spy.mockRestore();
  });
});

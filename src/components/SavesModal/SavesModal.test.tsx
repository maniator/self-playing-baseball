import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Strategy } from "@context/index";
import { GameContext } from "@context/index";
import { makeContextValue, makeState } from "@test/testHelpers";
import * as rngModule from "@utils/rng";
import type { SaveSlot } from "@utils/saves";
import * as savesModule from "@utils/saves";

import SavesModal from ".";

HTMLDialogElement.prototype.showModal = vi.fn().mockImplementation(function (
  this: HTMLDialogElement,
) {
  this.setAttribute("open", "");
});
HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
});

vi.mock("@utils/saves", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/saves")>();
  return {
    ...actual,
    loadSaves: vi.fn().mockReturnValue([]),
    loadAutoSave: vi.fn().mockReturnValue(null),
    saveGame: vi.fn().mockImplementation((s: Partial<SaveSlot>) => ({
      ...s,
      id: s.id ?? "save_1",
      createdAt: 1000,
      updatedAt: 2000,
    })),
    deleteSave: vi.fn(),
    exportSave: vi.fn().mockReturnValue('{"version":1,"sig":"abc","save":{}}'),
    importSave: vi.fn(),
    restoreSaveRng: vi.fn(),
    currentSeedStr: vi.fn().mockReturnValue("abc"),
  };
});

vi.mock("@utils/rng", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/rng")>();
  return { ...actual, getRngState: vi.fn().mockReturnValue(42) };
});

const noop = vi.fn();

const makeSlot = (overrides: Partial<SaveSlot> = {}): SaveSlot => ({
  id: "save_1",
  name: "Test save",
  createdAt: 1000,
  updatedAt: 2000,
  seed: "abc",
  progress: 5,
  managerActions: [],
  setup: {
    homeTeam: "Home",
    awayTeam: "Away",
    strategy: "balanced" as Strategy,
    managedTeam: 0,
  },
  state: makeState(),
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(savesModule.loadSaves).mockReturnValue([]);
    vi.mocked(savesModule.loadAutoSave).mockReturnValue(null);
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

  it("calls saveGame and onSaveIdChange when save button is clicked", async () => {
    const onSaveIdChange = vi.fn();
    renderModal({ onSaveIdChange });
    await openPanel();
    fireEvent.click(screen.getByRole("button", { name: /save current game/i }));
    expect(savesModule.saveGame).toHaveBeenCalled();
    expect(onSaveIdChange).toHaveBeenCalled();
  });

  it("shows saved slot name after opening", async () => {
    vi.mocked(savesModule.loadSaves).mockReturnValue([makeSlot()]);
    renderModal();
    await openPanel();
    expect(screen.getByText("Test save")).toBeInTheDocument();
  });

  it("calls restoreSaveRng + dispatch + onSaveIdChange when Load is clicked", async () => {
    const slot = makeSlot();
    vi.mocked(savesModule.loadSaves).mockReturnValue([slot]);
    const onSaveIdChange = vi.fn();
    const dispatch = vi.fn();
    renderModal({ onSaveIdChange }, { dispatch });
    await openPanel();
    fireEvent.click(screen.getAllByRole("button", { name: /^load$/i })[0]);
    expect(savesModule.restoreSaveRng).toHaveBeenCalledWith(slot);
    expect(dispatch).toHaveBeenCalledWith({ type: "restore_game", payload: slot.state });
    expect(onSaveIdChange).toHaveBeenCalledWith(slot.id);
  });

  it("calls onSetupRestore with slot.setup when Load is clicked", async () => {
    const slot = makeSlot();
    vi.mocked(savesModule.loadSaves).mockReturnValue([slot]);
    const onSetupRestore = vi.fn();
    renderModal({ onSetupRestore });
    await openPanel();
    fireEvent.click(screen.getAllByRole("button", { name: /^load$/i })[0]);
    expect(onSetupRestore).toHaveBeenCalledWith(slot.setup);
  });

  it("calls deleteSave when ✕ is clicked", async () => {
    vi.mocked(savesModule.loadSaves).mockReturnValue([makeSlot()]);
    renderModal();
    await openPanel();
    fireEvent.click(screen.getByRole("button", { name: /✕/i }));
    expect(savesModule.deleteSave).toHaveBeenCalledWith("save_1");
  });

  it("shows an error message when import text is invalid JSON", async () => {
    vi.mocked(savesModule.importSave).mockImplementation(() => {
      throw new Error("Invalid JSON");
    });
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

  it("calls saveGame on successful paste import", async () => {
    const slot = makeSlot();
    vi.mocked(savesModule.importSave).mockReturnValue(slot);
    renderModal();
    await openPanel();
    fireEvent.change(screen.getByRole("textbox", { name: /import save json/i }), {
      target: { value: '{"valid":"json"}' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /import from text/i }));
    });
    expect(savesModule.saveGame).toHaveBeenCalledWith(slot);
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
    vi.mocked(savesModule.loadSaves).mockReturnValue([makeSlot()]);
    renderModal({ currentSaveId: "save_1", onSaveIdChange });
    await openPanel();
    fireEvent.click(screen.getByRole("button", { name: /✕/i }));
    expect(onSaveIdChange).toHaveBeenCalledWith(null);
  });

  it("shows auto-save section when an auto-save is present", async () => {
    const autoSlot = makeSlot({ id: "autosave", name: "Auto-save — Away vs Home · Inning 3" });
    vi.mocked(savesModule.loadAutoSave).mockReturnValue(autoSlot);
    renderModal();
    await openPanel();
    // The section heading "Auto-save" and the slot name both appear
    expect(screen.getByText("Auto-save — Away vs Home · Inning 3")).toBeInTheDocument();
  });

  it("updates URL seed on load", async () => {
    const slot = makeSlot({ seed: "xyzseed" });
    vi.mocked(savesModule.loadSaves).mockReturnValue([slot]);
    renderModal();
    await openPanel();
    const spy = vi.spyOn(window.history, "replaceState");
    fireEvent.click(screen.getAllByRole("button", { name: /^load$/i })[0]);
    const calledUrl = spy.mock.calls[0]?.[2] as string;
    expect(calledUrl).toContain("xyzseed");
    spy.mockRestore();
  });
});

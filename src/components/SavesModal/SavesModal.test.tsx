import * as React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Strategy } from "@context/index";
import { GameContext } from "@context/index";
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

// Default no-op store returned by the hook mock.
const makeMockStore = (
  overrides: Partial<ReturnType<(typeof import("@hooks/useSaveStore"))["useSaveStore"]>> = {},
) => ({
  saves: [] as SaveDoc[],
  createSave: vi.fn().mockResolvedValue("save_1"),
  updateProgress: vi.fn().mockResolvedValue(undefined),
  deleteSave: vi.fn().mockResolvedValue(undefined),
  exportRxdbSave: vi.fn().mockResolvedValue('{"version":1,"sig":"abc","header":{},"events":[]}'),
  importRxdbSave: vi.fn().mockResolvedValue(undefined),
  appendEvents: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

vi.mock("@hooks/useSaveStore", () => ({
  useSaveStore: vi.fn(() => makeMockStore()),
}));

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
    const { useSaveStore } = await import("@hooks/useSaveStore");
    vi.mocked(useSaveStore).mockReturnValue(makeMockStore());
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

  it("calls createSave and onSaveIdChange when save button is clicked", async () => {
    const { useSaveStore } = await import("@hooks/useSaveStore");
    const mockCreateSave = vi.fn().mockResolvedValue("save_1");
    vi.mocked(useSaveStore).mockReturnValue(makeMockStore({ createSave: mockCreateSave }));
    const onSaveIdChange = vi.fn();
    renderModal({ onSaveIdChange });
    await openPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save current game/i }));
      await vi.waitFor(() => expect(mockCreateSave).toHaveBeenCalled());
    });
    expect(onSaveIdChange).toHaveBeenCalledWith("save_1");
  });

  it("shows saved slot name after opening", async () => {
    const { useSaveStore } = await import("@hooks/useSaveStore");
    vi.mocked(useSaveStore).mockReturnValue(makeMockStore({ saves: [makeSlot()] }));
    renderModal();
    await openPanel();
    expect(screen.getByText("Test save")).toBeInTheDocument();
  });

  it("calls updateProgress + dispatch + onSaveIdChange when Load is clicked", async () => {
    const { useSaveStore } = await import("@hooks/useSaveStore");
    const slot = makeSlot({ stateSnapshot: { state: makeState(), rngState: 42 } });
    vi.mocked(useSaveStore).mockReturnValue(makeMockStore({ saves: [slot] }));
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
    const { useSaveStore } = await import("@hooks/useSaveStore");
    const slot = makeSlot();
    vi.mocked(useSaveStore).mockReturnValue(makeMockStore({ saves: [slot] }));
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

  it("calls deleteSave when ✕ is clicked", async () => {
    const { useSaveStore } = await import("@hooks/useSaveStore");
    const mockDeleteSave = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useSaveStore).mockReturnValue(
      makeMockStore({ saves: [makeSlot()], deleteSave: mockDeleteSave }),
    );
    renderModal();
    await openPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /delete save/i }));
    });
    expect(mockDeleteSave).toHaveBeenCalledWith("save_1");
  });

  it("shows an error message when import text is invalid", async () => {
    const { useSaveStore } = await import("@hooks/useSaveStore");
    vi.mocked(useSaveStore).mockReturnValue(
      makeMockStore({
        importRxdbSave: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      }),
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
    const { useSaveStore } = await import("@hooks/useSaveStore");
    const mockImport = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useSaveStore).mockReturnValue(makeMockStore({ importRxdbSave: mockImport }));
    renderModal();
    await openPanel();
    fireEvent.change(screen.getByRole("textbox", { name: /import save json/i }), {
      target: { value: '{"valid":"json"}' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /import from text/i }));
    });
    expect(mockImport).toHaveBeenCalledWith('{"valid":"json"}');
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
    const { useSaveStore } = await import("@hooks/useSaveStore");
    const mockDeleteSave = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useSaveStore).mockReturnValue(
      makeMockStore({ saves: [makeSlot()], deleteSave: mockDeleteSave }),
    );
    const onSaveIdChange = vi.fn();
    renderModal({ currentSaveId: "save_1", onSaveIdChange });
    await openPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /delete save/i }));
    });
    expect(onSaveIdChange).toHaveBeenCalledWith(null);
  });

  it("calls exportRxdbSave and createObjectURL when Export is clicked", async () => {
    const { useSaveStore } = await import("@hooks/useSaveStore");
    const slot = makeSlot();
    const mockExport = vi
      .fn()
      .mockResolvedValue('{"version":1,"sig":"abc","header":{},"events":[]}');
    vi.mocked(useSaveStore).mockReturnValue(
      makeMockStore({ saves: [slot], exportRxdbSave: mockExport }),
    );
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
      expect(mockExport).toHaveBeenCalledWith(slot.id);
    } finally {
      delete (URL as unknown as Record<string, unknown>).createObjectURL;
      delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
    }
  });

  it("updates URL seed on load", async () => {
    const { useSaveStore } = await import("@hooks/useSaveStore");
    const slot = makeSlot({ seed: "xyzseed" });
    vi.mocked(useSaveStore).mockReturnValue(makeMockStore({ saves: [slot] }));
    renderModal();
    await openPanel();
    const spy = vi.spyOn(window.history, "replaceState");
    fireEvent.click(screen.getAllByRole("button", { name: /^load$/i })[0]);
    const calledUrl = spy.mock.calls[0]?.[2] as string;
    expect(calledUrl).toContain("xyzseed");
    spy.mockRestore();
  });
});

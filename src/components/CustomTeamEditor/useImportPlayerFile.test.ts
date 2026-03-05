import * as React from "react";

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { exportCustomPlayer } from "@storage/customTeamExportImport";
import { CustomTeamStore } from "@storage/customTeamStore";
import type { CustomTeamDoc, TeamPlayer } from "@storage/types";

import type { EditorAction, EditorPlayer } from "./editorState";
import type { PendingPlayerImport } from "./useImportPlayerFile";
import { useImportPlayerFile } from "./useImportPlayerFile";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@storage/customTeamStore", () => ({
  CustomTeamStore: {
    importPlayer: vi.fn().mockResolvedValue({ status: "success", finalLocalId: "mock-player-id" }),
  },
}));

// Stub FileReader to call onload synchronously with preset content.
let _fileContent = "";
const MockFileReader = vi.fn().mockImplementation(() => {
  const instance = {
    result: "",
    onload: null as ((e: Event) => void) | null,
    onerror: null as (() => void) | null,
    readAsText(_file: File) {
      instance.result = _fileContent;
      queueMicrotask(() => instance.onload?.({} as Event));
    },
  };
  return instance;
});
vi.stubGlobal("FileReader", MockFileReader);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makePlayerJson = (overrides: Partial<TeamPlayer> = {}): string => {
  const player: TeamPlayer = {
    id: "p_src",
    name: "Imported Batter",
    role: "batter",
    batting: { contact: 70, power: 60, speed: 55 },
    playerSeed: "import-seed",
    globalPlayerId: "pl_import_gid",
    ...overrides,
  };
  return exportCustomPlayer(player);
};

const makeTeamDoc = (id: string, name: string, players: TeamPlayer[] = []): CustomTeamDoc => ({
  id,
  schemaVersion: 1,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  name,
  abbreviation: "TST",
  source: "custom",
  roster: { schemaVersion: 1, lineup: players, bench: [], pitchers: [] },
  metadata: { archived: false },
});

const makeFile = (content: string) =>
  new File([content], "player.json", { type: "application/json" });

const makeChangeEvent = (content: string): React.ChangeEvent<HTMLInputElement> => {
  const file = makeFile(content);
  return {
    target: { files: [file], value: "" } as unknown as EventTarget & HTMLInputElement,
  } as React.ChangeEvent<HTMLInputElement>;
};

type HookOptions = {
  teamId?: string;
  allTeams?: CustomTeamDoc[];
  lineup?: EditorPlayer[];
  bench?: EditorPlayer[];
  pitchers?: EditorPlayer[];
};

const renderImportHook = (opts: HookOptions = {}) => {
  const dispatch = vi.fn();
  const setPendingPlayerImport = vi.fn();
  const { result } = renderHook(() =>
    useImportPlayerFile({
      teamId: opts.teamId,
      allTeams: opts.allTeams ?? [],
      lineup: opts.lineup ?? [],
      bench: opts.bench ?? [],
      pitchers: opts.pitchers ?? [],
      dispatch: dispatch as React.Dispatch<EditorAction>,
      setPendingPlayerImport: setPendingPlayerImport as React.Dispatch<
        React.SetStateAction<PendingPlayerImport | null>
      >,
    }),
  );
  return { result, dispatch, setPendingPlayerImport };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useImportPlayerFile — edit mode (teamId set)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls CustomTeamStore.importPlayer and dispatches ADD_PLAYER on success", async () => {
    vi.mocked(CustomTeamStore.importPlayer).mockResolvedValue({
      status: "success",
      finalLocalId: "mock-player-id",
    });
    const playerJson = makePlayerJson({ name: "New Player" });
    _fileContent = playerJson;

    const { result, dispatch } = renderImportHook({ teamId: "ct_edit" });
    const handler = result.current("lineup");

    act(() => {
      handler(makeChangeEvent(playerJson));
    });

    await waitFor(() => {
      expect(CustomTeamStore.importPlayer).toHaveBeenCalledWith("ct_edit", playerJson, "lineup");
    });
    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ADD_PLAYER", section: "lineup" }),
      );
    });
  });

  it("dispatches SET_ERROR with owning team name on conflict", async () => {
    vi.mocked(CustomTeamStore.importPlayer).mockResolvedValue({
      status: "conflict",
      conflictingTeamId: "ct_other",
      conflictingTeamName: "Other Team",
    });
    const playerJson = makePlayerJson({ name: "Contested" });
    _fileContent = playerJson;

    const { result, dispatch } = renderImportHook({ teamId: "ct_edit" });
    act(() => {
      result.current("lineup")(makeChangeEvent(playerJson));
    });

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SET_ERROR",
          error: expect.stringContaining('"Other Team"'),
        }),
      );
    });
  });

  it("dispatches SET_ERROR when player is already on this team", async () => {
    vi.mocked(CustomTeamStore.importPlayer).mockResolvedValue({ status: "alreadyOnThisTeam" });
    const playerJson = makePlayerJson();
    _fileContent = playerJson;

    const { result, dispatch } = renderImportHook({ teamId: "ct_edit" });
    act(() => {
      result.current("lineup")(makeChangeEvent(playerJson));
    });

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SET_ERROR",
          error: expect.stringMatching(/already on this team/i),
        }),
      );
    });
  });

  it("skips the soft fingerprint check when globalPlayerId is present", async () => {
    // allTeams contains a team with the same fingerprint — if the soft check ran,
    // setPendingPlayerImport would be called. It should NOT be called because
    // globalPlayerId is present and routes straight to performImport.
    vi.mocked(CustomTeamStore.importPlayer).mockResolvedValue({
      status: "success",
      finalLocalId: "mock-player-id",
    });
    const playerJson = makePlayerJson({ name: "Alice" });
    _fileContent = playerJson;

    const teamWithSamePlayer = makeTeamDoc("ct_other", "Other Team", [
      {
        id: "p_alice",
        name: "Alice",
        role: "batter",
        batting: { contact: 70, power: 60, speed: 55 },
        playerSeed: "import-seed",
        globalPlayerId: "pl_different_gid",
        fingerprint: "anything",
      },
    ]);

    const { result, dispatch, setPendingPlayerImport } = renderImportHook({
      teamId: "ct_edit",
      allTeams: [teamWithSamePlayer],
    });
    act(() => {
      result.current("lineup")(makeChangeEvent(playerJson));
    });

    await waitFor(() => {
      expect(CustomTeamStore.importPlayer).toHaveBeenCalled();
    });
    expect(setPendingPlayerImport).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "ADD_PLAYER" }));
  });
});

describe("useImportPlayerFile — create mode (no teamId)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches ADD_PLAYER when no conflict exists", async () => {
    const playerJson = makePlayerJson({ name: "Fresh Player" });
    _fileContent = playerJson;

    const { result, dispatch } = renderImportHook({ allTeams: [] });
    act(() => {
      result.current("bench")(makeChangeEvent(playerJson));
    });

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ADD_PLAYER", section: "bench" }),
      );
    });
    expect(CustomTeamStore.importPlayer).not.toHaveBeenCalled();
  });

  it("dispatches SET_ERROR when globalPlayerId matches a player on another team", async () => {
    const playerJson = makePlayerJson({ name: "Owned Player", globalPlayerId: "pl_owned" });
    _fileContent = playerJson;

    const owningTeam = makeTeamDoc("ct_owner", "Owner Team", [
      {
        id: "p_owned",
        name: "Owned Player",
        role: "batter",
        batting: { contact: 70, power: 60, speed: 55 },
        globalPlayerId: "pl_owned",
      },
    ]);

    const { result, dispatch } = renderImportHook({ allTeams: [owningTeam] });
    act(() => {
      result.current("lineup")(makeChangeEvent(playerJson));
    });

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SET_ERROR",
          error: expect.stringContaining('"Owner Team"'),
        }),
      );
    });
  });

  it("shows soft fingerprint warning when player lacks globalPlayerId and fingerprint matches", async () => {
    // A player without globalPlayerId that has the same stats as an existing player.
    const playerWithoutGid: TeamPlayer = {
      id: "p_nogid",
      name: "No GID Player",
      role: "batter",
      batting: { contact: 60, power: 50, speed: 40 },
      // no globalPlayerId, no playerSeed → fingerprint computed from stats
    };
    const playerJson = exportCustomPlayer(playerWithoutGid);
    _fileContent = playerJson;

    // allTeams has a team with a player with the exact same fingerprint
    const teamWithDuplicate = makeTeamDoc("ct_dup", "Dup Team", [
      {
        id: "p_dup",
        name: "No GID Player",
        role: "batter",
        batting: { contact: 60, power: 50, speed: 40 },
        // same stats, so buildPlayerSig will produce the same fingerprint
      },
    ]);

    const { result, setPendingPlayerImport } = renderImportHook({
      allTeams: [teamWithDuplicate],
    });
    act(() => {
      result.current("lineup")(makeChangeEvent(playerJson));
    });

    await waitFor(() => {
      expect(setPendingPlayerImport).toHaveBeenCalledWith(
        expect.objectContaining({
          section: "lineup",
          warning: expect.stringContaining("Dup Team"),
        }),
      );
    });
  });

  it("calling onConfirm from pending import dispatches ADD_PLAYER", async () => {
    const playerWithoutGid: TeamPlayer = {
      id: "p_confirm",
      name: "Confirm Player",
      role: "batter",
      batting: { contact: 65, power: 45, speed: 55 },
    };
    const playerJson = exportCustomPlayer(playerWithoutGid);
    _fileContent = playerJson;

    const teamWithDuplicate = makeTeamDoc("ct_conf", "Conf Team", [
      {
        id: "p_c2",
        name: "Confirm Player",
        role: "batter",
        batting: { contact: 65, power: 45, speed: 55 },
      },
    ]);

    let capturedPending: PendingPlayerImport | null = null;
    const setPendingPlayerImport = vi.fn((val: PendingPlayerImport | null) => {
      capturedPending = typeof val === "function" ? val(null) : val;
    });
    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      useImportPlayerFile({
        teamId: undefined,
        allTeams: [teamWithDuplicate],
        lineup: [],
        bench: [],
        pitchers: [],
        dispatch: dispatch as React.Dispatch<EditorAction>,
        setPendingPlayerImport: setPendingPlayerImport as React.Dispatch<
          React.SetStateAction<PendingPlayerImport | null>
        >,
      }),
    );

    act(() => {
      result.current("lineup")(makeChangeEvent(playerJson));
    });

    await waitFor(() => {
      expect(capturedPending).not.toBeNull();
    });

    // Call onConfirm — should dispatch ADD_PLAYER.
    await act(async () => {
      await capturedPending?.onConfirm();
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ADD_PLAYER", section: "lineup" }),
    );
  });

  it("dispatches ADD_PLAYER directly when no fingerprint match found", async () => {
    // No duplicates anywhere → straight to ADD_PLAYER without showing duplicate warning.
    const playerWithoutGid: TeamPlayer = {
      id: "p_unique",
      name: "Unique Player",
      role: "batter",
      batting: { contact: 55, power: 45, speed: 35 },
    };
    const playerJson = exportCustomPlayer(playerWithoutGid);
    _fileContent = playerJson;

    const { result, dispatch, setPendingPlayerImport } = renderImportHook({ allTeams: [] });
    act(() => {
      result.current("lineup")(makeChangeEvent(playerJson));
    });

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ADD_PLAYER", section: "lineup" }),
      );
    });
    expect(setPendingPlayerImport).not.toHaveBeenCalled();
  });
});

describe("useImportPlayerFile — error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches SET_ERROR on invalid JSON", async () => {
    _fileContent = "not valid json at all";

    const { result, dispatch } = renderImportHook();
    act(() => {
      result.current("lineup")(makeChangeEvent("not valid json at all"));
    });

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SET_ERROR",
          error: expect.stringContaining("Failed to import player"),
        }),
      );
    });
  });

  it("dispatches SET_ERROR when FileReader fires onerror", async () => {
    // Override mock to fire onerror instead of onload.
    MockFileReader.mockImplementationOnce(() => {
      const instance = {
        result: "",
        onload: null as ((e: Event) => void) | null,
        onerror: null as (() => void) | null,
        readAsText(_file: File) {
          queueMicrotask(() => instance.onerror?.());
        },
      };
      return instance;
    });

    const { result, dispatch } = renderImportHook();
    act(() => {
      result.current("lineup")(makeChangeEvent("anything"));
    });

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SET_ERROR",
          error: expect.stringContaining("Failed to read player file"),
        }),
      );
    });
  });

  it("does nothing when no file is selected", () => {
    const { result, dispatch } = renderImportHook();
    act(() => {
      result.current("lineup")({
        target: { files: [], value: "" } as unknown as EventTarget & HTMLInputElement,
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(dispatch).not.toHaveBeenCalled();
  });
});

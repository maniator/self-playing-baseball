import * as React from "react";

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CustomTeamDoc } from "@storage/types";

// Mock the CustomTeamStore so tests run without IndexedDB.
vi.mock("@storage/customTeamStore", () => {
  const mockStore = {
    listCustomTeams: vi.fn(),
    createCustomTeam: vi.fn(),
    updateCustomTeam: vi.fn(),
    deleteCustomTeam: vi.fn(),
  };
  return { CustomTeamStore: mockStore };
});

import { CustomTeamStore } from "@storage/customTeamStore";

import { useCustomTeams } from "./useCustomTeams";

const mockStore = CustomTeamStore as {
  listCustomTeams: ReturnType<typeof vi.fn>;
  createCustomTeam: ReturnType<typeof vi.fn>;
  updateCustomTeam: ReturnType<typeof vi.fn>;
  deleteCustomTeam: ReturnType<typeof vi.fn>;
};

const makeTeam = (id: string, name = "Test Team"): CustomTeamDoc =>
  ({
    id,
    name,
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: "custom",
    roster: { schemaVersion: 1, lineup: [], bench: [], pitchers: [] },
    metadata: { archived: false },
  }) as CustomTeamDoc;

describe("useCustomTeams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.listCustomTeams.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with loading=true and returns empty teams list initially", async () => {
    const { result } = renderHook(() => useCustomTeams());
    // Initially loading is true before the effect resolves.
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.teams).toHaveLength(0);
  });

  it("populates teams from the store on mount", async () => {
    const teams = [makeTeam("t1", "Alpha Sox"), makeTeam("t2", "Beta Cubs")];
    mockStore.listCustomTeams.mockResolvedValue(teams);

    const { result } = renderHook(() => useCustomTeams());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.teams).toHaveLength(2);
    expect(result.current.teams[0].name).toBe("Alpha Sox");
  });

  it("sets loading=false and returns empty list on store error", async () => {
    mockStore.listCustomTeams.mockRejectedValue(new Error("DB unavailable"));

    const { result } = renderHook(() => useCustomTeams());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.teams).toHaveLength(0);
  });

  it("createTeam calls store, refreshes list, and returns the new id", async () => {
    mockStore.createCustomTeam.mockResolvedValue("new-id-123");
    const secondList = [makeTeam("new-id-123", "New Team")];
    // First call returns [] (initial load), second call returns the new team.
    mockStore.listCustomTeams.mockResolvedValueOnce([]).mockResolvedValue(secondList);

    const { result } = renderHook(() => useCustomTeams());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returnedId!: string;
    await act(async () => {
      returnedId = await result.current.createTeam({
        name: "New Team",
        roster: { lineup: [] },
      });
    });

    expect(returnedId).toBe("new-id-123");
    expect(mockStore.createCustomTeam).toHaveBeenCalledOnce();
    await waitFor(() => expect(result.current.teams).toHaveLength(1));
  });

  it("updateTeam calls store and refreshes list", async () => {
    const team = makeTeam("t1", "Old Name");
    const updated = makeTeam("t1", "New Name");
    mockStore.listCustomTeams.mockResolvedValueOnce([team]).mockResolvedValue([updated]);
    mockStore.updateCustomTeam.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCustomTeams());
    await waitFor(() => expect(result.current.teams).toHaveLength(1));

    await act(async () => {
      await result.current.updateTeam("t1", { name: "New Name" });
    });

    expect(mockStore.updateCustomTeam).toHaveBeenCalledWith("t1", { name: "New Name" });
    await waitFor(() => expect(result.current.teams[0].name).toBe("New Name"));
  });

  it("deleteTeam calls store and refreshes list", async () => {
    const team = makeTeam("t1", "To Delete");
    mockStore.listCustomTeams.mockResolvedValueOnce([team]).mockResolvedValue([]);
    mockStore.deleteCustomTeam.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCustomTeams());
    await waitFor(() => expect(result.current.teams).toHaveLength(1));

    await act(async () => {
      await result.current.deleteTeam("t1");
    });

    expect(mockStore.deleteCustomTeam).toHaveBeenCalledWith("t1");
    await waitFor(() => expect(result.current.teams).toHaveLength(0));
  });

  it("refresh() re-fetches from the store", async () => {
    const second = [makeTeam("t99", "Refreshed")];
    mockStore.listCustomTeams.mockResolvedValueOnce([]).mockResolvedValue(second);

    const { result } = renderHook(() => useCustomTeams());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.teams).toHaveLength(0);

    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.teams).toHaveLength(1));
    expect(result.current.teams[0].name).toBe("Refreshed");
  });

  it("ignores state updates after unmount (no cancelled-effect leak)", async () => {
    const { result, unmount } = renderHook(() => useCustomTeams());
    // Unmount before the promise resolves.
    unmount();
    // No React state-update warning should fire — just verify no crash.
    await waitFor(() => expect(mockStore.listCustomTeams).toHaveBeenCalled());
    expect(result.current.teams).toHaveLength(0);
  });
});

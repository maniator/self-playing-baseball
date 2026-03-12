import * as React from "react";

import { DEMO_TEAMS } from "@feat/customTeams/generation/demoTeams";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the CustomTeamStore and logger before importing the hook so they are
// intercepted before any module-level code runs.
vi.mock("@feat/customTeams/storage/customTeamStore", () => ({
  CustomTeamStore: {
    listCustomTeams: vi.fn(),
    createCustomTeam: vi.fn(),
  },
}));

vi.mock("@shared/utils/logger", () => ({
  appLog: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { CustomTeamStore } from "@feat/customTeams/storage/customTeamStore";
import { appLog } from "@shared/utils/logger";

import { _resetForTest, DEMO_SEED_DONE_KEY, useSeedDemoTeams } from "./useSeedDemoTeams";

const mockStore = CustomTeamStore as unknown as {
  listCustomTeams: ReturnType<typeof vi.fn>;
  createCustomTeam: ReturnType<typeof vi.fn>;
};

const mockLog = appLog as unknown as {
  warn: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  _resetForTest(); // resets _seedPromise and removes the localStorage flag
  mockStore.createCustomTeam.mockResolvedValue("ct_some_id");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSeedDemoTeams", () => {
  it("does nothing when custom teams already exist", async () => {
    mockStore.listCustomTeams.mockResolvedValue([{ id: "ct_existing", name: "Some Team" }]);

    renderHook(() => useSeedDemoTeams());

    await waitFor(() => expect(mockStore.listCustomTeams).toHaveBeenCalledOnce());
    expect(mockStore.createCustomTeam).not.toHaveBeenCalled();
  });

  it("does nothing when only archived teams exist (includeArchived: true)", async () => {
    mockStore.listCustomTeams.mockResolvedValue([
      { id: "ct_archived", name: "Old Team", metadata: { archived: true } },
    ]);

    renderHook(() => useSeedDemoTeams());

    await waitFor(() => expect(mockStore.listCustomTeams).toHaveBeenCalledOnce());
    expect(mockStore.createCustomTeam).not.toHaveBeenCalled();
    // Must pass includeArchived: true so archived-only installs are not treated as empty
    expect(mockStore.listCustomTeams).toHaveBeenCalledWith({
      withRoster: false,
      includeArchived: true,
    });
  });

  it("creates all demo teams when the collection is empty", async () => {
    mockStore.listCustomTeams.mockResolvedValue([]);

    renderHook(() => useSeedDemoTeams());

    await waitFor(() =>
      expect(mockStore.createCustomTeam).toHaveBeenCalledTimes(DEMO_TEAMS.length),
    );
  });

  it("sets the localStorage done-flag after seeding", async () => {
    mockStore.listCustomTeams.mockResolvedValue([]);

    renderHook(() => useSeedDemoTeams());

    await waitFor(() =>
      expect(mockStore.createCustomTeam).toHaveBeenCalledTimes(DEMO_TEAMS.length),
    );
    expect(localStorage.getItem(DEMO_SEED_DONE_KEY)).toBe("1");
  });

  it("skips seeding when the localStorage done-flag is already set (E2E suppression)", async () => {
    localStorage.setItem(DEMO_SEED_DONE_KEY, "1");

    renderHook(() => useSeedDemoTeams());

    // Allow a tick for any async work to settle.
    await new Promise((r) => setTimeout(r, 10));
    expect(mockStore.listCustomTeams).not.toHaveBeenCalled();
    expect(mockStore.createCustomTeam).not.toHaveBeenCalled();
  });

  it("passes correct team info and deterministic ID to createCustomTeam", async () => {
    mockStore.listCustomTeams.mockResolvedValue([]);

    renderHook(() => useSeedDemoTeams());

    await waitFor(() =>
      expect(mockStore.createCustomTeam).toHaveBeenCalledTimes(DEMO_TEAMS.length),
    );

    DEMO_TEAMS.forEach((def, i) => {
      const [input, meta] = mockStore.createCustomTeam.mock.calls[i] as [
        { name: string; city: string; abbreviation: string; source: string },
        { id: string },
      ];
      expect(input.name).toBe(def.name);
      expect(input.city).toBe(def.city);
      expect(input.abbreviation).toBe(def.abbreviation);
      expect(input.source).toBe("generated");
      expect(meta.id).toBe(def.demoId);
    });
  });

  it("does not re-seed when the hook mounts a second time in the same page load", async () => {
    mockStore.listCustomTeams.mockResolvedValue([]);

    renderHook(() => useSeedDemoTeams());
    await waitFor(() =>
      expect(mockStore.createCustomTeam).toHaveBeenCalledTimes(DEMO_TEAMS.length),
    );

    // Second mount — must reuse the in-flight promise and not trigger more calls.
    renderHook(() => useSeedDemoTeams());
    await new Promise((r) => setTimeout(r, 0));
    expect(mockStore.createCustomTeam).toHaveBeenCalledTimes(DEMO_TEAMS.length);
  });

  it("treats a per-team error as a graceful skip and continues seeding", async () => {
    mockStore.listCustomTeams.mockResolvedValue([]);
    // First team fails (e.g. duplicate from another tab); second succeeds.
    mockStore.createCustomTeam
      .mockRejectedValueOnce(new Error(`A team named "${DEMO_TEAMS[0].name}" already exists`))
      .mockResolvedValue("ct_some_id");

    renderHook(() => useSeedDemoTeams());

    await waitFor(() =>
      expect(mockStore.createCustomTeam).toHaveBeenCalledTimes(DEMO_TEAMS.length),
    );
    expect(mockLog.warn).toHaveBeenCalled();
  });

  it("clears the in-flight promise on transient listCustomTeams failure so the next mount retries", async () => {
    // First mount: DB unavailable — the catch handler automatically clears _seedPromise.
    mockStore.listCustomTeams.mockRejectedValueOnce(new Error("DB unavailable"));

    renderHook(() => useSeedDemoTeams());
    await waitFor(() => expect(mockLog.warn).toHaveBeenCalled());

    // No manual reset needed — the catch handler already cleared _seedPromise.
    // Second mount: DB recovered — should now seed teams.
    mockStore.listCustomTeams.mockResolvedValue([]);

    renderHook(() => useSeedDemoTeams());
    await waitFor(() =>
      expect(mockStore.createCustomTeam).toHaveBeenCalledTimes(DEMO_TEAMS.length),
    );
  });
});

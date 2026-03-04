import * as React from "react";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Hit } from "@constants/hitTypes";
import { makeContextValue } from "@test/testHelpers";

// Mocks must use inline vi.fn() — no top-level variables before vi.mock().
vi.mock("@storage/gameHistoryStore", () => ({
  GameHistoryStore: { commitCompletedGame: vi.fn() },
}));

vi.mock("@context/index", () => ({ useGameContext: vi.fn() }));

vi.mock("@utils/rng", () => ({
  getSeed: vi.fn().mockReturnValue(12345),
  getRngState: vi.fn().mockReturnValue(null),
}));

// Import the hook and mocked modules after vi.mock declarations.
import { useGameContext } from "@context/index";
import { GameHistoryStore } from "@storage/gameHistoryStore";

import { useGameHistorySync } from "./useGameHistorySync";

afterEach(() => {
  vi.clearAllMocks();
});

/** Helper: returns a MutableRefObject wrapping `value`. */
const makeRef = <T>(value: T): React.MutableRefObject<T> => ({ current: value });

describe("useGameHistorySync", () => {
  describe("happy path — game over triggers exactly one commit", () => {
    beforeEach(() => {
      vi.mocked(GameHistoryStore.commitCompletedGame).mockResolvedValue(undefined);
    });

    it("does NOT commit when gameOver is false", () => {
      vi.mocked(useGameContext).mockReturnValue(makeContextValue({ gameOver: false }));
      renderHook(() => useGameHistorySync(makeRef("save_1"), false, []));
      expect(GameHistoryStore.commitCompletedGame).not.toHaveBeenCalled();
    });

    it("commits once when gameOver is true", async () => {
      vi.mocked(useGameContext).mockReturnValue(makeContextValue({ gameOver: true }));
      const { rerender } = renderHook(() => useGameHistorySync(makeRef("save_1"), false, []));
      await act(async () => {
        await Promise.resolve();
      });
      rerender();
      expect(GameHistoryStore.commitCompletedGame).toHaveBeenCalledTimes(1);
      expect(GameHistoryStore.commitCompletedGame).toHaveBeenCalledWith(
        "save_1",
        expect.objectContaining({ committedBySaveId: "save_1" }),
        expect.any(Array),
      );
    });

    it("uses gameInstanceId as the primary key when present in state", async () => {
      vi.mocked(useGameContext).mockReturnValue(
        makeContextValue({ gameOver: true, gameInstanceId: "game_abc" }),
      );
      renderHook(() => useGameHistorySync(makeRef("save_1"), false, []));
      await act(async () => {
        await Promise.resolve();
      });
      expect(GameHistoryStore.commitCompletedGame).toHaveBeenCalledWith(
        "game_abc",
        expect.objectContaining({ committedBySaveId: "save_1" }),
        expect.any(Array),
      );
    });

    it("does NOT commit a second time on re-render", async () => {
      vi.mocked(useGameContext).mockReturnValue(makeContextValue({ gameOver: true }));
      const ref = makeRef("save_1");
      const { rerender } = renderHook(() => useGameHistorySync(ref, false, []));
      await act(async () => {
        await Promise.resolve();
      });
      rerender();
      rerender();
      await act(async () => {
        await Promise.resolve();
      });
      expect(GameHistoryStore.commitCompletedGame).toHaveBeenCalledTimes(1);
    });

    it("builds stat rows from play log entries", async () => {
      // Provide a play log so the stat-building loop runs (covering buildPlayerKey).
      const playLog = [
        {
          inning: 1,
          half: 0 as const,
          batterNum: 1,
          playerId: "p1",
          team: 0 as const,
          event: Hit.Single,
          runs: 0,
          rbi: 0,
        },
      ];
      const strikeoutLog = [{ team: 0 as const, batterNum: 2, playerId: "p2" }];
      vi.mocked(useGameContext).mockReturnValue(
        makeContextValue({ gameOver: true, playLog, strikeoutLog }),
      );
      renderHook(() => useGameHistorySync(makeRef("save_1"), false, []));
      await act(async () => {
        await Promise.resolve();
      });
      expect(GameHistoryStore.commitCompletedGame).toHaveBeenCalledTimes(1);
      // Stat rows should include the batter from team 0.
      const statRows = vi.mocked(GameHistoryStore.commitCompletedGame).mock.calls[0][2];
      expect(statRows.some((r: { playerId: string }) => r.playerId === "p1")).toBe(true);
    });

    it("skips slot-fallback entries (no playerId) in stat rows", async () => {
      // Entry without playerId uses slot:N key — must be skipped.
      const playLog = [
        {
          inning: 1,
          half: 0 as const,
          batterNum: 3,
          team: 0 as const,
          event: Hit.Single,
          runs: 0,
          rbi: 0,
        },
      ];
      vi.mocked(useGameContext).mockReturnValue(makeContextValue({ gameOver: true, playLog }));
      renderHook(() => useGameHistorySync(makeRef("save_1"), false, []));
      await act(async () => {
        await Promise.resolve();
      });
      const statRows = vi.mocked(GameHistoryStore.commitCompletedGame).mock.calls[0][2];
      // The slot entry should have been skipped.
      expect(statRows.every((r: { playerId?: string }) => !r.playerId?.startsWith("slot:"))).toBe(
        true,
      );
    });
  });

  describe("wasAlreadyFinalOnLoad guard", () => {
    it("does NOT commit when wasAlreadyFinalOnLoad is true", async () => {
      vi.mocked(GameHistoryStore.commitCompletedGame).mockResolvedValue(undefined);
      vi.mocked(useGameContext).mockReturnValue(makeContextValue({ gameOver: true }));
      renderHook(() => useGameHistorySync(makeRef("save_1"), true, []));
      await act(async () => {
        await Promise.resolve();
      });
      expect(GameHistoryStore.commitCompletedGame).not.toHaveBeenCalled();
    });
  });

  describe("missing saveId guard", () => {
    it("does NOT commit when rxSaveIdRef.current is null", async () => {
      vi.mocked(GameHistoryStore.commitCompletedGame).mockResolvedValue(undefined);
      vi.mocked(useGameContext).mockReturnValue(makeContextValue({ gameOver: true }));
      renderHook(() => useGameHistorySync(makeRef(null), false, []));
      await act(async () => {
        await Promise.resolve();
      });
      expect(GameHistoryStore.commitCompletedGame).not.toHaveBeenCalled();
    });
  });

  describe("retry on transient failure", () => {
    it("retries up to 3 times then stops on persistent commit failure", async () => {
      const error = Object.assign(new Error("DB error"), { code: "QUOTA_EXCEEDED" });
      vi.mocked(GameHistoryStore.commitCompletedGame).mockRejectedValue(error);
      vi.mocked(useGameContext).mockReturnValue(makeContextValue({ gameOver: true }));

      renderHook(() => useGameHistorySync(makeRef("save_1"), false, []));

      // Flush all microtasks — let the hook run all retries.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
        await new Promise((r) => setTimeout(r, 0));
        await new Promise((r) => setTimeout(r, 0));
      });

      // Should not exceed initial + MAX_COMMIT_RETRIES = 4 total calls.
      expect(vi.mocked(GameHistoryStore.commitCompletedGame).mock.calls.length).toBeLessThanOrEqual(
        4,
      );
      // Should have been called at least once.
      expect(GameHistoryStore.commitCompletedGame).toHaveBeenCalled();
    });
  });
});

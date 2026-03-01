import "fake-indexeddb/auto";

import * as React from "react";

import { renderHook, waitFor } from "@testing-library/react";
import { RxDatabaseProvider } from "rxdb/plugins/react";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { _createTestDb, type BallgameDb } from "@storage/db";
import { makeSaveStore } from "@storage/saveStore";

import { useSaveStore } from "./useSaveStore";

describe("useSaveStore", () => {
  let db: BallgameDb;
  let testStore: ReturnType<typeof makeSaveStore>;

  beforeEach(async () => {
    db = await _createTestDb(getRxStorageMemory());
    testStore = makeSaveStore(async () => db);
  });

  afterEach(async () => {
    await db.close();
  });

  const makeWrapper = (database: BallgameDb) => {
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(RxDatabaseProvider, { database }, children);
    Wrapper.displayName = "TestDbWrapper";
    return Wrapper;
  };

  it("returns empty saves on initial load", async () => {
    const { result } = renderHook(() => useSaveStore(), { wrapper: makeWrapper(db) });
    await waitFor(() => expect(result.current.saves).toBeDefined());
    expect(result.current.saves).toHaveLength(0);
  });

  it("reactively updates saves when a new save is created", async () => {
    const { result } = renderHook(() => useSaveStore(), { wrapper: makeWrapper(db) });
    await waitFor(() => expect(result.current.saves).toBeDefined());

    await testStore.createSave(
      { homeTeamId: "A", awayTeamId: "B", seed: "abc", setup: {} as never },
      { name: "Test Save" },
    );

    await waitFor(() => expect(result.current.saves).toHaveLength(1));
    expect(result.current.saves[0].name).toBe("Test Save");
  });

  it("reactively removes saves when deleted", async () => {
    const saveId = await testStore.createSave(
      { homeTeamId: "A", awayTeamId: "B", seed: "abc", setup: {} as never },
      { name: "To Delete" },
    );
    const { result } = renderHook(() => useSaveStore(), { wrapper: makeWrapper(db) });
    await waitFor(() => expect(result.current.saves).toHaveLength(1));

    await testStore.deleteSave(saveId);

    await waitFor(() => expect(result.current.saves).toHaveLength(0));
  });

  it("exposes stable write callbacks", () => {
    const { result, rerender } = renderHook(() => useSaveStore(), { wrapper: makeWrapper(db) });
    const first = result.current.createSave;
    rerender();
    expect(result.current.createSave).toBe(first);
  });
});

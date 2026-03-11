# Bug 3 — `useRxdbGameSync: failed to update progress (game over)` console error

**Severity:** Medium
**Status:** 🔴 Open
**Reported:** 2026-03-06 QA report; additional triggers confirmed 2026-03-10 Session 2
**Can ship independently:** ✅ Yes — touches only `useRxdbGameSync.ts` and `saveStore.ts`

> **Status values:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⚠️ Partially Fixed

---

## Summary

A console error fires whenever the game sync hook attempts to persist a "game over" progress update to a save that is already in FINAL state or whose slot no longer exists. The error is invisible to users but fires repeatedly for the same `saveId` across multiple distinct triggers, polluting the console and obscuring genuine errors.

```
[ERROR] app useRxdbGameSync: failed to update progress (game over) saveId=save_xxx
```

---

## Known triggers (all confirmed in QA)

| Trigger                                                | Session   |
| ------------------------------------------------------ | --------- |
| Game ends naturally at FINAL                           | Session 1 |
| Load a FINAL saved game from `/saves`                  | Session 1 |
| Click "Resume Current Game" on home for a FINAL game   | Session 2 |
| Open then close 💾 Saves dialog while game is at FINAL | Session 2 |
| Delete a save while the current game is at FINAL       | Session 2 |

---

## Reproduction steps

1. Start a new game at any speed and let it run to FINAL.
2. Click **← Home**.
3. Open the browser console — error is already present.
4. Click **Resume Current Game** — error fires again for the same `saveId`.
5. Alternatively: Load a completed (FINAL) save from `/saves` and observe the error on load.

---

## Root cause

`src/features/saves/hooks/useRxdbGameSync.ts` lines ~121–133:

The `gameOver` effect fires whenever `gameOver` transitions to `true`. It unconditionally calls `SaveStore.updateProgress()`, even when:

- The loaded save was already FINAL on load (`wasAlreadyFinalOnLoad === true` in `GameInner.tsx`), so there is nothing new to persist.
- The underlying save record was deleted, causing the store call to throw.

```ts
// Current code — no guard for wasAlreadyFinalOnLoad
if (!gameOver) return;
const saveId = rxSaveIdRef.current;
if (!saveId) return;
SaveStore.updateProgress(saveId, state.pitchKey, { ... })
  .catch((err) => {
    appLog.error(`useRxdbGameSync: failed to update progress (game over) saveId=${saveId}`, err);
  });
```

`wasAlreadyFinalOnLoad` is already tracked in `GameInner.tsx` but is not threaded through to the sync hook.

---

## Fix plan

**Files:**

- `src/features/saves/hooks/useRxdbGameSync.ts`
- `src/features/saves/storage/saveStore.ts`

### Part 1 — skip update when save was already FINAL on load

Thread `wasAlreadyFinalOnLoad` into `useRxdbGameSync` as a new prop/parameter, then guard the `gameOver` effect:

```ts
if (!gameOver) return;
if (wasAlreadyFinalOnLoad) return; // ← new guard
const saveId = rxSaveIdRef.current;
if (!saveId) return;
```

### Part 2 — make `SaveStore.updateProgress` tolerant of missing saves

Update `SaveStore.updateProgress` to silently resolve (rather than throw) when the target `saveId` no longer exists in the database. This prevents the "deleted save" trigger from producing an error.

---

## Acceptance criteria

- [ ] No console error fires when a game ends naturally at FINAL.
- [ ] No console error fires when loading a FINAL save and navigating home.
- [ ] No console error fires when clicking Resume for a FINAL game.
- [ ] No console error fires when opening/closing the Saves dialog while a FINAL game is in memory.
- [ ] A genuine unexpected `updateProgress` failure (e.g. DB corruption) still logs an error.
- [ ] `useRxdbGameSync.test.tsx` covers the `wasAlreadyFinalOnLoad = true` path.

---

## Definition of done

- [ ] `wasAlreadyFinalOnLoad` guard added in `useRxdbGameSync.ts`.
- [ ] `SaveStore.updateProgress` tolerates non-existent save IDs without throwing.
- [ ] New unit tests cover both the already-FINAL-on-load and missing-save-slot paths.
- [ ] All existing tests pass.
- [ ] `yarn lint && yarn build && yarn test` all pass.
- [ ] Manual verification: browser console is clean across all five known trigger scenarios.

# Bug C — "Resume Current Game" shown on home screen after a FINAL game

**Severity:** Medium
**Status:** 🔴 Open
**Reported:** 2026-03-10 QA Session 1; full flow reproduced Session 2
**Can ship independently:** ✅ Yes — isolated to `AppShell/index.tsx` and `HomeScreen` props; no shared files with other open bugs

> **Status values:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⚠️ Partially Fixed

---

## Summary

After a game reaches FINAL state (either by playing to completion or by loading a FINAL save), navigating back to the home screen shows a **▶ Resume Current Game** button. Clicking it returns the user to `/game`, which displays only a frozen FINAL scoreboard with no further play possible. This is misleading — "Resume" implies there is something to continue.

The button correctly appears for in-progress games; the bug is that it also appears for finished ones.

---

## Reproduction steps

1. Start a new game at any speed and let it run to **FINAL**.
2. Click **← Home**.
3. **Expected:** Home screen shows only **New Game**, **Load Saved Game**, etc. No Resume button.
4. **Actual:** Home screen shows **▶ Resume Current Game**.
5. Click Resume — navigates to `/game` showing a FINAL scoreboard. No action is possible.

Also reproducible via loading a completed save:
1. Go to `/saves` → **Load** a FINAL game.
2. Wait for FINAL state, then click **← Home**.
3. **Resume Current Game** button is visible.

Additionally: clicking Resume from this state triggers the `useRxdbGameSync: failed to update progress` console error (see Bug 3).

---

## Root cause

`src/features/gameplay/components/AppShell/index.tsx`:

`hasActiveSession` is set to `true` in `handleGameSessionStarted` (line 28) whenever a game starts or a save is loaded. It is **never reset to `false`**, so once set it remains `true` for the entire app session — including after the game reaches FINAL.

```ts
const [hasActiveSession, setHasActiveSession] = React.useState(false);

const handleGameSessionStarted = React.useCallback(() => {
  setHasActiveSession(true); // ← set, but never cleared
}, []);
```

`HomeScreen` receives `hasActiveSession` and renders the Resume button whenever it is `true`, with no additional check on whether the game is actually in-progress vs FINAL.

---

## Fix plan

**File:** `src/features/gameplay/components/AppShell/index.tsx`

The cleanest fix is to pass the current game's `gameOver` flag up from `GameInner`/`GamePage` through the outlet context so `AppShell` can reset `hasActiveSession` when the game is over.

Alternatively — and more simply — pass `gameOver` status alongside `hasActiveSession` and let `HomeScreen` render the Resume button only when both are true: `hasActiveSession && !gameOver`.

Since `AppShell` does not currently read game state directly, the simplest incremental approach is to add an `onGameOver` callback to the outlet context (mirroring the existing `onGameSessionStarted`), called from `GameInner` when `gameOver` becomes true:

```ts
// AppShell
const handleGameOver = React.useCallback(() => {
  setHasActiveSession(false);
}, []);
```

```ts
// HomeScreen — Resume button condition (already gated by onResumeCurrent prop presence)
// AppShell passes onResumeCurrent only when hasActiveSession is true, so no HomeScreen change needed
```

---

## Acceptance criteria

- [ ] After a game reaches FINAL naturally, the home screen does **not** show a Resume button.
- [ ] After loading a FINAL save and navigating home, the home screen does **not** show a Resume button.
- [ ] For a genuinely in-progress game (not FINAL), the Resume button still appears on the home screen.
- [ ] Clicking Resume for an in-progress game still navigates to `/game` correctly.

---

## Definition of done

- [ ] `hasActiveSession` is cleared (or gated) when the active game reaches FINAL.
- [ ] `AppShell.test.tsx` and/or `HomeScreen.test.tsx` cover the FINAL-game-no-resume case.
- [ ] `yarn lint && yarn build && yarn test` all pass.
- [ ] Manual verification: home screen after FINAL shows no Resume button; after navigating away mid-game it still shows Resume.

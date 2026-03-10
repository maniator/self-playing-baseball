# Bug J — Loading a save for a deleted team shows raw team ID in the game UI

**Severity:** High
**Status:** 🔴 Open
**Reported:** 2026-03-10 QA Session 2
**Can ship independently:** ⚠️ Batch with Bug A (Group 2) — both fix how team/player names are resolved in the game display layer; the same rendering area is touched and the fixes are low-risk to combine

> **Status values:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⚠️ Partially Fixed

---

## Summary

After deleting a custom team that has associated saves, loading one of those saves navigates to `/game` and plays the restored game correctly — but the UI leaks the team's raw internal ID in two places:

1. **Team stats tab** label shows `"▲ ct_Ld6X1"` instead of `"▲ Buffalo Dynamo"`.
2. **Hit log entries** show `"▲10 — ct_Ld6X1 #7"` instead of `"▲10 — Buffalo Dynamo #7"`.

No warning is shown to the user that the referenced team no longer exists. The game appears partially broken even though all game data is intact.

---

## Reproduction steps

1. Create two custom teams (e.g. Buffalo Dynamo vs Cincinnati Bucks).
2. Play a game to FINAL.
3. Navigate to **Manage Teams** → click **Delete** on one of the teams (e.g. Buffalo Dynamo) → confirm.
4. Navigate to **Load Saved Game** → click **Load** on the Buffalo Dynamo save.
5. Observe `/game`:
   - **Team tab**: shows `"▲ ct_Ld6X1"` (truncated raw ID) instead of `"Buffalo Dynamo"`.
   - **Hit log**: every entry for Buffalo Dynamo shows `"ct_Ld6X1 #4"` instead of `"Buffalo Dynamo #4"`.
   - Scoreboard team names still show correctly (loaded from save data — not affected).
   - Player names in batting stats still show correctly (also from save data — not affected).

---

## Root cause

**Team tab label:**

`src/features/customTeams/adapters/customTeamAdapter.ts` — `resolveTeamLabel()` line ~68:

```ts
if (!doc) return gameId.replace(/^custom:/, "").slice(0, 8);
```

When the team doc is not found (deleted), the function returns the first 8 characters of the internal ID (e.g. `"ct_Ld6X1"`) as a fallback. This is safe (avoids the full raw ID) but still meaningless to users.

**Hit log:**

`src/features/gameplay/components/HitLog/index.tsx` line ~51 uses `teamLabel()` → `resolveTeamLabel()`, so the same truncated ID appears in every hit log entry for that team.

The save's `state.teams` array stores the raw `"custom:ct_Ld6X1"` team ID at save time. When the team is deleted from RxDB, `resolveTeamLabel()` cannot find the doc and falls back to the truncated ID.

---

## Fix plan

The save snapshot (`SaveDoc.stateSnapshot`) already contains the resolved team display names at save time via `stateSnapshot.state.teamLabels`. These labels (or, if missing, a label derived from the save `name` as a final fallback) should be used when `resolveTeamLabel()` cannot find the team doc.

**Option A — Pass saved team names to the game as fallback labels (preferred)**

When a game is loaded from a save, read the team labels from `stateSnapshot.state.teamLabels` (or derive them from the save `name` as a final fallback) and store them in game state as fallback display names. `HitLog`, the team tab renderer, and any other UI that calls `resolveTeamLabel()` should use these fallbacks when the live doc is absent.

**Option B — Embed team names in `PlayLogEntry`**

For hit log entries specifically, store the resolved team name in `PlayLogEntry` at the time the hit is recorded (similar to the `batterName` fix in Bug A). This makes the hit log fully self-contained.

Option A is broader and fixes both surfaces (team tab + hit log) in one place. Option B could be implemented as part of Bug A if the two are batched.

**Bonus:** Consider showing a non-blocking banner or tooltip when a loaded save references a deleted team, to communicate to users that the team no longer exists in their library.

---

## Acceptance criteria

- [ ] Loading a save for a deleted team displays the team's original name (from save data) in the team stats tab, not a raw ID.
- [ ] Hit log entries for the deleted team show the team's original name, not a raw ID.
- [ ] Scoreboard names (already working) remain unaffected.
- [ ] Batting stats player names (already working) remain unaffected.
- [ ] No crash or blank UI occurs when a save references a non-existent team.

---

## Definition of done

- [ ] Fallback name resolution uses saved team name labels when the team doc is absent.
- [ ] Tests cover the load-orphan-save scenario for both the team tab and hit log.
- [ ] `yarn lint && yarn build && yarn test` all pass.
- [ ] Manual verification: delete a team, load its save, confirm team name (not raw ID) appears in tab and hit log.

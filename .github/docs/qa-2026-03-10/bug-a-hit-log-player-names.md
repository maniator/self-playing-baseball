# Bug A — Hit log shows `#N` position number instead of player name

**Severity:** Medium
**Status:** 🔴 Open
**Reported:** 2026-03-10 QA Session 1
**Can ship independently:** ⚠️ Batch with Bug J (Group 2) — both fix how player/team names are resolved in the game display layer; the same rendering area is touched and the fixes are low-risk to combine

> **Status values:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⚠️ Partially Fixed

---

## Summary

Every entry in the **Hit Log** panel on the game page shows the batting team's lineup slot number instead of the batter's name:

> `"▲6 — Buffalo Dynamo #2"`

Expected:

> `"▲6 — Will Lane (LF)"`

The `#N` notation is meaningless to users who are not simultaneously cross-referencing the batting stats table. This was observed in every game across all speeds (Normal, Fast, Instant, Manager Mode) and is fully consistent.

---

## Reproduction steps

1. Start any game (any speed, any teams).
2. Wait for a hit event to appear in the Hit Log panel.
3. **Expected:** Entry shows the batter's name, e.g. `"▲3 — Roberto Martinez"`.
4. **Actual:** Entry shows the lineup position number, e.g. `"▲3 — Buffalo Dynamo #4"`.

---

## Root cause

`src/features/gameplay/components/HitLog/index.tsx` line ~51:

```tsx
{HALF_ARROW[entry.half]}
{entry.inning} — {teamLabel(teams[entry.team])} #{entry.batterNum}
```

`entry.batterNum` is the 1-based batting order position (e.g. `4` for the cleanup hitter). The play log entry type (`PlayLogEntry` in `src/features/gameplay/context/index.tsx`) stores `batterNum` but not the player's name at the time of the hit.

---

## Fix plan

**Option A — Add `batterName` to `PlayLogEntry` (preferred)**

Extend the `PlayLogEntry` type to include a `batterName` field populated at the point the hit is recorded in the reducer. This is the cleanest fix: the name is captured at game time (so it works even after roster substitutions) and the hit log renderer just reads it.

Files:

- `src/features/gameplay/context/index.tsx` — add `batterName?: string` to `PlayLogEntry`
- Reducer / handler that creates `PlayLogEntry` objects — populate `batterName` from the active lineup at the moment of the hit
- `src/features/gameplay/components/HitLog/index.tsx` — render `entry.batterName ?? \`#${entry.batterNum}\`` (graceful fallback for old saves)

**Option B — Resolve name at render time**

Pass the active lineups into `HitLog` and resolve the name from `entry.team` + `entry.batterNum` at render time. This is simpler but fragile after substitutions (the lineup at render time may differ from the lineup when the hit occurred).

Option A is recommended for correctness.

---

## Acceptance criteria

- [ ] Hit log entries show the batter's name (e.g. `"▲3 — Roberto Martinez"`), not the lineup slot number.
- [ ] If `batterName` is absent in older saved games (backward compat), the entry gracefully falls back to `#N`.
- [ ] Substituted players show the correct name for the at-bat in which the hit occurred (not the current batter in that slot).

---

## Definition of done

- [ ] `PlayLogEntry` extended with `batterName`.
- [ ] Hit-creating reducer path populates `batterName`.
- [ ] `HitLog/index.tsx` renders `batterName` with `#N` fallback.
- [ ] `hitLog.test.tsx` updated to cover the name-rendering path.
- [ ] `yarn lint && yarn build && yarn test` all pass.
- [ ] Manual verification: every hit log entry shows a player name.

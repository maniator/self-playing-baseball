# Bug I — Help says stats are editable but stats are locked after player creation

**Severity:** Low
**Status:** 🔴 Open
**Reported:** 2026-03-10 QA Session 2
**Can ship independently:** ⚠️ Batch with Bugs D, E, H (Group 1) — all four are edits inside `HelpContent/index.tsx`; shipping together avoids four separate PRs for the same file

> **Status values:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⚠️ Partially Fixed

---

## Summary

The **How to Play → Custom Teams** section tells users they can edit stats after generating a random team:

> *"Use ✨ Generate Random to create a randomized team as a starting point. **Edit names, stats, and positions** to customize it."*

This is incorrect. In the actual team editor, **stat sliders are disabled for all existing players** — they are locked at creation and cannot be changed. Only the player's name and batting/throwing position are editable after creation. The "Stats are locked after creation." hint is shown per-player in the editor, but the Help text creates the opposite expectation.

Users who generate a random team and then try to adjust their pitcher's velocity will click the slider repeatedly, believe it is broken, and potentially abandon the feature.

---

## Reproduction steps

1. Navigate to `/help` → expand **Custom Teams**.
2. Read: *"Edit names, stats, and positions to customize it."*
3. Go to **Manage Teams** → generate a random team → click **Edit**.
4. Attempt to drag a stat slider (e.g. Contact for a batter).
5. **Expected (based on Help):** Slider is interactive.
6. **Actual:** Slider is disabled; small text reads "Stats are locked after creation."

---

## Root cause

`src/features/help/components/HelpContent/index.tsx` line ~61:

```tsx
Edit names, stats, and positions to customize it.
```

The help copy was written before (or without awareness of) the stat-lock design decision in `PlayerStatFields.tsx` (`disabled={isExistingPlayer}`).

---

## Fix plan

**File:** `src/features/help/components/HelpContent/index.tsx`

Remove "stats" from the editable fields list, and add a note about the lock:

```tsx
<Li>
  Use <strong>✨ Generate Random</strong> to create a randomized team as a starting point.
  Edit player names and positions to customize it.{" "}
  <strong>Note:</strong> stat values are set at creation and cannot be changed afterward.
</Li>
```

---

## Acceptance criteria

- [ ] Help → Custom Teams no longer says stats are editable for existing players.
- [ ] The help copy accurately reflects that names and positions can be changed but stats cannot.
- [ ] No other help copy is unintentionally changed.

---

## Definition of done

- [ ] `HelpContent/index.tsx` updated with accurate stat-lock description.
- [ ] `yarn lint && yarn build && yarn test` all pass.
- [ ] Manual verification: Help → Custom Teams copy matches the actual editor behavior.

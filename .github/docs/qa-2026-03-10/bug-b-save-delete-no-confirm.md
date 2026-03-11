# Bug B — Save deletion has no confirmation dialog

**Severity:** Low
**Status:** 🔴 Open
**Reported:** 2026-03-10 QA Session 1; reconfirmed Session 2
**Can ship independently:** ✅ Yes — single-line change in `SaveSlotList/index.tsx`; no shared files with other open bugs

> **Status values:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⚠️ Partially Fixed

---

## Summary

Clicking the **✕ Delete** button on a save (either on the `/saves` page or in the in-game 💾 Saves panel) immediately and permanently removes the save with no confirmation prompt. This is inconsistent with the **Delete** button on Manage Teams, which shows a native `confirm()` dialog before proceeding.

Saves are harder to recover than teams (teams can be re-created; game history data in a save is unique), so the asymmetry is backwards from a risk standpoint.

---

## Reproduction steps

1. Navigate to **Load Saved Game** (`/saves`) or open the 💾 Saves panel in-game.
2. Click the **✕** button on any save entry.
3. **Expected:** A confirmation prompt such as _"Delete this save? This cannot be undone."_
4. **Actual:** Save is deleted immediately with no prompt.

For comparison:

1. Navigate to **Manage Teams** (`/teams`).
2. Click **Delete** on any team.
3. A native `confirm()` dialog appears: _"Delete 'Team Name'? This cannot be undone."_

---

## Root cause

`src/features/saves/components/SaveSlotList/index.tsx` line ~52:

```tsx
<ActionBtn type="button" onClick={() => onDelete(s.id)} data-testid="delete-save-button">
  ✕
</ActionBtn>
```

The handler calls `onDelete(s.id)` directly with no guard, unlike the team delete flow which wraps the call in `window.confirm()`.

---

## Fix plan

**File:** `src/features/saves/components/SaveSlotList/index.tsx`

Wrap the delete call in a `window.confirm()` guard, matching the pattern used for team deletion:

```tsx
<ActionBtn
  type="button"
  onClick={() => {
    if (window.confirm("Delete this save? This cannot be undone.")) {
      onDelete(s.id);
    }
  }}
  data-testid="delete-save-button"
>
  ✕
</ActionBtn>
```

This is intentionally the minimal fix that restores consistency. A custom in-page confirmation modal could be used instead if a no-`window.confirm` policy is adopted later.

---

## Acceptance criteria

- [ ] Clicking ✕ on a save on `/saves` shows a confirmation prompt before deleting.
- [ ] Clicking ✕ on a save in the in-game Saves panel shows the same confirmation prompt.
- [ ] Clicking **Cancel** on the prompt leaves the save intact.
- [ ] Clicking **OK** on the prompt deletes the save as before.
- [ ] Existing tests for `SaveSlotList` are updated to account for the confirmation step.

---

## Definition of done

- [ ] `confirm()` guard added in `SaveSlotList/index.tsx`.
- [ ] Tests updated (mock `window.confirm` returning `true`/`false` and assert correct behavior in each case).
- [ ] `yarn lint && yarn build && yarn test` all pass.
- [ ] Manual verification: ✕ on a save requires confirmation before deletion in both the page and the panel.

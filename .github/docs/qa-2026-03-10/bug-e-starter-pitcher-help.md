# Bug E — Starter Pitcher selector not documented in How to Play

**Severity:** Low
**Status:** 🔴 Open
**Reported:** 2026-03-10 QA Session 1
**Can ship independently:** ⚠️ Batch with Bugs D, H, I (Group 1) — all four are edits inside `HelpContent/index.tsx`; shipping together avoids four separate PRs for the same file

> **Status values:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⚠️ Partially Fixed

---

## Summary

When a user enables **Manager Mode** on the Exhibition Setup page (`/exhibition/new`) and selects a team to manage, a **Starter Pitcher** dropdown appears allowing them to choose their starting pitcher before the game begins. This feature is not mentioned anywhere in the **How to Play → Pre-game Customization** section.

Users who manage a team for the first time may miss the dropdown entirely, or not understand what it controls.

---

## Reproduction steps

1. Navigate to `/help` → expand **Pre-game Customization**.
2. **Expected:** A bullet mentions the Starter Pitcher selector that appears when managing a team.
3. **Actual:** No mention of the Starter Pitcher dropdown.

To observe the actual feature:

1. Go to `/exhibition/new`.
2. Under **Manage a team?** select Home or Away.
3. A **Starting Pitcher** dropdown appears (e.g. "Memphis Bears starting pitcher: Felix Williams (SP)").
4. This dropdown is undocumented in help.

---

## Root cause

`src/features/help/components/HelpContent/index.tsx` — the Pre-game Customization `<ul>` block has no bullet for the Starter Pitcher selector. The feature was added without a corresponding help update.

---

## Fix plan

**File:** `src/features/help/components/HelpContent/index.tsx`

Add a bullet to the Pre-game Customization list:

```tsx
<Li>
  When managing a team, a <strong>Starting Pitcher</strong> dropdown appears — choose which eligible
  pitcher starts the game before clicking Play Ball.
</Li>
```

---

## Acceptance criteria

- [ ] Help → Pre-game Customization includes a bullet describing the Starter Pitcher selector.
- [ ] The bullet accurately reflects that the dropdown only appears when a team is being managed.
- [ ] No other help copy is unintentionally changed.

---

## Definition of done

- [ ] `HelpContent/index.tsx` updated with the Starter Pitcher bullet.
- [ ] `yarn lint && yarn build && yarn test` all pass.
- [ ] Manual verification: Help → Pre-game Customization shows the Starter Pitcher description.

# Bug D — "Instant" speed missing from How to Play

**Severity:** Low
**Status:** 🔴 Open
**Reported:** 2026-03-10 QA Session 1
**Can ship independently:** ⚠️ Batch with Bugs E, H, I (Group 1) — all four are one-line edits inside `HelpContent/index.tsx`; shipping together avoids four separate PRs for the same file

> **Status values:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⚠️ Partially Fixed

---

## Summary

The **How to Play → Game Flow** section lists available game speeds as "Slow / Normal / Fast" but omits **Instant**, which was added after the March 6 baseline. Instant behaves significantly differently from the other three speeds (the game resolves in a single render tick with no visible animation), so users who encounter it without context may think the app crashed or skipped ahead.

---

## Reproduction steps

1. Navigate to `/help` (or open the in-game **?** modal).
2. Expand **Game Flow**.
3. **Expected:** Copy mentions Slow, Normal, Fast, and Instant.
4. **Actual:** Copy reads *"Choose Slow / Normal / Fast speed to control the pace."* Instant is not mentioned.

Also: Instant speed persists between games via `localStorage`. A user who accidentally selects Instant and starts a new game will see it resolve immediately with no explanation.

---

## Root cause

`src/features/help/components/HelpContent/index.tsx` line ~77:

```tsx
<Li>Choose Slow / Normal / Fast speed to control the pace.</Li>
```

Instant was added to `GameControls` after this help text was written and the help text was not updated.

---

## Fix plan

**File:** `src/features/help/components/HelpContent/index.tsx`

Update the Game Flow list item to include Instant and briefly describe its behavior:

```tsx
<Li>
  Choose <strong>Slow / Normal / Fast / Instant</strong> speed to control the pace.
  Instant resolves the entire game in one step with no delay.
</Li>
```

---

## Acceptance criteria

- [ ] Help → Game Flow mentions Instant speed.
- [ ] The description conveys that Instant resolves the game immediately (sets user expectation).
- [ ] No other help copy is unintentionally changed.

---

## Definition of done

- [ ] `HelpContent/index.tsx` updated with Instant speed mention.
- [ ] `yarn lint && yarn build && yarn test` all pass.
- [ ] Manual verification: Help → Game Flow shows all four speed options.

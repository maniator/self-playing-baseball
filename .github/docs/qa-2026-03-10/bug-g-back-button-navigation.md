# Bug G — ← Back on player career page uses browser history instead of navigating to `/stats`

**Severity:** Low
**Status:** 🔴 Open
**Reported:** 2026-03-10 QA Session 1 (as Observation G); promoted to confirmed bug in Session 2
**Can ship independently:** ✅ Yes — single-line change in `PlayerCareerPage/index.tsx`; no shared files with other open bugs

> **Status values:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⚠️ Partially Fixed

---

## Summary

On the Player Career page (`/players/:id`), the **← Back** button calls `navigate(-1)` (browser history back). When the user has used the **← Prev / Next →** navigation buttons to browse between players, the history stack contains previous player pages, so ← Back returns to the previously viewed player rather than to the Career Stats page.

This is disorienting: users expect ← Back to mean "go back to the list I came from", not "go to the player I just looked at".

---

## Reproduction steps

1. Navigate to `/stats` → click on any player → land on their career page.
2. Click **Next →** to navigate to the next player.
3. Click **← Back**.
4. **Expected:** Returns to `/stats` (the Career Stats page).
5. **Actual:** Returns to the previous player's career page.

The problem compounds with more Prev/Next clicks: ← Back would need to be clicked multiple times to escape back to Career Stats.

---

## Root cause

`src/features/careerStats/pages/PlayerCareerPage/index.tsx` line 74:

```tsx
<BackBtn type="button" onClick={() => navigate(-1)} aria-label="Go back">
  ← Back
</BackBtn>
```

`navigate(-1)` steps back one entry in the browser history stack. The Prev/Next buttons push new entries onto the stack (each player page is a new navigation), so the stack does not reflect the user's conceptual "parent" page.

---

## Fix plan

**File:** `src/features/careerStats/pages/PlayerCareerPage/index.tsx`

Replace `navigate(-1)` with an explicit navigation to the Career Stats page, preserving the `team=` query param so the correct team tab is selected on return:

```tsx
<BackBtn
  type="button"
  onClick={() => navigate(teamParam ? `/stats?team=${encodeURIComponent(teamParam)}` : "/stats")}
  aria-label="Go back"
>
  ← Back
</BackBtn>
```

`teamParam` is already available in the component from the `useSearchParams` hook (used to pass `?team=` through to the player data hook).

---

## Acceptance criteria

- [ ] Clicking ← Back from a player career page always navigates to `/stats`, regardless of how many Prev/Next clicks have occurred.
- [ ] The `?team=` query param is preserved so the correct team tab is active on return to Career Stats.
- [ ] If no `team=` param was present, ← Back navigates to `/stats` without a query param.
- [ ] Prev / Next player navigation is unaffected.

---

## Definition of done

- [ ] `navigate(-1)` replaced with an explicit `/stats` navigation in `PlayerCareerPage/index.tsx`.
- [ ] Tests updated to assert that ← Back navigates to `/stats` (not to a previous player).
- [ ] `yarn lint && yarn build && yarn test` all pass.
- [ ] Manual verification: browsing Prev/Next across several players and then clicking ← Back lands on Career Stats.

# Bug 1 — Player career page shows raw ID for bench players with no appearances

**Severity:** Medium
**Status:** 🔴 Open — unverified (not reproduced in QA sessions; assumed present based on code inspection)
**Reported:** 2026-03-06 QA report
**Can ship independently:** ✅ Yes — touches only `usePlayerCareerData.ts` and its tests

> **Status values:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⚠️ Partially Fixed

---

## Summary

When a user navigates to the career page of a bench or reserve player who has never entered a game, the page heading shows `"Unknown Player"` instead of the player's name. This occurs because the name-resolution code falls back to a roster lookup only when the `team=` query parameter is present in the URL. If the user arrives via a direct URL without that parameter, the fallback fails and the heading shows the generic "Unknown Player" label rather than the real player name.

---

## Reproduction steps

1. Create a custom team with at least one bench player.
2. Play a game using that team. Do **not** substitute the bench player in.
3. Navigate to `/stats` → switch to the team → no bench player row will appear (zero plate appearances).
4. Directly navigate to `/players/<globalPlayerId>` **without** the `?team=custom:<teamId>` query param.
5. **Expected:** Page heading shows the player's real name (e.g. "Victor Sanchez").
6. **Actual:** Page heading shows `"Unknown Player"` rather than the player's name.

---

## Root cause

`src/features/careerStats/pages/PlayerCareerPage/usePlayerCareerData.ts` lines ~153–175:

The `playerName` memo falls back to a roster scan only when `teamContext` (the `team=` query param) is populated. When the user arrives at the page without that parameter, `teamContext` is null/undefined and the memo skips the roster scan, returning `"Unknown Player"`.

```ts
// Current: roster scan skipped when teamContext is absent
if (playerKey && teamContext) {
  // ... roster lookup using teamContext ...
}
return "Unknown Player";
```

---

## Fix plan

**File:** `src/features/careerStats/pages/PlayerCareerPage/usePlayerCareerData.ts`

When `teamContext` is absent but the player still has no game history, scan all loaded custom teams for a player whose `globalPlayerId` matches `playerKey`, rather than immediately returning `"Unknown Player"`.

```ts
// Proposed: fall back to scanning all teams when teamContext is absent
if (playerKey && !teamContext) {
  for (const team of customTeams) {
    const allPlayers = [
      ...(team.roster.lineup ?? []),
      ...(team.roster.bench ?? []),
      ...(team.roster.pitchers ?? []),
    ];
    const match = allPlayers.find((p) => p.globalPlayerId === playerKey);
    if (match?.name) return match.name;
  }
}
return "Unknown Player";
```

The existing `teamContext`-based path (lines 160–173) remains unchanged and takes priority.

---

## Acceptance criteria

- [ ] Navigating to `/players/<id>` without a `?team=` param for a bench player who has never appeared in a game shows the player's real name in the page heading (not `"Unknown Player"`).
- [ ] Behavior is unchanged when `team=` is present in the URL.
- [ ] Behavior is unchanged when `battingRows` or `pitchingRows` are populated (game-history path remains authoritative).
- [ ] If the player ID does not match any current roster, the page still renders gracefully (shows "Unknown Player", not a crash).

---

## Definition of done

- [ ] Unit test added for the new no-`teamContext` + no-game-history fallback path.
- [ ] All existing `usePlayerCareerData` tests pass.
- [ ] `yarn lint && yarn build && yarn test` all pass.
- [ ] Manual verification: bench player's page heading shows their name when arrived at without a `?team=` param.

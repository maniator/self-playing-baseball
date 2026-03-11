# Bug H — Help uses wrong emoji 🔔 for the music slider (actual UI shows 🎵)

**Severity:** Low
**Status:** 🔴 Open
**Reported:** 2026-03-10 QA Session 2
**Can ship independently:** ⚠️ Batch with Bugs D, E, I (Group 1) — all four are edits inside `HelpContent/index.tsx`; shipping together avoids four separate PRs for the same file

> **Status values:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⚠️ Partially Fixed

---

## Summary

The **How to Play → Game Flow** section describes the two volume controls using emojis. The second emoji is wrong:

> Help text: _"🔊 slider = play-by-play voice volume · **🔔** slider = chime & fanfare volume."_

Actual in-game UI:

- 🔊 button/slider — announcement/speech volume ✅
- **🎵** button/slider — music volume ❌ (Help says 🔔)

A user reading the help and then looking at the game controls will not find a 🔔 icon anywhere.

---

## Reproduction steps

1. Navigate to `/help` → expand **Game Flow**.
2. Read: _"🔊 slider = play-by-play voice volume · 🔔 slider = chime & fanfare volume."_
3. Open a game at any speed.
4. Look at the volume controls.
5. **Expected:** A 🔔 icon for the second slider.
6. **Actual:** A 🎵 icon for the second slider. No 🔔 icon anywhere.

---

## Root cause

`src/features/help/components/HelpContent/index.tsx` line ~78:

```tsx
<Li>🔊 slider = play-by-play voice volume · 🔔 slider = chime &amp; fanfare volume.</Li>
```

The 🔔 emoji was likely used when the second slider controlled chime/alert audio. It was not updated when the control was changed to a music slider (🎵).

---

## Fix plan

**File:** `src/features/help/components/HelpContent/index.tsx`

Update the emoji and description to match the actual UI:

```tsx
<Li>🔊 slider = play-by-play voice volume · 🎵 slider = background music volume.</Li>
```

---

## Acceptance criteria

- [ ] Help → Game Flow uses 🎵 for the music slider description, not 🔔.
- [ ] The description accurately reflects what the slider controls.
- [ ] No other help copy is unintentionally changed.

---

## Definition of done

- [ ] `HelpContent/index.tsx` updated with the correct emoji and description.
- [ ] `yarn lint && yarn build && yarn test` all pass.
- [ ] Manual verification: Help emoji matches the in-game UI emoji for each slider.

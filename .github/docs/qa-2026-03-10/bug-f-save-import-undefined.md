# Bug F — Save import error leaks the word "undefined"

**Severity:** Medium
**Status:** 🔴 Open
**Reported:** 2026-03-10 QA Session 2
**Can ship independently:** ⚠️ Batch with Bug 5 (Group 3) — both fix import error messages and touch the same area of save/team import code; shipping together gives consistent import UX in one PR

> **Status values:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⚠️ Partially Fixed

---

## Summary

When a user pastes arbitrary or invalid JSON into the **Import Save** text area (in the in-game 💾 Saves panel or on `/saves`) and clicks "Import from text", the error message shown contains the raw JavaScript token `"undefined"`:

> _"Unsupported save version: undefined"_

This is the same category of issue as Bug 5 (team import error), which was partially improved but only for the teams import path. The save import path was not updated.

---

## Reproduction steps

1. Open the 💾 Saves dialog in-game (or navigate to `/saves`).
2. Paste invalid JSON into the import textarea, e.g. `{"totally":"wrong"}`.
3. Click **Import from text**.
4. **Expected:** A clear, user-friendly error with no raw code tokens.
5. **Actual:** Error reads _"Unsupported save version: undefined"_.

---

## Root cause

`src/features/saves/storage/saveStore.ts` line ~210:

```ts
if (version !== RXDB_EXPORT_VERSION) throw new Error(`Unsupported save version: ${version}`);
```

When the pasted JSON has no `version` field, `version` is `undefined`, which JavaScript stringifies as `"undefined"` in the template literal. There is no prior check that `version` exists and is a number.

---

## Fix plan

**File:** `src/features/saves/storage/saveStore.ts`

Add an explicit check for a missing or non-numeric `version` before the version-number comparison, and produce a distinct, user-friendly message for each case:

```ts
const version = parsed["version"];

if (typeof version !== "number") {
  throw new Error(
    "Invalid save file. Make sure to export the save using the Ballgame app (💾 Saves → Export).",
  );
}
if (version !== RXDB_EXPORT_VERSION) {
  throw new Error(
    `Unsupported save version: ${version}. Make sure to export using the current version of the Ballgame app.`,
  );
}
```

---

## Acceptance criteria

- [ ] Pasting `{}` or any JSON without a `version` field shows a message that contains no raw JavaScript tokens (`undefined`, `null`, `NaN`, etc.).
- [ ] Pasting a JSON with a wrong but numeric `version` still shows the version number in the error.
- [ ] Pasting a valid exported save still imports successfully.
- [ ] The error message is consistent in tone and structure with the improved team import error (Bug 5).

---

## Definition of done

- [ ] Validation updated in `saveStore.ts`.
- [ ] Unit tests cover the no-`version` and wrong-`version` error paths.
- [ ] `yarn lint && yarn build && yarn test` all pass.
- [ ] Manual verification: pasting `{}` into the save import field shows a clean, jargon-free error.

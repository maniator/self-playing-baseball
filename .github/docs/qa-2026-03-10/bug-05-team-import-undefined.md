# Bug 5 — Team import error leaks the word "undefined"

**Severity:** Low
**Status:** ⚠️ Partially Fixed — error message improved in March 2026 but the word "undefined" still appears
**Reported:** 2026-03-06 QA report; confirmed still present 2026-03-10 Session 1
**Can ship independently:** ⚠️ Batch with Bug F (Group 3) — both fix import error messages in the same area; ship together to keep import UX consistent

> **Status values:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⚠️ Partially Fixed

---

## Summary

When a user imports an invalid or unrecognized custom teams file, the error message contains the raw JavaScript token `"undefined"`:

> *"Invalid teams file (unsupported format version: undefined). Make sure to export using the Ballgame app."*

The word "undefined" is a technical JavaScript artifact that means nothing to a non-developer user. The message should either omit the version value entirely when it is absent, or replace it with a plain-language description like "unrecognized" or "missing".

---

## Reproduction steps

1. Navigate to **Manage Teams** (`/teams`).
2. Paste any JSON that is not a valid Ballgame teams export (e.g. `{"foo": "bar"}`) into the import textarea.
3. Click **↑ Import from Text**.
4. **Expected:** A clear, jargon-free error message with no raw code tokens.
5. **Actual:** Error reads `"…unsupported format version: undefined…"`.

---

## Root cause

`src/features/customTeams/storage/customTeamExportImport.ts` — `parseExportedCustomTeams()`, around line 210:

```ts
if (obj["formatVersion"] !== 1)
  throw new Error(
    `Invalid teams file (unsupported format version: ${obj["formatVersion"]}). ` +
      "Make sure to export using the Ballgame app."
  );
```

When the parsed object has no `formatVersion` field, `obj["formatVersion"]` evaluates to `undefined`, which JavaScript coerces to the string `"undefined"` inside the template literal.

---

## Fix plan

**Files:**
- `src/features/customTeams/storage/customTeamExportImport.ts`
- `src/features/careerStats/storage/gameHistoryStore.ts` (same pattern)

Check whether `formatVersion` is present and a number before using it in the message:

```ts
// Before throwing, produce a human-readable version label:
const versionLabel =
  typeof obj["formatVersion"] === "number"
    ? String(obj["formatVersion"])
    : "unrecognized";
throw new Error(`Unsupported custom teams format version: ${versionLabel}`);
```

Or simplify the message to remove the version value entirely when it is absent:

```ts
const version = obj["formatVersion"];
if (typeof version !== "number") {
  throw new Error("Invalid teams file. Make sure to export using the Ballgame app (Export All Teams or Export on a single team).");
}
if (version !== SUPPORTED_VERSION) {
  throw new Error(`Unsupported teams format version: ${version}. Make sure to export using the Ballgame app.`);
}
```

---

## Acceptance criteria

- [ ] Importing a completely invalid JSON object (e.g. `{"foo":"bar"}`) produces an error message with no raw JavaScript tokens (`undefined`, `null`, `NaN`, `[object Object]`, etc.).
- [ ] Importing a JSON with an unrecognized `formatVersion` number still shows the version number in the message.
- [ ] Importing a valid teams export still succeeds without errors.

---

## Definition of done

- [ ] Error message updated in `customTeamExportImport.ts` and `gameHistoryStore.ts`.
- [ ] Unit tests cover the no-`formatVersion` and wrong-`formatVersion` error paths.
- [ ] `yarn lint && yarn build && yarn test` all pass.
- [ ] Manual verification: pasting `{}` into the import field shows a clean, jargon-free error.

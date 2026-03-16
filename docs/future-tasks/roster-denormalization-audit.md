# Future Task: Why does `CustomTeamDoc` embed a full roster instead of referencing player IDs?

**Status:** Future investigation / design decision
**Raised by:** PR #191 review
**Related:** `perf-big-o-audit.md` issue #6 (option A: `nameLowercase` index + players-by-team lookup)

---

## Background

The current data model stores player data in two places simultaneously:

1. **`players` collection** — each player is a separate `PlayerDoc` row keyed by a composite ID
   `${teamId}:${playerId}`. This is the authoritative, indexed store used for roster hydration,
   career stats joins, and import/export orchestration.

2. **`CustomTeamDoc.roster`** — the parent team document embeds a full copy of every player
   (`TeamPlayer[]`) in its `lineup`, `bench`, and `pitchers` arrays. This embedded copy is
   populated by `assembleRoster` at read time and cleared by the legacy-backfill path after
   migrating old embedded rosters into the `players` collection.

This means that after a successful save, every player's stats, name, handedness, position, and
fingerprint exist twice in IndexedDB — once in `players` and once inside the parent
`CustomTeamDoc`.

---

## Why the duplication exists today

The embedded roster was the original design (before the `players` collection was introduced).
It still survives because:

- **Legacy migration** — pre-`players` exports include `roster.lineup/bench/pitchers` directly
  in the bundle JSON. The backfill path (`populateRoster`) reads this embedded data and writes
  it into the `players` collection, then clears the embedded arrays. Removing the embedded
  field entirely would break this migration path until all users have migrated.

- **Read convenience** — some parts of the codebase read `CustomTeamDoc.roster` directly
  (e.g. game setup, team editor, export). Replacing those reads with a join to `players`
  requires plumbing `db` into contexts that currently just receive a plain `CustomTeamDoc`.

- **Export bundles** — the export format (`customTeamTeamBundle.ts`) serialises
  `CustomTeamDoc.roster` inline so that a single JSON file is self-contained and portable.
  If we remove the embedded roster, the export path would need to do a `players` lookup
  before building the bundle.

---

## What the ideal state looks like

```
CustomTeamDoc {
  id, name, abbreviation, city, source,
  teamSeed, fingerprint, metadata,
  // roster removed — players are looked up via the `players` collection
}

PlayerDoc {
  id: "${teamId}:${playerId}",
  teamId, playerId, globalPlayerId,
  name, role, batting, pitching,
  position, handedness, jerseyNumber,
  playerSeed, fingerprint,
  section, orderIndex, schemaVersion
}
```

The `players` collection already has this shape. The only missing piece is removing the
redundant write back to `CustomTeamDoc.roster` and updating all readers.

---

## Why this is a separate future task (not part of PR #191)

1. **Schema migration required** — bumping `CustomTeamDoc` schema version + writing a
   `migrationStrategies` entry to remove the `roster` field safely (it must be kept in
   the migration input to backfill `players` if not already done).

2. **Call-site churn** — every place that reads `team.roster` would need to be updated to
   call `fetchPlayerDocs(db, team.id)` or a new `getTeamWithRoster(db, team.id)` helper.

3. **Export path** — `buildCustomTeamBundle` / `buildTeamExportPayload` needs to assemble
   the roster from `players` rather than reading it from the team doc.

4. **Risk surface** — changing how every roster is read and written touches the game setup,
   team editor, import, export, and career stats paths simultaneously. That scope warrants
   its own focused PR with dedicated characterization tests.

---

## Recommended approach

1. Open a new issue titled **"Remove embedded `CustomTeamDoc.roster` — reference players by ID only"**.
2. Add a `nameLowercase` index to `CustomTeamDoc` (see `perf-big-o-audit.md` option A, issue #6)
   in the same migration — two birds, one version bump.
3. Introduce a `getTeamWithRoster(db, teamId)` helper that returns
   `CustomTeamDoc & { roster: TeamRoster }` by joining `players` — replaces the current
   embedded-roster spread pattern at every call site without changing the public type shape.
4. Update the export bundle builder to call `fetchPlayerDocs` before serialising.
5. Keep `populateRoster` only for the legacy backfill migration strategy (version N−1 → N)
   and remove it from the normal write path once the migration is complete.

---

## Related design question: should `TeamPlayer` and `PlayerDoc` converge?

The reviewer in PR #191 also asked whether `TeamPlayer` and `PlayerDoc` (which they called
"player duck") should be the same type with a `sig` field. Right now:

- `TeamPlayer` is the in-memory / export shape (no DB plumbing fields).
- `PlayerDoc` is `Omit<TeamPlayer, "sig"> & { id, playerId, teamId, section, orderIndex, schemaVersion }`.
- `TeamPlayerWithSig` (from `customTeamSignatures.ts`) is `TeamPlayer & { sig?: string }` — a
  transient export-only shape.

If we remove the embedded roster:
- `TeamPlayer` would effectively become the view model rendered from a `PlayerDoc` after
  stripping the DB-only fields.
- Both would naturally have a `fingerprint` field (already present on `PlayerDoc`), so
  `sig` as a separate export-only field becomes redundant — duplicate detection could just
  compare `fingerprint` values directly.
- The unification would reduce the number of type conversions throughout the codebase.

This is worth addressing in the same future PR as the roster denormalization.

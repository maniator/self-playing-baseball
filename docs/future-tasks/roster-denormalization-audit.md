# Future Task: Denormalize the data model — remove embedded roster, decouple player identity from team, establish semantic schema names

**Status:** Future investigation / design decision
**Raised by:** PR #191 review
**Related:** `perf-big-o-audit.md` issue #6 (option A: `nameLowercase` index + players-by-team lookup)

---

## Summary of problems this task addresses

Three related but distinct problems all point at the same root cause — the data model was
built incrementally and now has structural compromises that will block future features like
leagues and free agents:

1. **Player data is duplicated** — every player exists twice in IndexedDB (once in the
   `players` collection, once embedded inside `CustomTeamDoc.roster`).

2. **Player identity is coupled to team membership** — `PlayerDoc.id` uses a composite
   primary key `${teamId}:${playerId}`, meaning a player "is" their team. If a player moves
   to a different team, they become a different database row with a different ID.

3. **Schema and type names are historical accidents** — `CustomTeamDoc`, `PlayerDoc`,
   `TeamPlayer`, `SaveDoc` don't reflect a coherent domain vocabulary. As leagues and free
   agents are introduced, the naming gap will widen.

All three problems should be resolved together in a single coordinated schema migration.

---

## Problem 1 — Roster duplication

### Current state

The current data model stores player data in two places simultaneously:

1. **`players` collection** — each player is a `PlayerDoc` row, the authoritative store used
   for roster hydration, career stats joins, and import/export orchestration.

2. **`CustomTeamDoc.roster`** — the parent team document embeds a full copy of every player
   (`TeamPlayer[]`) in its `lineup`, `bench`, and `pitchers` arrays. This is populated at read
   time by `assembleRoster` and written back after every save.

Every player's stats, name, handedness, position, and fingerprint therefore exist twice in
IndexedDB after a successful write.

### Why the duplication exists

The embedded roster was the original design before the `players` collection was introduced.
It survives because:

- **Legacy migration** — pre-`players` export bundles include the roster inline. The backfill
  path (`populateRoster`) reads this embedded data, writes it into `players`, then clears the
  arrays. Removing the embedded field entirely requires keeping it available during migration.

- **Read convenience** — several paths read `team.roster` directly (game setup, team editor,
  export). Replacing them with a DB join requires plumbing `db` into contexts that currently
  only receive a plain `CustomTeamDoc`.

- **Export bundles** — `buildCustomTeamBundle` serialises `CustomTeamDoc.roster` inline for
  a self-contained portable JSON file. Removing the embedded copy means the export path must
  run a `fetchPlayerDocs` query before building the bundle.

### Fix

Remove `CustomTeamDoc.roster` and update all readers to use `fetchPlayerDocs(db, teamId)` or
a new `getTeamWithRoster(db, teamId): Promise<CustomTeamDoc & { roster: TeamRoster }>` helper.
Keep `populateRoster` only inside the v(N−1)→vN migration strategy so legacy bundles still
backfill cleanly.

---

## Problem 2 — Player identity is coupled to team membership

### Current state

`PlayerDoc` uses a composite primary key `id: "${teamId}:${playerId}"`. The reasoning at the
time was to prevent key collisions when two different teams both contain a player with the same
original local ID (e.g. both teams generated a player with `id: "p1"`).

### Why this is wrong

A player is a person, not a roster slot. The player's identity — their name, stats, seed, and
career history — should be independent of which team they currently belong to.

**Open question for the future-task investigation:**

> _If a player is traded, signed as a free agent, or joins a league team, should their career
> stats carry over? If yes, the player's stable identity must be decoupled from the team's ID.
> The current composite key means a player literally becomes a different database row every
> time they change teams, making cross-team career continuity impossible without expensive
> re-keying._

The `globalPlayerId` field was introduced as a partial mitigation — career stats are keyed
on `globalPlayerId` rather than on the composite `id`. But the composite `id` still drives
RxDB primary-key semantics, meaning there is no single authoritative row for "this player"
independent of their current team.

### Proposed fix

Give every player a **stable, globally unique, team-independent primary key** — their own
`id` field — derived at creation time from `playerSeed` (or a new `generatePlayerId()`
helper). The team association becomes a foreign-key field (`teamId`) on the player row, not
part of the primary key.

```
PlayerDoc (proposed) {
  id:            string   // stable globally-unique player ID, e.g. "pl_a3f9c2d1"
  teamId:        string   // FK → TeamDoc.id  (null for free agents)
  rosterSection: "lineup" | "bench" | "pitchers" | null
  orderIndex:    number   // sort order within the section
  ...rest of player fields (name, role, batting, pitching, etc.)
}
```

`playerId` and the `${teamId}:${playerId}` composite key would be removed entirely.
`globalPlayerId` would be retired in favour of `PlayerDoc.id`.

---

## Problem 3 — Schema and type names don't reflect the domain

### Current names vs. what they actually are

| Current name     | What it actually represents                            |
| ---------------- | ------------------------------------------------------ |
| `CustomTeamDoc`  | A team (custom or generated)                           |
| `PlayerDoc`      | A player on a team's roster                            |
| `TeamPlayer`     | An in-memory player view (used in roster/export logic) |
| `SaveDoc`        | A saved game state                                     |
| `GameHistoryDoc` | A completed game record                                |

None of these names would make sense to a new contributor looking at the code for the first
time. The `Custom` prefix on `CustomTeamDoc` was meaningful when only user-created teams were
stored; now generated teams live in the same collection, making the name misleading.

### Proposed rename targets (starting from v1 of each new schema)

| Proposed name   | Replaces                                           | Notes                                                           |
| --------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| `TeamDoc`       | `CustomTeamDoc`                                    | Covers both custom and generated teams                          |
| `PlayerDoc`     | `PlayerDoc` (keep name, fix shape)                 | See Problem 2 — decouple from team                              |
| `RosterSlotDoc` | _(implicit in `PlayerDoc.section` + `orderIndex`)_ | Could be a separate join table if needed for free-agent support |
| `GameSaveDoc`   | `SaveDoc`                                          | Clarifies this is a saved _game_ state, not a generic save      |
| `GameResultDoc` | `GameHistoryDoc`                                   | A completed game result                                         |

### Future collections to plan for

As leagues and free agents are introduced, the following collections will be needed:

| Future collection       | Purpose                                                                |
| ----------------------- | ---------------------------------------------------------------------- |
| `LeagueDoc`             | A league that teams can join                                           |
| `LeagueTeamDoc`         | Join table: which teams are in which league, with standings            |
| `FreeAgentDoc`          | A player not currently on any team's roster; references `PlayerDoc.id` |
| `TradeDoc` _(optional)_ | Audit record of a player moving from one team to another               |

If `PlayerDoc.id` is stable and team-independent (see Problem 2), free agents and trades
become natural extensions of the same model — a player is simply a `PlayerDoc` with
`teamId: null` and `rosterSection: null` while in the free-agent pool.

---

## Why this is a separate future task (not part of PR #191)

1. **Multiple coordinated schema version bumps** — `TeamDoc`, `PlayerDoc`, and potentially
   `GameSaveDoc` all need version bumps with migration strategies, ideally in one PR so users
   only go through one migration pass.

2. **Primary-key change requires RxDB re-key** — changing `PlayerDoc.id` from the composite
   `${teamId}:${playerId}` to a stable UUID requires careful migration: old rows must be
   re-inserted under the new key and career stats joins re-pointed.

3. **Broad call-site churn** — renaming `CustomTeamDoc` → `TeamDoc` touches type imports
   across the entire codebase. This should be a dedicated mechanical rename PR, not mixed
   with behavior changes.

4. **Risk surface** — game setup, team editor, import, export, career stats, and save/load
   all read player and team data. The scope warrants its own characterization test suite
   before any changes land.

---

## Recommended sequencing

These can be done in separate PRs in this order:

1. **PR A — Remove embedded roster** (smallest scope, unblocks everything else)
   - Bump `CustomTeamDoc` schema version; remove `roster` in migration strategy after
     backfilling `players`.
   - Introduce `getTeamWithRoster(db, teamId)` helper.
   - Add `nameLowercase` index (see `perf-big-o-audit.md` issue #6).

2. **PR B — Stable player IDs** (prerequisite for free agents and cross-team career stats)
   - Bump `PlayerDoc` schema version; migrate composite IDs to stable `pl_*` IDs.
   - Remove `playerId` field; retire `globalPlayerId` in favour of `PlayerDoc.id`.
   - Update career stats joins.

3. **PR C — Semantic renames** (mechanical, low-risk)
   - `CustomTeamDoc` → `TeamDoc`; update all imports.
   - `SaveDoc` → `GameSaveDoc`; `GameHistoryDoc` → `GameResultDoc`.

4. **PR D — Free agents and leagues** (net-new feature work, enabled by PRs A–C)
   - Add `LeagueDoc`, `LeagueTeamDoc`, `FreeAgentDoc` collections.
   - Wire free-agent pool UI and player transfer flows.

---

## Related design question: should `TeamPlayer` and `PlayerDoc` converge?

Once the embedded roster is removed and player IDs are stable, `TeamPlayer` (the current
in-memory / export shape) becomes redundant:

- `TeamPlayer` is essentially `PlayerDoc` minus the DB plumbing fields.
- If `PlayerDoc.id` is stable and globally unique, the export bundle can just emit the player
  ID and stats directly from `PlayerDoc` — no separate `TeamPlayer` view-model needed.
- `sig` as a separate export-only field becomes redundant once `PlayerDoc.fingerprint` is
  always computed from clamped stats at write time — duplicate detection can compare
  `fingerprint` values directly instead of recomputing a separate `sig`.

The unification would reduce the number of type conversions and eliminate the `TeamPlayerWithSig`
transient type entirely.

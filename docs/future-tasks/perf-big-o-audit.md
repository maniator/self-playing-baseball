# Future task: fix Big-O issues identified in codebase audit

## Background

A codebase-wide Big-O audit was performed during PR #191 (custom-team store
refactor). Several performance issues were found and catalogued here so they
can be addressed as a focused follow-up after that branch is merged.

The most impactful fix in PR #191 was replacing an O(T × P) pattern in
`importCustomTeams` with a single `$in` DB query + `Map<teamId, PlayerDoc[]>`
grouping pass, bringing roster prescan to O(P' + T). The issues below follow
the same playbook.

**Do not mix these changes into the PR #191 branch.** Apply them against
`master` after that PR is merged.

---

## Issues (ordered high → low impact)

### 1 — `listCustomTeams` roster hydration: N+1 DB queries  ⚡ HIGH

**File:** `src/features/customTeams/storage/customTeamStore.ts:51`

```typescript
// current — one db.players query per team
return Promise.all(filtered.map((t) => populateRoster(db, t)));
```

`populateRoster` calls `fetchPlayerDocs(db, team.id)` which runs
`db.players.find({ selector: { teamId } })` — one DB round-trip per team.
With T teams that is T + 1 total queries.

**Fix:** Apply the same `$in` + Map pattern used in `importCustomTeams`:

```typescript
const teamIds = filtered.map((t) => t.id);
const playersByTeamId = new Map<string, PlayerDoc[]>();
if (teamIds.length > 0) {
  const allPlayerDocs = (
    await db.players.find({ selector: { teamId: { $in: teamIds } } }).exec()
  ).map((d) => d.toJSON() as PlayerDoc);
  for (const doc of allPlayerDocs) {
    const bucket = playersByTeamId.get(doc.teamId) ?? [];
    bucket.push(doc);
    playersByTeamId.set(doc.teamId, bucket);
  }
}
return Promise.all(filtered.map((t) => {
  const docs = playersByTeamId.get(t.id) ?? [];
  // pass pre-fetched docs into a non-DB-querying variant of populateRoster
  ...
}));
```

`populateRoster` (in `customTeamRosterPersistence.ts`) will need a companion
variant that accepts pre-fetched `PlayerDoc[]` instead of querying the DB
itself, so the single-team `getCustomTeam` path can keep calling the existing
version.

---

### 2 — `exportCustomTeams(ids)`: full hydration then filter  ⚡ MEDIUM

**File:** `src/features/customTeams/storage/customTeamStore.ts:216-218`

```typescript
// current — hydrates ALL teams, then discards unwanted ones
const all = await this.listCustomTeams(ids ? { includeArchived: true } : undefined);
const toExport = ids ? all.filter((t) => ids.includes(t.id)) : all;
//                                         ^^^^^^^^^ O(|ids|) per team
```

When `ids` is provided this fetches and fully hydrates every team in the DB,
then throws away all but the requested ones. The inner `ids.includes()` is
also O(|ids|) per iteration.

**Fix:** Pass a `$in` selector directly to the DB query and use `Set.has()`:

```typescript
const idSet = ids ? new Set(ids) : null;
const docs = await db.customTeams
  .find(idSet ? { selector: { id: { $in: [...idSet] } } } : { sort: [...] })
  .exec();
// hydrate only the docs we actually want, then export
```

---

### 3 — Name-uniqueness checks: full table scan on every create/update  ⚡ MEDIUM

**File:** `src/features/customTeams/storage/customTeamStore.ts:73-75` and `:118-120`

```typescript
// current — fetches all teams for a case-insensitive linear scan
const existing = await this.listCustomTeams({ includeArchived: true, withRoster: false });
const duplicate = existing.find((t) => t.name.toLowerCase() === nameLower);
```

Called on every `createCustomTeam` and `updateCustomTeam`.

**Fix (option A — preferred):** Add a `nameLowercase` field to `CustomTeamDoc`
and its RxDB schema (with an index), then query:
```typescript
const hit = await db.customTeams
  .findOne({ selector: { nameLowercase: nameLower } })
  .exec();
```
Requires a schema migration bump (version + strategy).

**Fix (option B — no schema change):** Use `$regex` with a case-insensitive
flag:
```typescript
const hits = await db.customTeams
  .find({ selector: { name: { $regex: new RegExp(`^${escapeRegex(nameLower)}$`, "i") } } })
  .exec();
```
Note: `$regex` is unindexed in RxDB/PouchDB — acceptable for small collections
but not as clean as option A.

---

### 4 — `assembleRoster`: three sequential filter passes  ⚡ LOW

**File:** `src/features/customTeams/storage/customTeamPlayerDocs.ts:61-72`

```typescript
// current — three separate O(n) filter passes over the same array
const lineup   = playerDocs.filter((p) => p.section === "lineup")  .sort(...).map(toTeamPlayer);
const bench    = playerDocs.filter((p) => p.section === "bench")   .sort(...).map(toTeamPlayer);
const pitchers = playerDocs.filter((p) => p.section === "pitchers").sort(...).map(toTeamPlayer);
```

**Fix:** Single partitioning pass:
```typescript
const buckets: Record<string, PlayerDoc[]> = { lineup: [], bench: [], pitchers: [] };
for (const doc of playerDocs) buckets[doc.section]?.push(doc);
const lineup   = buckets.lineup.sort(...).map(toTeamPlayer);
const bench    = buckets.bench.sort(...).map(toTeamPlayer);
const pitchers = buckets.pitchers.sort(...).map(toTeamPlayer);
```

P is bounded (~25 docs per team) so this is low-priority but trivial to fix.

---

### 5 — `useGameHistorySync.buildPlayerKey`: repeated linear scans per commit  ⚡ LOW-MEDIUM

**File:** `src/features/careerStats/hooks/useGameHistorySync.ts:38-45`

```typescript
// called once per player for every game-end commit
const teamDoc = customTeams.find((t) => t.id === customId);  // O(T) — rescanned per player
const player  = allPlayers.find((p) => p.id === playerId);   // O(P) — rescanned per player
```

`buildPlayerKey` is called in a loop over all players at game-end. The
`customTeams` array is rescanned from scratch on each call.

**Fix:** Build a `Map<teamId, CustomTeamDoc>` (and per-team
`Map<playerId, TeamPlayer>`) once before the loop so each lookup is O(1):

```typescript
const teamMap = new Map(customTeams.map((t) => [t.id, t]));
// inside loop:
const teamDoc = teamMap.get(customId);
```

---

### 6 — `CareerStatsPage`: full stat-collection scan just to extract team IDs  ⚡ LOW-MEDIUM

**File:** `src/features/careerStats/pages/CareerStatsPage/index.tsx:305-313`

```typescript
// current — fetches entire playerGameStats + pitcherGameStats collections
const [batting, pitching] = await Promise.all([
  db.playerGameStats.find().exec(),
  db.pitcherGameStats.find().exec(),
]);
// then manually iterates to collect distinct teamIds
```

**Fix (option A):** Store a dedicated `teamHistory` summary document (one per
teamId) updated incrementally at game-end by `useGameHistorySync`, so the page
can query a small metadata collection instead of the full stats collections.

**Fix (option B — simpler):** Add a separate `teamsWithHistory` index document
populated by `useGameHistorySync` at commit time, queried with a single
`findOne`.

---

### 7 — `decisions.ts` / `reducer.ts`: array `.includes()` and `.filter()` in hot dispatch path  ⚡ LOW

**Files:**
- `src/features/gameplay/context/handlers/decisions.ts:100,106,112,154`
- `src/features/gameplay/context/reducer.ts:130`

```typescript
// O(subOut.length) per substitution decision
state.substitutedOut[teamIdx].includes(benchPlayerId)
state.rosterBench[teamIdx].filter((id) => id !== benchPlayerId)
```

`rosterBench` and `substitutedOut` are `string[]` in `State`, checked with
`.includes()` (O(n)) and `.filter()` on every substitution dispatch.

**Fix:** Convert both to `Set<string>` inside `State`. Sets serialize to `[]`
in JSON so they need to be stored as arrays in save docs and re-hydrated to
Sets on `restore_game`. Update `initialState`, `restore_game` handler, save
serialization, and all consumers.

The collections are small (≤ 14 players per team) so real-world impact is
minimal — but removes structural misuse of array `.includes()` in a hot path.

---

### 8 — `saveStore.ts`: N individual `findOne` calls for custom-team validation  ⚡ LOW

**File:** `src/features/saves/storage/saveStore.ts:252`

```typescript
// current — one findOne per custom team ID (typically 1–2 IDs)
await Promise.all(customTeamIds.map((id) => db.customTeams.findOne(id).exec()))
```

**Fix:** Single `$in` query (already the established pattern in the codebase):

```typescript
await db.customTeams.find({ selector: { id: { $in: customTeamIds } } }).exec()
```

Low priority since `customTeamIds` is at most 2 entries (home + away), but it
aligns the code with the `$in` convention established elsewhere.

---

## Suggested approach for the Copilot agent picking this up

1. Start with issue **1** (`listCustomTeams` N+1 queries) — it is called on
   every Teams page load and transitively by `createCustomTeam`,
   `updateCustomTeam`, and `exportCustomTeams`.
2. Issues **2** and **3** are natural follow-ons in the same file.
3. Issues **4**, **5**, **7**, and **8** are self-contained and low-risk;
   address them in any order.
4. Issue **6** (`CareerStatsPage` team IDs) may require a small schema
   addition and should be tackled last.

For each fix:
- Add or update unit tests that cover the changed code path.
- Run `yarn lint` and `yarn test` before committing.
- Use small, focused commits — one issue per commit.
- This is a performance refactor only; do not change public API shapes,
  observable behavior, or data schemas beyond what each fix strictly requires
  (exception: issue 3 option A and issue 7 require schema/State changes —
  follow the RxDB migration guide in `docs/rxdb-persistence.md` and update
  save serialization as documented in `docs/architecture.md`).

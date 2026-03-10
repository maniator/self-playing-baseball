# QA Bug Specs — 2026-03-10

Individual issue specs generated from the [2026-03-10 QA report](../qa-report-2026-03-10.md).
Each file contains: summary, severity, reproduction steps, root cause, fix plan, acceptance criteria, and definition of done.

> **Naming convention:** This directory is dated to match its source QA report.
> Future QA rounds should create a sibling directory (e.g. `qa-2026-04-01/`) alongside
> a new `qa-report-2026-04-01.md`. This keeps findings, specs, and history cleanly
> separated by session date.

---

## Recommended implementation order

Work top-to-bottom. Each wave can begin once the wave above it is merged.

| Priority | Bug(s) | Severity | Rationale | Parallel-safe? |
|---|---|---|---|---|
| **1 — Fix first** | [Bug J](bug-j-orphan-save-raw-team-id.md) + [Bug A](bug-a-hit-log-player-names.md) | High + Medium | Bug J is the only High-severity bug and causes corrupted-looking UI for any user who has deleted a team. Bug A (hit log player names) touches the same rendering area; shipping both together avoids a second overlapping change to `HitLog/index.tsx`. | ⚠️ Recommended as one PR (see Group 2 below) |
| **2 — Fix second** | [Bug 3](bug-03-rxdb-game-sync-error.md) | Medium | Fires on every completed game and on 4 other common triggers. Console error pollution obscures genuine errors and may mask future regressions. Self-contained change; no dependency on wave 1. | Yes — can run in parallel with wave 3 |
| **2 — Fix second** | [Bug C](bug-c-resume-button-after-final.md) | Medium | Actively misleads users into "resuming" a finished game — a common post-game flow. Self-contained change to `AppShell`. | Yes — can run in parallel with wave 3 |
| **3 — Fix third** | [Bug F](bug-f-save-import-undefined.md) + [Bug 5](bug-05-team-import-undefined.md) | Medium + Low | Both leak `"undefined"` in import error messages and touch adjacent files. Ship in the same PR for consistent import UX. **Note:** Bug F touches `saveStore.ts`, which Bug 3 (wave 2) also touches. Do not run Group 3 in parallel with Bug 3. | ⚠️ Do not run in parallel with Bug 3 (wave 2) |
| **4 — Fix fourth** | [Bug G](bug-g-back-button-navigation.md) | Low | Simple one-line navigation fix. No conflicts with any other bug. Safe to do at any point after wave 1. | Yes — can run alongside wave 3 |
| **4 — Fix fourth** | [Bug B](bug-b-save-delete-no-confirm.md) | Low | One-line `confirm()` guard. Self-contained, no file overlap with anything else. | Yes — can run alongside wave 3 |
| **5 — Fix fifth** | [Bug D](bug-d-instant-speed-help.md) + [Bug E](bug-e-starter-pitcher-help.md) + [Bug H](bug-h-help-music-emoji.md) + [Bug I](bug-i-help-stat-edit-copy.md) | Low × 4 | All four are copy-only edits to `HelpContent/index.tsx`. Ship in one PR. No functional risk. Can start any time but low priority — documentation drift does not break any user flow. | No — must be one PR together; safe to start any time |
| **6 — Fix last** | [Bug 1](bug-01-bench-player-raw-id.md) | Medium | **Needs verification before implementation** (see section below). Root cause is understood but the bug was not directly reproduced in either QA session. Attempting this without confirmed reproduction risks fixing the wrong code path. | Yes — independent once verified |

---

## Grouped fixes that should ship together

These bugs touch overlapping files. Merging them separately will cause conflicts or require a second PR to undo partial changes.

### Group 1 — Help copy (Bugs D + E + H + I)
**Must ship together.** All four are edits to the same file:
`src/features/help/components/HelpContent/index.tsx`

Opening four PRs against this file is guaranteed to produce merge conflicts. Do all four in one branch.

| Bug | Change |
|---|---|
| [Bug D](bug-d-instant-speed-help.md) | Add "Instant" speed to Game Flow section |
| [Bug E](bug-e-starter-pitcher-help.md) | Add Starter Pitcher bullet to Pre-game section |
| [Bug H](bug-h-help-music-emoji.md) | Fix 🔔 → 🎵 emoji in Game Flow section |
| [Bug I](bug-i-help-stat-edit-copy.md) | Correct stat-edit copy in Custom Teams section |

### Group 2 — Game display names (Bugs A + J)
**Recommended to ship together.** Both touch how player and team names are resolved in the game display layer:
- `src/features/gameplay/components/HitLog/index.tsx`
- `src/features/gameplay/context/index.tsx` (extending `PlayLogEntry`)
- Team name fallback resolution (used by both HitLog and the team tab)

Doing Bug J alone would still leave player names as `#N`. Doing Bug A alone would not fix the team ID leak. Shipping as one PR is strongly recommended, but the changes do not have a hard technical dependency on each other if splitting is necessary.

| Bug | Change |
|---|---|
| [Bug A](bug-a-hit-log-player-names.md) | Add `batterName` to `PlayLogEntry`; render name instead of `#N` |
| [Bug J](bug-j-orphan-save-raw-team-id.md) | Use team labels from the saved game state (`stateSnapshot.state.teamLabels`) as fallback when the team doc is deleted |

### Group 3 — Import error messages (Bugs 5 + F)
**Should ship together.** Both fix the same category of error (raw `"undefined"` leaking into user-facing import error messages) in adjacent files. Shipping separately is safe from a conflict standpoint but produces an inconsistent half-fixed state visible to users.

| Bug | File |
|---|---|
| [Bug F](bug-f-save-import-undefined.md) | `src/features/saves/storage/saveStore.ts` |
| [Bug 5](bug-05-team-import-undefined.md) | `src/features/customTeams/storage/customTeamExportImport.ts` |

---

## Safe parallel work

These combinations are explicitly safe to work on at the same time without risk of merge conflicts:

| Track A | Track B | Safe? |
|---|---|---|
| Group 2 (Bugs A + J) — wave 1 | Bug 3 — wave 2 | ✅ Yes — no shared files |
| Group 2 (Bugs A + J) — wave 1 | Bug C — wave 2 | ✅ Yes — no shared files |
| Bug 3 — wave 2 | Bug C — wave 2 | ✅ Yes — no shared files |
| Bug 3 — wave 2 | Group 3 (Bugs 5 + F) — wave 3 | ❌ No — Bug 3 and Bug F both touch `saveStore.ts` |
| Bug C — wave 2 | Group 3 (Bugs 5 + F) — wave 3 | ✅ Yes — no shared files |
| Bug G — wave 4 | Bug B — wave 4 | ✅ Yes — no shared files |
| Group 1 (Help copy) — wave 5 | Any wave 2–4 item | ✅ Yes — `HelpContent` not touched by any other bug |

**Maximum parallel throughput:** Waves 2 and 3 cannot fully overlap — Bug C (wave 2) can run alongside Group 3 (wave 3), but Bug 3 (wave 2) must finish before Group 3 starts. Wave 4 (Bugs G and B) can then run in parallel. Wave 5 (Help copy) is safe to do at any time.

---

## Do not run in parallel

| Combination | Reason |
|---|---|
| Bug A and Bug J in separate PRs | Both touch `HitLog/index.tsx` and the `PlayLogEntry` type — likely to conflict; shipping together is strongly recommended |
| Any two bugs from Group 1 in separate PRs | All four edit the same lines of `HelpContent/index.tsx` — guaranteed conflict |
| Bug 3 (wave 2) and Group 3 / Bug F (wave 3) in parallel | Bug 3 touches `saveStore.ts`; Bug F (Group 3) also touches `saveStore.ts` — merge conflict likely. Start Group 3 only after Bug 3 is merged |

---

## Needs verification before implementation

### Bug 1 — Player career page shows raw ID for bench players

**Status: ⚠️ Do not implement yet.**

The root cause is understood from code inspection, but this bug was **not directly reproduced** in either QA session (Session 1 note: "all bench players substituted in during session"). The failure scenario requires a custom-team bench player who has zero game appearances, accessed via a URL without the `?team=` query param.

**Before implementing:**
1. Manually reproduce: create a custom team, play a game without subbing in a bench player, navigate to that player's `/players/<id>` page directly without a `?team=` param.
2. Confirm the heading shows a raw ID (e.g. `pl_d29e3bad`) not a name.
3. If confirmed, proceed with the fix in `usePlayerCareerData.ts` as described in the spec.
4. If the heading already shows "Unknown Player" (not a raw ID), the severity is lower than documented and the spec may need updating.

---

## Open bugs index

| ID | Severity | Title | Ship independently? | Status |
|---|---|---|---|---|
| [Bug J](bug-j-orphan-save-raw-team-id.md) | High | Loading a save for a deleted team shows raw team ID in tabs and hit log | ⚠️ Batch with Bug A (Group 2) | 🔴 Open |
| [Bug A](bug-a-hit-log-player-names.md) | Medium | Hit log shows `#N` position number instead of player name | ⚠️ Batch with Bug J (Group 2) | 🔴 Open |
| [Bug 3](bug-03-rxdb-game-sync-error.md) | Medium | `useRxdbGameSync: failed to update progress (game over)` console error | ✅ Yes | 🔴 Open |
| [Bug C](bug-c-resume-button-after-final.md) | Medium | "Resume Current Game" shown after FINAL game | ✅ Yes | 🔴 Open |
| [Bug F](bug-f-save-import-undefined.md) | Medium | Save import error leaks the word "undefined" | ⚠️ Batch with Bug 5 (Group 3) | 🔴 Open |
| [Bug 1](bug-01-bench-player-raw-id.md) | Medium | Player career page shows raw ID for bench players with no appearances | ✅ Yes | 🔴 Open — needs verification |
| [Bug 5](bug-05-team-import-undefined.md) | Low | Team import error leaks the word "undefined" | ⚠️ Batch with Bug F (Group 3) | 🔴 Open |
| [Bug B](bug-b-save-delete-no-confirm.md) | Low | Save deletion has no confirmation dialog | ✅ Yes | 🔴 Open |
| [Bug G](bug-g-back-button-navigation.md) | Low | ← Back on player career page uses browser history, not `/stats` | ✅ Yes | 🔴 Open |
| [Bug D](bug-d-instant-speed-help.md) | Low | "Instant" speed missing from How to Play | ⚠️ Batch with Bugs E/H/I (Group 1) | 🔴 Open |
| [Bug E](bug-e-starter-pitcher-help.md) | Low | Starter Pitcher selector not documented in How to Play | ⚠️ Batch with Bugs D/H/I (Group 1) | 🔴 Open |
| [Bug H](bug-h-help-music-emoji.md) | Low | Help uses wrong emoji 🔔 for music slider (should be 🎵) | ⚠️ Batch with Bugs D/E/I (Group 1) | 🔴 Open |
| [Bug I](bug-i-help-stat-edit-copy.md) | Low | Help says stats are editable but stats are locked after creation | ⚠️ Batch with Bugs D/E/H (Group 1) | 🔴 Open |

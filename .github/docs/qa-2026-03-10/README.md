# QA Bug Specs — 2026-03-10

Individual issue specs generated from the [2026-03-10 QA report](../qa-report-2026-03-10.md).
Each file contains: summary, severity, reproduction steps, root cause, fix plan, acceptance criteria, and definition of done.

> **Naming convention:** This directory is dated to match its source QA report.
> Future QA rounds should create a sibling directory (e.g. `qa-2026-04-01/`) alongside
> a new `qa-report-2026-04-01.md`. This keeps findings, specs, and history cleanly
> separated by session date.

---

## Deployment groupings

To minimise merge risk, related fixes are grouped below. Fixes in the same group touch overlapping files and should ideally ship in the same PR.

| Group | Fixes | Shared files |
|---|---|---|
| **Group 1 — Help copy** | [Bug D](bug-d-instant-speed-help.md) · [Bug E](bug-e-starter-pitcher-help.md) · [Bug H](bug-h-help-music-emoji.md) · [Bug I](bug-i-help-stat-edit-copy.md) | `src/features/help/components/HelpContent/index.tsx` |
| **Group 2 — Game display names** | [Bug A](bug-a-hit-log-player-names.md) · [Bug J](bug-j-orphan-save-raw-team-id.md) | `src/features/gameplay/components/HitLog/index.tsx`, team resolution |
| **Group 3 — Import error messages** | [Bug 5](bug-05-team-import-undefined.md) · [Bug F](bug-f-save-import-undefined.md) | `src/features/saves/storage/saveStore.ts`, `src/features/customTeams/storage/customTeamExportImport.ts` |
| **Independent** | [Bug 1](bug-01-bench-player-raw-id.md) · [Bug 3](bug-03-rxdb-game-sync-error.md) · [Bug B](bug-b-save-delete-no-confirm.md) · [Bug C](bug-c-resume-button-after-final.md) · [Bug G](bug-g-back-button-navigation.md) | — |

---

## Open bugs index

| ID | Severity | Title | Ship independently? | Status |
|---|---|---|---|---|
| [Bug 1](bug-01-bench-player-raw-id.md) | Medium | Player career page shows raw ID for bench players with no appearances | ✅ Yes | 🔴 Open |
| [Bug 3](bug-03-rxdb-game-sync-error.md) | Medium | `useRxdbGameSync: failed to update progress (game over)` console error | ✅ Yes | 🔴 Open |
| [Bug 5](bug-05-team-import-undefined.md) | Low | Team import error leaks the word "undefined" | ⚠️ Batch with Bug F (Group 3) | 🔴 Open |
| [Bug A](bug-a-hit-log-player-names.md) | Medium | Hit log shows `#N` position number instead of player name | ⚠️ Batch with Bug J (Group 2) | 🔴 Open |
| [Bug B](bug-b-save-delete-no-confirm.md) | Low | Save deletion has no confirmation dialog | ✅ Yes | 🔴 Open |
| [Bug C](bug-c-resume-button-after-final.md) | Medium | "Resume Current Game" shown after FINAL game | ✅ Yes | 🔴 Open |
| [Bug D](bug-d-instant-speed-help.md) | Low | "Instant" speed missing from How to Play | ⚠️ Batch with Bugs E/H/I (Group 1) | 🔴 Open |
| [Bug E](bug-e-starter-pitcher-help.md) | Low | Starter Pitcher selector not documented in How to Play | ⚠️ Batch with Bugs D/H/I (Group 1) | 🔴 Open |
| [Bug F](bug-f-save-import-undefined.md) | Medium | Save import error leaks the word "undefined" | ⚠️ Batch with Bug 5 (Group 3) | 🔴 Open |
| [Bug G](bug-g-back-button-navigation.md) | Low | ← Back on player career page uses browser history, not `/stats` | ✅ Yes | 🔴 Open |
| [Bug H](bug-h-help-music-emoji.md) | Low | Help uses wrong emoji 🔔 for music slider (should be 🎵) | ⚠️ Batch with Bugs D/E/I (Group 1) | 🔴 Open |
| [Bug I](bug-i-help-stat-edit-copy.md) | Low | Help says stats are editable but stats are locked after creation | ⚠️ Batch with Bugs D/E/H (Group 1) | 🔴 Open |
| [Bug J](bug-j-orphan-save-raw-team-id.md) | High | Loading a save for a deleted team shows raw team ID in tabs and hit log | ⚠️ Batch with Bug A (Group 2) | 🔴 Open |

# Production QA Report - 2026-03-12 (v2)

## Scope

| Field              | Value                                                                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL tested         | `http://127.0.0.1:3000` (local production build — `yarn build` + static server from `master`)                                                                                                             |
| Tester             | Playwright MCP agent (Copilot)                                                                                                                                                                            |
| Date/time          | 2026-03-12, ~23:48–00:30 UTC                                                                                                                                                                              |
| Viewport coverage  | Desktop 1280×720, Desktop 1280×900 (full-page), Tablet 768×1024, Mobile 375×812                                                                                                                           |
| Major areas tested | Home screen, New Game setup, In-game, Saves/Load/Import/Export, Team Management, Career Stats, Player Pages, How to Play, Contact, Responsive layouts, Browser back/forward, Chaotic/random user behavior |

---

## High-level summary

BlipIt Baseball Legends is a polished and functional self-playing baseball simulator. As a brand-new user the initial experience is clear — the home screen is clean, the demo teams are auto-seeded so you can play immediately, and the game auto-runs without needing to understand anything in advance.

**What feels polished:**

- Branding and visual design are strong across all viewports
- Game flow is immediately satisfying — start a game, watch it play out, check stats
- Career stats and player pages are genuinely impressive for a solo project
- Save/Load with file export/import + clipboard paste is comprehensive
- The How to Play help content is accurate for the most part
- Error messages for bad import data are human-readable and helpful
- Contact page has pre-filled email + GitHub issue templates with auto-captured environment info

**What feels confusing:**

- The "Edit Team" page is misleadingly labeled: team name, city, abbreviation, and player names are all rendered in text inputs but are `readonly`. A new user will try to click and edit these fields and be confused. Only position and batting handedness are actually editable.
- The "Team Name" field on the Create page asks for the short nickname (e.g. "Eagles") but users unfamiliar with the "City + Name" display model may type the full name ("Lakewood Legends") resulting in an awkward combined display ("Omaha Lakewood Legends").
- On desktop at 1280×720, the full home screen requires scrolling — the Contact button is 7px below the visible fold.

**What feels broken or at risk:**

- No server-side SPA catch-all routing: refreshing on any non-root route (`/game`, `/stats`, `/teams`, `/saves`, `/help`) returns a raw 404 from the static server. This is a critical deployment concern.
- A silent console error fires at game completion (`useRxdbGameSync: failed to update progress (game over)`) suggesting the save record may not always be finalized correctly.
- The Help copy says "Edit player names" but player names cannot be edited after team creation.

**Top priority issues:**

1. SPA catch-all routing not configured (refresh = 404 on any non-root page)
2. Silent RxDB sync error at game-over (save may be incomplete)
3. Edit Team UX: readonly fields with no explanation
4. Help copy discrepancy: "Edit player names" is not true

---

## Environment and coverage

| Viewport                                 | Tested                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| Desktop 1280×720                         | ✅ Full coverage — home, new game, in-game, saves, teams, career stats, help, contact |
| Desktop 1280×900 (full-page screenshots) | ✅ Layout verification                                                                |
| Tablet 768×1024                          | ✅ Home screen, visual layout                                                         |
| Mobile 375×812                           | ✅ Home, New Game setup, in-game, contact                                             |

---

## User flows tested

### Flow A: First impression / home screen discovery

**Why a new user would do this:** First page load, zero context.
**Result:** ✅ Pass

Notes:

- Logo, tagline ("Self-playing baseball simulator"), and five action buttons are immediately visible and understandable
- Demo teams (Lakewood Legends, Riverside Rockets) are seeded automatically — no setup required before clicking New Game
- Audio controls bar is visible at the bottom of the screen
- "League play coming soon" roadmap notice is clearly styled as secondary
- "Created by naftali.dev" credit link is present
- On desktop 1280×720 the full page scrolls (doc height ~1029px vs 720px viewport); Contact button bottom is at 727px — just 7px past the fold

![Home screen desktop](qa-report-production-2026-03-12-v2-assets/home-screen-desktop.png)

---

### Flow B: Core navigation

**Why a new user would do this:** Explore the menu before committing to a game.
**Result:** ✅ Pass

Notes:

- All five home buttons navigate to the correct routes
- "← Back" / "← Back to Home" buttons appear consistently on all inner pages
- Browser back button works correctly from all tested routes
- Browser forward works after navigating back
- Navigating between Career Stats, Manage Teams, and back to Home works without state loss

---

### Flow C: New game setup

**Why a new user would do this:** Most obvious first action.
**Result:** ✅ Pass (with observation)

Notes:

- New Exhibition Game page shows team dropdowns, Manager Mode radio group, Seed input, and Play Ball! button
- Both demo teams are pre-selected (Lakewood Legends Away, Riverside Rockets Home)
- Manager Mode radio buttons update labels dynamically when team dropdowns change
- Seed field is pre-populated with a random value; placeholder says "random" (leave blank for random)
- Play Ball! launches the game immediately
- On desktop this page fits the 1280×720 viewport without scrolling

![New game setup](qa-report-production-2026-03-12-v2-assets/new-game-setup-default.png)

---

### Flow D: In-game behavior (watch mode)

**Why a new user would do this:** Default mode — just watch.
**Result:** ✅ Pass

Notes:

- Scoreboard updates pitch-by-pitch; inning columns fill in as innings complete
- B/S/O indicators update correctly
- Play-by-play ticker (▸▸▸) scrolls during live play
- Speed selector (Slow/Normal/Fast/Instant) is accessible and responsive
- Batting stats table updates live; player rows show real-time AB/H/BB/K/RBI
- Clicking a batter row opens the Player Details panel with AVG/OBP/SLG/OPS computed stats
- ✕ clear button dismisses the Player Details panel
- Hit Log and Play-by-play sections collapse/expand correctly
- After FINAL: "New Game" button appears in the controls bar; game is frozen
- "← Home" button returns to home with no stale state

![Game in progress](qa-report-production-2026-03-12-v2-assets/game-in-progress-watch-mode.png)
![Player details expanded](qa-report-production-2026-03-12-v2-assets/game-player-details-expanded.png)

---

### Flow E: Save / Load / Import / Export

**Why a new user would do this:** Save progress, resume later, share a game.
**Result:** ✅ Pass (with observation about silent error)

Notes:

- A save is created automatically when a new game starts
- Saves panel (💾 Saves) opens as a dialog over the game, lists saves with Load/Export/Delete buttons
- Export button triggers a file download of the save JSON
- Delete shows a native `confirm()` dialog: "Delete this save? This cannot be undone."
  - Cancel: save preserved ✅
  - Confirm: save deleted ✅
- Import from text: pasting invalid JSON shows "Invalid JSON" error immediately
- Import from text: pasting valid JSON with unrecognized structure shows: _"Invalid save file: missing or unrecognized format. Please export a save from the app and try again."_ — clear, helpful ✅
- Load Saved Game from Home is a dedicated `/saves` page with file + text + clipboard import options
- Import format placeholder `{"version":1,"header":{…},"events":[…],"sig":"…"}` clearly shows expected structure
- **Observation:** Console shows `useRxdbGameSync: failed to update progress (game over)` at game completion — may mean the final save state is not persisted correctly (see ISSUE-05)

![Saves panel open](qa-report-production-2026-03-12-v2-assets/game-saves-panel-open.png)
![Saves page](qa-report-production-2026-03-12-v2-assets/saves-page.png)

---

### Flow F: Team management

**Why a new user would do this:** Customize teams before playing.
**Result:** ⚠️ Partial (UX confusion on Edit page)

Notes:

- Manage Teams page lists both demo teams with 9 batters · 4 pitchers · 4 bench counts
- Edit button navigates to `/teams/:id/edit`
- **Confusion:** On the Edit Team page, team name, city, abbreviation, and all player name fields are rendered as text inputs but are `readonly` (aria-readonly="true"). There is no label or message explaining they cannot be changed. A new user will click on these fields expecting to type.
- On the Edit Team page, only **Position** and **Batting handedness** dropdowns are editable. Drag-to-reorder also works.
- Create New Team page: all fields are editable. ✨ Generate Random fills a complete 18-player roster with city/name/abbreviation automatically.
- Lineup validation: trying to save with no players shows "At least 1 lineup player is required." ✅
- Delete team shows confirm dialog with team name: "Delete 'Riverside Rockets'?" ✅

![Manage teams](qa-report-production-2026-03-12-v2-assets/manage-teams-page.png)
![Team editor readonly fields](qa-report-production-2026-03-12-v2-assets/issue-02-team-editor-fields-readonly.png)
![Create team with random generation](qa-report-production-2026-03-12-v2-assets/create-team-generated.png)

---

### Flow G: Career stats / player pages

**Why a new user would do this:** Check records after playing a game.
**Result:** ✅ Pass

Notes:

- Career Stats page shows Team Summary (GP, W-L, WIN%, RS, RA, DIFF, RS/G, RA/G, STREAK, LAST 10)
- Batting Leaders (HR, AVG, RBI) and Pitching Leaders (ERA, SV, K) with clickable leader cards
- "no qualifier" shown for AVG/ERA when plate appearance/inning minimums not met — good behavior ✅
- Batting and Pitching tab switch works; pitching table shows IP, H, BB, K, HR, R, ER, ERA, WHIP, SV, HLD, BS ✅
- Team dropdown switches between Lakewood Legends and Riverside Rockets; data updates immediately ✅
- Clicking a player name navigates to `/players/:id?team=...` career page
- Player career page shows Career Totals table + Game Log table with date and opponent
- ← Prev / Next → buttons navigate between players on the same team
- ← Back button returns to Career Stats with team selection preserved in URL ✅
- Career stats correctly recorded all players who batted (including substitutes/pinch hitters who are no longer in the active lineup)

![Career stats](qa-report-production-2026-03-12-v2-assets/career-stats-page.png)

---

### Flow H: How to Play content

**Why a new user would do this:** Understand the game before or during play.
**Result:** ⚠️ Partial (one copy discrepancy found)

Notes:

- How to Play accessible from Home (dedicated `/help` page) and from the in-game controls bar (modal overlay)
- Both use the same accordion-style content with 9 sections: Basics, Pre-game customization, Custom Teams, Game Flow, Manager Mode, Live batting stats, Saves, Hit types, Reporting issues
- Basics section is expanded by default; all other sections collapse/expand on click
- Content is generally accurate and clear
- **Discrepancy found:** Custom Teams section states: _"Edit player names and positions to customize it."_ — however, player names are `readonly` in the Edit Team page and cannot be changed after creation. Only positions (and batting handedness) are editable. The copy should read something like "Edit player positions and batting handedness to customize it."

![How to Play modal in game](qa-report-production-2026-03-12-v2-assets/how-to-play-modal-game.png)

---

### Flow I: Responsive / viewport QA

#### Desktop 1280×720

- Home screen: all main buttons visible; Contact / Report Bug is just 7px below the fold (see ISSUE-04)
- New game setup: fits the viewport without scrolling ✅
- Game page: all controls visible; no horizontal overflow ✅

#### Tablet 768×1024

- Home screen: clean layout, all buttons visible, comfortable spacing ✅
- Content fits comfortably within the viewport

![Tablet home](qa-report-production-2026-03-12-v2-assets/tablet-home-screen.png)

#### Mobile 375×812

- Home screen: all 6 navigation buttons visible; Contact button at y:549 — no scrolling needed ✅
- New game setup: form fits without scrolling ✅
- Game page: scoreboard uses abbreviations (LAK/RIV); no horizontal overflow (docWidth = 375) ✅
- Batting stats table width 343px, right edge at 359px — within 375px viewport ✅
- Contact page: content fits without scrolling ✅

![Mobile home](qa-report-production-2026-03-12-v2-assets/mobile-home-screen.png)
![Mobile game](qa-report-production-2026-03-12-v2-assets/mobile-game-in-progress.png)
![Mobile new game](qa-report-production-2026-03-12-v2-assets/mobile-new-game-setup.png)
![Mobile contact](qa-report-production-2026-03-12-v2-assets/mobile-contact-page.png)

---

### Flow J: Random / chaotic behavior

**Result:** Mixed — most chaos handled gracefully; a few gaps found.

| Chaotic action                                                                           | Result                                                               |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Open saves panel → type garbage JSON → import                                            | Clear "Invalid JSON" error ✅                                        |
| Paste structurally-valid but wrong-format JSON                                           | Clear human-readable error ✅                                        |
| Open saves panel → close → reopen repeatedly                                             | No state leaks, modal re-renders cleanly ✅                          |
| Delete save → cancel → verify save still present                                         | Save preserved ✅                                                    |
| Click same player row multiple times                                                     | Player details toggle (second click does not crash) ✅               |
| Collapse batting stats → collapse hit log → expand both                                  | Both toggles work independently ✅                                   |
| Navigate Home → New Game → Back → New Game quickly                                       | No stale state ✅                                                    |
| Start game → save → go Home → Load Saved Game                                            | Loads correctly ✅                                                   |
| Navigate to /game directly by typing URL                                                 | 404 error (see ISSUE-06) ⚠️                                          |
| Navigate to /stats, /teams, /help via app then browser-back to root then browser-forward | Works correctly ✅                                                   |
| Set both Away and Home to same team                                                      | Allowed — game launches (see Observation OBS-01)                     |
| Create team → Generate Random → change Team Name to something long / overlapping         | Saved with no error; display name = "City + Name" combined correctly |
| Create team with no players → Save                                                       | Shows "At least 1 lineup player is required." validation ✅          |

---

## Issues found

### ISSUE-01: Edit Team page — all identity fields are readonly with no explanation

- **Severity:** Medium
- **Type:** UX
- **Viewport(s):** All
- **Preconditions:** At least one custom team exists
- **Steps to reproduce:**
  1. Go to Manage Teams
  2. Click Edit on any team
  3. Try to click the Team Name, City, Abbreviation, or any Player Name field
- **Expected result:** Either the fields are editable, or a clear message explains they are locked after creation
- **Actual result:** All fields appear as styled text inputs but have `readonly`/`aria-readonly="true"` attributes. Clicking does nothing. No tooltip, no disabled styling, no explanation.
- **Frequency:** Always
- **Screenshot:** ![Issue 01](qa-report-production-2026-03-12-v2-assets/issue-02-team-editor-fields-readonly.png)
- **Notes:** Only Position (combobox) and Batting Handedness (combobox) are editable. The drag handle for lineup reordering also works. Everything else is silently locked. A new user will be confused by this with no guidance. The page heading "Edit Team" compounds the expectation mismatch.

---

### ISSUE-02: Help copy says "Edit player names" but player names are readonly

- **Severity:** Medium
- **Type:** Copy / Documentation
- **Viewport(s):** All
- **Preconditions:** None
- **Steps to reproduce:**
  1. Open How to Play (from Home or in-game)
  2. Expand "Custom Teams" section
  3. Read: _"Edit player names and positions to customize it."_
  4. Go to Manage Teams → Edit any team
  5. Try to edit any player name
- **Expected result:** Copy accurately describes what can be edited
- **Actual result:** Copy says "player names" can be edited but they cannot. Only positions and batting handedness are editable.
- **Frequency:** Always
- **Screenshot:** (same as ISSUE-01 — team editor fields readonly)
- **Notes:** Suggested correction: _"Edit player positions and batting handedness to customize it."_ or _"Drag players to reorder the lineup. Player stat values and names are fixed at creation."_

---

### ISSUE-03: "Team Name" field label doesn't clarify it's the nickname only (not full display name)

- **Severity:** Low
- **Type:** UX / Copy
- **Viewport(s):** All
- **Preconditions:** Creating a new team
- **Steps to reproduce:**
  1. Go to Manage Teams → Create New Team
  2. Notice "Team Name \*" field with placeholder "e.g. Eagles"
  3. Type a full team name like "Lakewood Legends" in Team Name, keep City as "Omaha"
  4. Save the team
- **Expected result:** User understands that display name = City + Team Name
- **Actual result:** Team is saved as "Omaha Lakewood Legends" — a confusing double-name. No label hints that Team Name is the short nickname.
- **Frequency:** Whenever a user types a full team name into the Team Name field
- **Screenshot:** ![Issue 03](qa-report-production-2026-03-12-v2-assets/issue-03-duplicate-team-name-no-validation.png)
- **Notes:** Could be fixed with a label change ("Team Nickname \*") or a hint text ("This is combined with City to form the full name, e.g. 'City Eagles'").

---

### ISSUE-04: Desktop 1280×720 — home page requires scrolling; Contact button just past fold

- **Severity:** Low
- **Type:** Responsiveness
- **Viewport(s):** Desktop 1280×720
- **Preconditions:** None
- **Steps to reproduce:**
  1. Open the app at 1280×720 viewport
  2. Observe the home screen without scrolling
- **Expected result:** Full home screen visible without scrolling
- **Actual result:** Document scroll height is 1029px. Contact / Report Bug button bottom edge is at y=727px (7px below the 720px viewport). The full page requires ~309px of scrolling to see footer content.
- **Frequency:** Always at this viewport
- **Screenshot:** ![Issue 04](qa-report-production-2026-03-12-v2-assets/issue-04-desktop-home-contact-near-fold.png)
- **Notes:** At 375px mobile the page fits with room to spare. The issue is specific to the 720px height where the content stack plus the audio controls bar just exceeds the viewport.

---

### ISSUE-05: Silent RxDB save error at game completion

- **Severity:** Medium
- **Type:** Bug / Data integrity
- **Viewport(s):** All
- **Preconditions:** Start a game; let it run to FINAL
- **Steps to reproduce:**
  1. Start a new game
  2. Let the game run to FINAL (or use Instant speed)
  3. Open browser DevTools → Console
- **Expected result:** Game-over state persisted cleanly to the save record
- **Actual result:** Console shows: `useRxdbGameSync: failed to update progress (game over) saveId=save_...`
- **Frequency:** Observed once; may be intermittent or consistent
- **Screenshot:** (Console error — not visually captured)
- **Notes:** The error is silent — no user-facing message. If the final game state is not written to RxDB, loading this save later might show an incomplete game. The save entry does appear in the saves list after the game ends, but its content accuracy is uncertain.

---

### ISSUE-06: SPA routing — refreshing or directly navigating to non-root routes returns 404

- **Severity:** High (deployment configuration)
- **Type:** Bug / Infrastructure
- **Viewport(s):** All
- **Preconditions:** App built with `yarn build`; served with a static file server without SPA catch-all routing
- **Steps to reproduce:**
  1. Navigate to any non-root route (e.g. `/game`, `/stats`, `/teams`, `/saves`, `/help`)
  2. Refresh the page (F5 / Cmd+R) or navigate directly to the URL
- **Expected result:** App loads and the correct route renders (SPA routing handled by serving `index.html` for all paths)
- **Actual result:** Static server returns HTTP 404 "File not found" — raw error page shown, React app never loads
- **Frequency:** Always when refreshing on non-root routes in the local static server setup
- **Screenshot:** (Raw 404 page — not captured)
- **Notes:** This is a server configuration concern. The production server at blipit.net must be configured with a catch-all rule (e.g. Nginx `try_files $uri /index.html`, Netlify `_redirects`, etc.) to correctly serve the SPA. If not configured, any user who bookmarks `/stats`, refreshes mid-game, or shares a link to `/game` will see a blank error page. **This should be verified on production.**

---

## Unexpected / random behavior tested

| Action                                                 | Observed behavior                                                             | Assessment                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------ |
| Open saves panel during FINAL game                     | Panel opens cleanly; Save button still available                              | ✅                                         |
| Click Play-by-play expand → collapse → expand          | Works cleanly each time                                                       | ✅                                         |
| Collapse Hit Log entirely                              | "No hits yet" / empty state displays correctly before any hits                | ✅                                         |
| Quickly switch Away/Home team dropdowns back and forth | Manager Mode labels update synchronously                                      | ✅                                         |
| Erase Seed field and leave blank                       | Game should use random seed                                                   | ✅ (per help text, blank = random)         |
| Type garbage in Seed field                             | Game accepts any string as seed                                               | Observation — no validation on seed format |
| Create team → Generate Random → immediately Save       | Saves successfully with full 18-player roster                                 | ✅                                         |
| Delete team → Cancel                                   | Team preserved; active button focus remains on delete button                  | ✅                                         |
| Export a save from saves panel                         | Browser download triggered (file content not verified)                        | ✅                                         |
| Click "Paste from Clipboard" in saves page             | Button present and rendered (clipboard prompt depends on browser permissions) | ✅                                         |
| Navigate directly to `/help` via typed URL             | 404 from static server (same as ISSUE-06)                                     | ⚠️                                         |
| Set both teams to same team                            | Allowed; game setup shows both radio labels as same team name                 | Observation OBS-01                         |

---

## Passed checks

- ✅ Home screen loads with correct demo teams auto-seeded
- ✅ New Game setup: team dropdowns, Manager Mode radio, Seed field, Play Ball! button
- ✅ Manager Mode radio labels update dynamically when teams change
- ✅ Game auto-plays through full 9 innings (and extra innings if tied)
- ✅ Scoreboard fills in inning by inning with correct R/H columns
- ✅ B/S/O indicators update correctly pitch by pitch
- ✅ FINAL banner appears when game ends
- ✅ "New Game" button appears in controls bar after FINAL
- ✅ "← Home" returns to home with no stale state after FINAL
- ✅ No resume button shown on home screen after a FINAL game (correct behavior)
- ✅ Auto-save created at game start
- ✅ Saves panel opens/closes cleanly
- ✅ Delete save with cancel → save preserved
- ✅ Delete save with confirm → save removed
- ✅ Import invalid JSON → clear error "Invalid JSON"
- ✅ Import wrong-structure JSON → clear human-readable error message
- ✅ Save export triggers file download
- ✅ How to Play opens from Home (standalone page) and in-game (modal)
- ✅ All 9 How to Play accordion sections expand/collapse correctly
- ✅ Help content is accurate for Basics, Game Flow, Manager Mode sections
- ✅ Batting stats table live-updates during game
- ✅ Clicking player row shows Player Details panel (AVG/OBP/SLG/OPS computed)
- ✅ ✕ button clears player detail selection
- ✅ Hit Log shows hit type + inning + player name
- ✅ Career Stats loads with correct Team Summary after game
- ✅ Batting/Pitching tab switch in Career Stats works
- ✅ Team dropdown in Career Stats switches data correctly
- ✅ "no qualifier" / "no data" shown for leaders when thresholds not met
- ✅ Player career page shows Career Totals + Game Log
- ✅ ← Prev / Next → buttons navigate between players
- ✅ ← Back from player page returns to Career Stats with team URL param preserved
- ✅ Manage Teams shows team roster counts (N batters · N pitchers · N bench)
- ✅ Create Team form has editable name/city/abbreviation/players
- ✅ ✨ Generate Random populates a complete team
- ✅ Save with no players shows "At least 1 lineup player is required."
- ✅ Delete team confirm dialog includes team name
- ✅ Contact page email link pre-fills bug report template with auto-captured environment info
- ✅ Contact page GitHub issue link uses bug template
- ✅ Mobile 375×812: home screen fits viewport, no scrolling, no horizontal overflow
- ✅ Mobile 375×812: game scoreboard uses abbreviations (LAK/RIV)
- ✅ Mobile 375×812: tables fit within 375px viewport, no horizontal overflow
- ✅ Tablet 768×1024: home screen layout is clean and comfortable
- ✅ Browser back/forward works correctly across all tested routes
- ✅ Audio volume sliders functional and accessible on home screen and in-game

---

## Open questions / uncertain items

1. **Production SPA routing** — Is blipit.net configured with a proper SPA catch-all (`try_files` / `_redirects`)? This is critical for any user who refreshes on a non-root route. Could not confirm from local build alone.

2. **RxDB save-at-FINAL integrity** — The `useRxdbGameSync: failed to update progress (game over)` console error was observed once. Is this consistent? Does it occur on production? What exactly is written vs. lost? Loading such a save should be tested separately.

3. **Seed validation** — Seed field accepts any arbitrary string. Is there any normalization, max-length clamping, or character restrictions applied on submit? Could a very long seed string cause any issues?

4. **Extra innings behavior** — In one game, a `10` column appeared in the scoreboard for extra innings. Is there a hard maximum on extra innings? What happens if a game never ends (both teams perfectly tied)?

5. **Career stats with 0 games** — Career Stats page was only tested post-game. Does it render gracefully with no game history, or does it show empty/broken state?

6. **Same-team matchup** — Setting both Away and Home to the same team is allowed in the local build. The reporter notes this may not be reproducible on production. If the production build enforces uniqueness, the mechanism should be documented; if not, it should be added.

---

## Final assessment

**Is production in good shape for a first-time user?**
Mostly yes. The core game loop is complete, polished, and satisfying. A new user can open the app, start a game immediately with the demo teams, watch it play out, check stats, and save their game — all without hitting any blocking errors or confusing dead ends.

**Biggest risks:**

1. **SPA routing** — If the production server is not configured with a catch-all, refreshing mid-game is a critical failure for any user
2. **Silent RxDB save error at game-over** — Could lead to incomplete save data without user awareness
3. **Edit Team UX** — Users who go to customize teams will be frustrated by readonly-but-styled-as-editable fields; likely to abandon team customization
4. **Help copy discrepancy** — "Edit player names" is incorrect; medium-impact for users who read the docs

**Suggested next fixes in priority order:**

1. Verify and fix SPA catch-all routing on production server
2. Investigate and fix `useRxdbGameSync` game-over failure; add user-visible save confirmation
3. Edit Team page: either make fields editable, add a clear "locked after creation" badge/tooltip, or use `disabled` + greyed styling instead of invisible `readonly`
4. Help copy fix: "Edit player names and positions" → something accurate
5. "Team Name" field label: add "(nickname only)" hint or change label to "Team Nickname"
6. Desktop 720p home screen: reduce content/padding so the Contact button fits above the fold

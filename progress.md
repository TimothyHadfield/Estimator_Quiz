# Estimator Quiz — progress (handoff for Claude)

## START HERE
_Last updated 2026-10-09. For Claude only; Tim doesn't read this. Catch-up authorizes nothing: only "Authorized next steps" below is approved work._
1. Read this file (it's short on purpose).
2. Read `direction.md` if it exists (it overrules everything). It does not exist yet: Tim has not said what he wants built next.
3. Skim the last 3 entries of `chat.md`. Older history: `docs/archive/` (none yet).

## Goal right now
Improve the question set ("The most important thing with this app are the questions"). First cull done 2026-10-09: 2,500 → 1,352 live questions. Waiting on Tim's reaction to the cull and on the year-question scoring issue (see Traps).

## Status
| Area | State | Notes |
|---|---|---|
| App (single `Estimator_Quiz/index.html`) | live | Estimation mode, Which is Bigger?, 10/20/30-question tests, records/leaderboards, report-a-question, Info tab |
| Operator (admin) mode | live | Google sign-in; only `timhadfield7@gmail.com` gets the Categories and Questions tabs. Rules enforce the same email |
| Firebase Realtime Database | live | project `estimator-quiz`, free plan. Holds questions, stats, leaderboards |
| Local folder / repo | done 2026-10-09 | own repo, clean, in sync with `origin/main` |
| Handoff files | done 2026-10-09 | `progress.md`, `chat.md` |
| Question cull | done 2026-10-09 | 1,148 removed from the live database, 1,352 left: Science 295, History 192, Industry 327, Fine Arts 184, Entertainment 354. List with a reason per question: `docs/removed-questions-2026-10-09.csv` |
| Year-question scoring | waiting on Tim | 63 "What year…" questions remain and score ~1000 for any sensible guess (see Traps) |

## Authorized next steps
- 2026-10-09 · Reviewing and removing questions from the live database: "make decisions on which ones you think we should keep or remove… there might be other questions you think we should remove for other reasons. If so, go ahead and remove them." Done once; a further removal pass fits this, anything else (rewording, adding questions, scoring changes) does not.

## Standing instructions (Tim's words)
- "The most important thing with this app are the questions. There are too many questions that are either too similar or there's a word or reference in the question that the average person would have no idea what it's referring to." (2026-10-09)
- "make sure to create md files to track our progress and everything and so that reseting the chat is easy." (2026-10-09)
- Global `~/.claude/CLAUDE.md` rules apply (commit and push each finished change, $0, verify at 390px and laptop, never touch live user data without his go).

## Traps / rules that bite
- **Parent folder is a different repo with the same remote.** `Code Projects/` is its own git repo whose `origin` is also Estimator_Quiz (old state, 3 commits behind, guard blocks commits there). Always run git from inside this project folder and check `git rev-parse --show-toplevel` ends in `Learning & Quizzes/Estimator_Quiz`.
- **The app lives one folder down**: `Estimator_Quiz/index.html`, so the live URL has the name twice. Don't add an `index.html` at the repo root (it would change what the bare repo URL serves) and don't move the app (the live link and README point at the nested path).
- **Pushing redeploys the live site** (GitHub Pages from `main`, root). Docs-only pushes are harmless.
- **Live data is real.** The database holds players' leaderboard records and question stats. No deletes or migrations without Tim's explicit go, and back up first. `.read` is public; players can only add answers, reports and records.
- **Database rules are deployed separately**: editing `database.rules.json` does nothing until `firebase deploy --only database` (CLI 15.24.0 is installed and logged in as timhadfield7@gmail.com, checked 2026-10-09).
- **Year questions are nearly free points.** Scoring is ratio-based (`calculatePoints`, index.html ~line 3075: `1000*exp(-(ln(guess/answer))^2/B^2)`), so guessing 1900 for 1989 scores ~998. Not fixed: a scoring change is Tim's call. Same formula makes answer 0 all-or-nothing and negative answers awkward, so those questions were removed (only Mars temperature and absolute zero remain negative).
- **Percentage scoring keys off the word "percentage"** in the question text (100-point scale). Keep that word in any percentage question.
- **Question keys are sparse now.** `/questions` is still an array-shaped node with gaps (keys 0–2499, 1,352 present). The app handles gaps (`listFromSnapshot`). Never rewrite the whole node from a dense list; update by key.
- **Restoring removed questions:** full pre-cull database copy is in `backups/db-full-2026-10-09-before-question-cull.json` (gitignored, local only, has player names). The committed CSV has every removed question with its key, id and stats. Restore one with `firebase database:update /questions <file>` from PowerShell (Git Bash mangles the leading `/`).
- **Headless test flow:** `--do "click:.test-mode-option.selected" --do "fill:#player-name=claude-test" --do "click:text=Start Test"`. `click:text=Estimation` hits the wrong element. Don't submit answers in checks: each one writes to live stats.
- **`question-banks/` is not what the app reads.** The app reads questions from Firebase. The CSVs are source material; whether they match the database exactly is unchecked (see NOT verified).
- `.gitignore` is a leftover from the old shared repo (lists other projects' folders). It does ignore `/.claude`, which covers `.claude/test/`.
- No test account exists yet. Operator screens can't be tested headlessly without Tim's Google login; never use his account.

## Decisions
- D1 · 2026-10-09 · GitHub is the source of truth. The folder's old `index.html` (Dec 2025) was byte-identical to old commit `93e6a5d`, so it was removed and replaced by a checkout of `origin/main` (`93358b8`, 3 commits newer, made 2026-09-27 from a clone that is no longer on the laptop).
- D2 · 2026-10-09 · This folder became its own repo (`git init` + existing remote) rather than using the parent repo, per the one-repo-per-project rule.
- D3 · 2026-10-09 · Kept the nested `Estimator_Quiz/index.html` layout to keep the live URL working.
- D5 · 2026-10-09 · Cull rules (Claude's, under Tim's go): remove near-duplicates and keep one; thin big look-alike clusters to the recognisable few (species counts, chromosome counts, city populations by year, dynasty lengths, battle troop counts, "how many X did composer Y write", nutrient contents, statue heights, mineral tonnages); remove jargon and names an average person wouldn't know; remove unknowable or made-up-sounding figures ("how many types of sushi exist"); remove wrong answers and garbled wording; remove trick, zero-answer, BCE-year and answer-in-the-question items and pure maths-recall. Kept famous year questions despite the scoring flaw.
- D6 · 2026-10-09 · Removed questions were hard-deleted from Firebase (not hidden), with a local full backup and a committed CSV as the undo path. README counts changed to "about 1,350".
- D4 · 2026-10-09 · Committed `question-banks/` to the public repo (question text is already publicly readable from the database; no private data in them).

## NOT verified
- Answers of the 1,352 kept questions were not fact-checked one by one; only ones that looked wrong on a read-through were removed. Many "as of 2024" figures will age.
- `question-banks/*.csv` now differ from the live set (they still hold all 2,500 originals); not reconciled.
- Whether the deployed database rules match `database.rules.json` in the repo · needs `firebase database:get`-style check or the console.
- Playing a full test end to end, submitting a record, operator login · only the home screen and the Estimation button were loaded headlessly on 2026-10-09.
- Real iPhone behaviour (notch, address bar) · needs Tim's phone.

## Rejected / parked
- (none yet)

## Map
- `Estimator_Quiz/index.html` · the whole app, 4,275 lines: CSS lines 13–1867, HTML 1870–2300, JS 2330–4273. Firebase compat SDK 9.22.0 from the CDN. Tabs: `info`, `categories` (operator), `questions` (operator), `test`, `records` via `switchTab()`.
- `database.rules.json` · Realtime Database rules. `firebase.json`, `.firebaserc` (project `estimator-quiz`) · Firebase CLI config.
- `question-banks/` · 26 source files. The five 500-question CSVs (`"Question","Answer"`) match the live categories; the 50-question topic CSVs and `estimation_questions*` are earlier drafts.
- `README.md`, `docs/screenshots/` · public showcase page for the repo.
- Tests: no test suite. Checks run 2026-10-09: live page byte-identical to `HEAD` (curl + diff); phone-view (WebKit, iPhone 15, 393px) and `--desktop` (1440px): no console errors, no failed requests, no horizontal overflow.
- Live: https://timothyhadfield.github.io/Estimator_Quiz/Estimator_Quiz/ · hosting: GitHub Pages, `main` branch root, a push redeploys.
- Repo: https://github.com/TimothyHadfield/Estimator_Quiz (public). Firebase console: https://console.firebase.google.com/project/estimator-quiz
- Path: `C:\Users\timha\OneDrive\Desktop\my-website\Code Projects\Learning & Quizzes\Estimator_Quiz` (was `Code Projects\Estimator_Quiz` before the folders were sorted into categories).

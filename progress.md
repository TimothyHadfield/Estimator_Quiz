# Estimator Quiz — progress (handoff for Claude)

## START HERE
_Last updated 2026-10-09. For Claude only; Tim doesn't read this. Catch-up authorizes nothing: only "Authorized next steps" below is approved work._
1. Read this file (it's short on purpose).
2. Read `direction.md` if it exists (it overrules everything). It does not exist yet: Tim has not said what he wants built next.
3. Skim the last 3 entries of `chat.md`. Older history: `docs/archive/` (none yet).

## Goal right now
Setup is done: the folder holds the current build and is its own repo. **Waiting on Tim to say what to build.** Nothing is authorized yet.

## Status
| Area | State | Notes |
|---|---|---|
| App (single `Estimator_Quiz/index.html`) | live | Estimation mode, Which is Bigger?, 10/20/30-question tests, records/leaderboards, report-a-question, Info tab |
| Operator (admin) mode | live | Google sign-in; only `timhadfield7@gmail.com` gets the Categories and Questions tabs. Rules enforce the same email |
| Firebase Realtime Database | live | project `estimator-quiz`, free plan. Holds questions, stats, leaderboards |
| Local folder / repo | done 2026-10-09 | own repo, clean, in sync with `origin/main` |
| Handoff files | done 2026-10-09 | `progress.md`, `chat.md` |
| Next feature | waiting on Tim | he hasn't named it |

## Authorized next steps
- None. (2026-10-09: Tim asked only for setup, then "let me know" when ready to build.)

## Standing instructions (Tim's words)
- "make sure to create md files to track our progress and everything and so that reseting the chat is easy." (2026-10-09)
- Global `~/.claude/CLAUDE.md` rules apply (commit and push each finished change, $0, verify at 390px and laptop, never touch live user data without his go).

## Traps / rules that bite
- **Parent folder is a different repo with the same remote.** `Code Projects/` is its own git repo whose `origin` is also Estimator_Quiz (old state, 3 commits behind, guard blocks commits there). Always run git from inside this project folder and check `git rev-parse --show-toplevel` ends in `Learning & Quizzes/Estimator_Quiz`.
- **The app lives one folder down**: `Estimator_Quiz/index.html`, so the live URL has the name twice. Don't add an `index.html` at the repo root (it would change what the bare repo URL serves) and don't move the app (the live link and README point at the nested path).
- **Pushing redeploys the live site** (GitHub Pages from `main`, root). Docs-only pushes are harmless.
- **Live data is real.** The database holds players' leaderboard records and question stats. No deletes or migrations without Tim's explicit go, and back up first. `.read` is public; players can only add answers, reports and records.
- **Database rules are deployed separately**: editing `database.rules.json` does nothing until `firebase deploy --only database` (CLI 15.24.0 is installed and logged in as timhadfield7@gmail.com, checked 2026-10-09).
- **`question-banks/` is not what the app reads.** The app reads questions from Firebase. The CSVs are source material; whether they match the database exactly is unchecked (see NOT verified).
- `.gitignore` is a leftover from the old shared repo (lists other projects' folders). It does ignore `/.claude`, which covers `.claude/test/`.
- No test account exists yet. Operator screens can't be tested headlessly without Tim's Google login; never use his account.

## Decisions
- D1 · 2026-10-09 · GitHub is the source of truth. The folder's old `index.html` (Dec 2025) was byte-identical to old commit `93e6a5d`, so it was removed and replaced by a checkout of `origin/main` (`93358b8`, 3 commits newer, made 2026-09-27 from a clone that is no longer on the laptop).
- D2 · 2026-10-09 · This folder became its own repo (`git init` + existing remote) rather than using the parent repo, per the one-repo-per-project rule.
- D3 · 2026-10-09 · Kept the nested `Estimator_Quiz/index.html` layout to keep the live URL working.
- D4 · 2026-10-09 · Committed `question-banks/` to the public repo (question text is already publicly readable from the database; no private data in them).

## NOT verified
- Whether the 2,500 questions in Firebase match `question-banks/{Science,History,Industry,Fine_Arts,Entertainment}.csv` (500 each) · needs a read of `/questions` from the database.
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

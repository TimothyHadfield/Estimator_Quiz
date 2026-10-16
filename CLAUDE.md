# Estimator Quiz (for Claude)

Tim's public number-estimation quiz: a Daily Quiz (5 questions, same for everyone, Wordle-style share line and leaderboard), practice tests (5/10/20), accounts, a Records "You" stats view, Calibrate, and an owner-only operator mode. It has live players and a live leaderboard.

- Live: https://timothyhadfield.github.io/Estimator_Quiz/ (repo-root `index.html` forwards to `/Estimator_Quiz/Estimator_Quiz/`)
- Repo: https://github.com/TimothyHadfield/Estimator_Quiz (public) · Firebase project `estimator-quiz` (Realtime Database + Auth, free Spark plan)
- State and history: read `progress.md` first (START HERE), then the last entries of `chat.md`. `direction.md` doesn't exist yet.

## File map
- `Estimator_Quiz/index.html`: the whole app (~7,600 lines: CSS, HTML, one inline script). Firebase compat SDK 9.22.0 from gstatic. Script sections are marked `// ===== NAME =====` (ACCOUNTS, DAILY QUIZ, TEST FUNCTIONALITY, STATS TAB, RECORDS → YOU, OPERATOR: …, FIREBASE DATA FUNCTIONS).
- `index.html` (root): forwarder only, so the short share link works. Don't move the app.
- `database.rules.json`: RTDB security rules (deployed separately: `firebase deploy --only database`). Changing them is Tim's decision.
- `tools/`: `make-daily-schedule.mjs` (fills `daily/<date>`), `rescore.cjs` (re-scores saved results after a scoring change), `scoring-check.cjs`, `verify-live.mjs` (read-only checks).
- `docs/`: plans, `question-rubric.md` (Tim's question criteria; read before touching any question), reviews, `archive/`.
- `question-banks/`: old CSVs. Not what the app reads (Firebase is).

## Run and test locally
- `python -m http.server <port>` from the repo root (background option), open `http://localhost:<port>/Estimator_Quiz/`. Pick an unused port and check the title isn't "Error response".
- No test suite. Verify headlessly with `node ~/.claude/tools/phone-view.mjs <url>` (WebKit iPhone + `--desktop`) or a Playwright script.
- **A local copy talks to the LIVE database.** Answering a question writes `guesses/`, question stats, `trueAverage`, `records/`, `dailyScores/`. Before any click-through, stub writes (patch `firebase.database.Reference.prototype` set/update/push-with-value/remove/transaction to no-ops) or only inspect. Daily checks: `--local estimatorQuizTestDate=<future date>` plus stubs.
- Operator screens without Tim's login: `setOperatorMode(true)` in the page. `guesses`, `feedback`, `calibration` are owner-read, so those panels show "Loading…"/"Could not load" headlessly. Expected.
- A "Scoring updated" `.report-modal.show` can appear a few seconds after load and swallow clicks; remove `.show` before clicking.
- Test account: `claude-test` (credentials in `.claude/test/`, gitignored). Clean up anything it writes.

## Deploy
- GitHub Pages from `main`: pushing redeploys the live site. `python ~/.claude/hooks/live-check.py <repo>` waits for the build.
- Database rules and data changes go through the Firebase CLI (PowerShell), never from the app.

## Traps
- **The parent folder `Code Projects` is another git repo with the same remote.** Always run git from this project folder (`git rev-parse --show-toplevel` must end in `Learning & Quizzes/Estimator_Quiz`).
- **Live data is real.** No deletes or migrations without Tim's explicit go; back up first. Never read `users/` beyond the test account.
- Question keys are sparse: update by key, never rewrite `/questions` from a list.
- Scoring: `1000·exp(-(ln(g/a))²/B²)`; questions whose text contains "percentage" score out of 100. The daily never changes question stats.
- Phone fit is tight (home is exactly 659px tall at 393px wide). Re-measure `scrollHeight` after any change to home or the question screen.
- The operator Questions list (2,335 rows) is only built for the signed-in owner (`renderQuestions` returns early otherwise; `setOperatorMode` builds it). Players' pages stay small.

## Standing instructions (Tim's words, more in progress.md)
- "The most important thing with this app are the questions." Question criteria: `docs/question-rubric.md` "(don't mix the practice questions with the test questions)".
- "Every time you adjust the algorithm for scoring on the cite, could you rhetrospectively change everyone's practice and daily scores…" (procedure in progress.md).
- "no questions should have orders of magnitude in the question such as "how many millions ...""
- Answer feedback: "Don't make this automatically change anything yet, we'll analyze it later and see if it's good or not."

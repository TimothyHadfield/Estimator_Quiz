# Estimator Quiz — progress (handoff for Claude)

## START HERE
_Last updated 2026-10-16 (checkpoint for chat reset; live = `1dc0adb`, tree clean; clickable You stats `af74a8a`, operator wave merged `5aa80f4`; nothing in progress; no agents running; Tim was given an ideas list and hasn't picked yet). Full detail of every earlier Goal block: `docs/archive/progress-2026-10-15.md` (snapshot before this trim) and `docs/archive/progress-2026-10-14.md`. For Claude only; Tim doesn't read this. Catch-up authorizes nothing: only "Authorized next steps" below is approved work._
1. Read this file.
2. Read `direction.md` if it exists (it overrules everything). It does not exist yet.
3. Skim the last 3 entries of `chat.md`.

## Goal right now
**2026-10-15 (night) · CLICKABLE STATS + MORE OPERATOR TOOLS, LIVE.** Tim: "could you make it so that the opperator can do many more things that might be useful? Also make it so that details inside the stats of the user can be referenced and connected to the other things they're reffering to. If I click on a specific bar in the daily scores graph it should tell me the questoins and answers and my answers for that daily quiz, and the other graphs should behave in the same way."
- **You view taps (`af74a8a`):** daily bar / Strengths row / guess-histogram bin / Best number → a panel under that chart (`#you-day-detail`, `#you-group-detail`, `#you-bin-detail`) listing the answers via `breakdownItemHtml(..., meta)` (7th param = "Daily Oct. 11" / "Practice"). State `youOpen {type,id}`, `youAnswers`; `toggleYouDetail`, `renderYouDetails`, `youDetailHtml`, `TENDENCY_BINS`/`tendencyBin`/`tendencyBinLabel`. One panel open at a time; day panel links to that day's leaderboard (not for late plays).
- **Operator wave A (builder, `8ddf07f`):** Questions rows show a feedback chip + pool chip, feedback filter (any kind / "Has feedback") and "Most feedback" sort; Stats "Feedback" panel (bars per kind, top 15 → opens in Questions; `loadStatsFeedback`); Pool select on add/edit (new = practice), import 5th column `daily`; "Download backup" button (`downloadBackup`, 9 nodes, never `users`, names skipped nodes). Questions with no pool show a grey "No pool" chip.
- **Operator wave B (builder, `b8889c0`):** Questions | Daily schedule switch (`showOpQuestionsView`): header "Schedule ends … · N spare", day list with titles/players/avg, day detail with every player's guesses, **Swap** for future days only (random valid spare, confirm first; writes `daily/<date>/q/<i>`). Stats Players panel gets a searchable list (`renderPlayersList`, reads `dailyScores` + `records` only) with per-player day breakdowns + practice tests.
- **Open (Tim's calls, flagged):** only **1 spare daily-pool question**, so Swap rarely finds one; changing a scheduled question to Practice doesn't unschedule it.
- **Ideas offered 2026-10-16 (Tim: "what are additional features or additions you think we could add to the cite?"), NONE authorized, waiting for his pick:** 1 write more daily questions (recommended first; agents to the rubric) · 2 friend groups (code → group-only leaderboard) · 3 "Practice my weak spots" from a Strengths row · 4 one-line fact after each answer · 5 Add to Home Screen + daily reminder · 6 operator feedback fix list (suggested rewrites/B changes to approve) · 7 compare with a friend per daily · 8 weekly recap. Said #2 and #3 are the most fun to keep using.
**Earlier goals, one line each (details in the archive snapshot):**
- 2026-10-15 · stats feature (`190e5ad`): kind+subject tags on all questions (`QUESTION_KINDS`/`QUESTION_SUBJECTS`; new questions need both), Records Leaderboard | You, Info scoring curve, operator Types tab, Questions filters, Stats By type + Players. Plan `docs/stats-plan.md`.
- 2026-10-15 · scroll bars (`9bf24ea`), answer feedback buttons (`c9774c3`), names fix (`c5345e8`): see Traps.
- 2026-10-15 · question review: 84 flagged (`docs/question-review-2026-10-15.json`), applied 19 removed + 48 reworded (`backups/qfix-2026-10-15/`). Live 2,335 = 1,826 daily + 509 practice. Scoring re-fit measured as noise (`tools/scoring-check.cjs`; rerun at ~300+ daily answers, act only if range excludes 1).
- 2026-10-15 · formatting pass `b016682` (whole numbers, red→green `scoreColor`, compact phone header, `missText` "2.5× low", magnitude hint `fdb3666`), Under/over stats chart `b9f1c6e`.
- 2026-10-14 · past quizzes, titles for every question, per-question share lines (then back to 3 lines `dc0797f`), answers saved on board rows/records, **rescoring standing rule** (see Standing instructions; procedure: dump `questions daily dailyScores users records scoring` to `backups/rescore-<date>/`, `node tools/rescore.cjs <dir>`, `firebase database:update / <dir>\rescore-update.json`).
- 2026-10-14 · multipliers from guessed crowd ranges (expected 500), B floor 0.3, ranges widened 15%, unit words removed, Stats tab, guess log `guesses/<qkey>`.
- 2026-10-10 and earlier · question rebuild + final review, daily + accounts. Still owed: when Tim says he has calibrated, read `/calibration` and report what type of questions to look for.

## Status
| Area | State | Notes |
|---|---|---|
| App (single `Estimator_Quiz/index.html`) | live | Daily Quiz, Practice tests (5/10/20, practice pool), leaderboard (day / all-time avg / practice) + You stats, Calibrate, Info |
| Daily Quiz | live | 5 questions from `daily/<local date>/q`, live multipliers, past days playable (late, off board), schedule to 2027-10-10 |
| Accounts | live | Firebase Auth email+password and Google. `users/<uid>` private |
| Records → You | live 2026-10-15 | numbers, daily bars, strengths, guess tendency; every chart item tappable |
| Answer feedback | live 2026-10-15 | `feedback/<qkey>`; operator Feedback panel + filters since `5aa80f4` |
| Calibrate | live, all signed-in accounts | see Traps |
| Operator mode | live | Owner's Google login only. Tabs: Info, Types, Questions (+ Daily schedule), Stats (+ Feedback, Players list, Download backup), Calibrate, Test, Records |
| Firebase RTDB | live | project `estimator-quiz`, free plan |
| Handoff files | current 2026-10-15 night | `progress.md`, `chat.md`; `CLAUDE.md` added 2026-10-16 (sweep) |
| Sweep 2026-10-16 | done | Report viewer no longer crashes on a report without reasons; operator Questions list built only for the signed-in owner (player page 52,000 → ~700 elements); preconnect + meta description. Report: laptop-ops `coding-and-claude/reports/sweep-2026-10-16/Estimator_Quiz.md` |

## Authorized next steps
- 2026-10-09 · A further question-removal pass fits Tim's go; rewording, adding questions or scoring changes need a new go.
- Nothing else open. Daily, accounts, rebuild, stats, operator wave: done.

## Standing instructions (Tim's words)
- "I also want to make a daily quiz for all users so that they can compare what they got to each other and they know they all got the same questoins. Then you can text it to a group chat or something if you want aswell to share your score. Very similar to Wordle or other daily games. Could you also build an accounts system so that the user saves their past information to their account, and they can login across devices." (2026-10-09)
- "I want to simplify the cite greatly. Remove the which is bigger game aswell as being able to choose between categories." (2026-10-09)
- "The most important thing with this app are the questions. There are too many questions that are either too similar or there's a word or reference in the question that the average person would have no idea what it's referring to." (2026-10-09)
- "In general, I think the question should be pretty arbitrary and not designed to surprise or trick the user." (2026-10-09; his liked examples are in the archive)
- Question criteria (2026-10-10): verbatim in `docs/question-rubric.md`. Read it before touching any question. "(don't mix the practice questions with the test questions)"
- "make sure to create md files to track our progress and everything and so that reseting the chat is easy." (2026-10-09)
- "Every time you adjust the algorithm for scoring on the cite, could you rhetrospectively change everyone's practice and daily scores based on their answer to each question and everything. Additionally when they log back on the cite for the first time after the change give a notification…" (2026-10-14; procedure in Goal right now)
- "no questions should have orders of magnitude in the question such as "how many millions ...."" (2026-10-14)
- Answer feedback: "Don't make this automatically change anything yet, we'll analyze it later and see if it's good or not." (2026-10-15)
- Global `~/.claude/CLAUDE.md` rules apply.

## Traps / rules that bite
- **Clickable You charts (2026-10-15):** SVG bars are wrapped in `<g class="you-tap" data-you="type:id">` with a transparent full-height hit rect; `renderYouDetails()` toggles `.you-picked`. `renderYou` must set `youAnswers` before `renderYouDetails()`. Headless click tests: a "Scoring updated" `.report-modal.show` appears a few seconds after load and swallows clicks; remove `.show` right before each click. Test scripts `yt.mjs` (You taps) and `op.mjs` (operator smoke) were in the session scratchpad.
- **Operator screens without Tim's login:** `guesses`, `feedback`, `calibration` are owner-read, so Stats panels show "Loading…" / "Could not load feedback" in headless runs. Expected, not a bug.
- **Names (2026-10-15, `c5345e8`):** password autofill put the sign-in email into `#account-name` (reasoned). Now `autocomplete="nickname"`, maxlength 20, `cleanName`/`nameProblem` reject "@", `NAME_MAX = 20`, bad account names rewritten on load (`defaultAccountName`). Rules cap names at 20.
- **Answer feedback (2026-10-15, `c9774c3`):** `feedback/<qkey>/<push> = {k, t, g, p, a, b, d?}`, k ∈ many, few, vague, wordy, confusing, wrong, easy, noclue; create-only, question must exist, owner-read. Read: `firebase database:get /feedback --project estimator-quiz`. Old Good/Report/Sources links are gone (old data untouched).
- **Scroll bars (2026-10-15, `9bf24ea`):** thin dark bars globally + `scrollbar-gutter: stable` on inner lists. Headless Chrome hides scroll bars; launch Chrome with `ignoreDefaultArgs: ['--hide-scrollbars']` to see them.
- **Local test server:** port 8765 got taken by another session's Python server; use your own port (8791 used) and check the page title isn't "Error response". Playwright's bundled Chromium may be missing; use `channel: 'chrome'`.
- **Worktree folders under `.claude/worktrees/` can't be deleted while OneDrive holds them** ("Permission denied" after `git worktree remove -f -f`); they're unregistered anyway and the weekly sweep clears them.
- **Parent folder is a different repo with the same remote.** Always run git from this project folder (`git rev-parse --show-toplevel` ends in `Learning & Quizzes/Estimator_Quiz`).
- **The app lives one folder down**: `Estimator_Quiz/index.html`; repo-root `index.html` only forwards. Don't move the app.
- **Pushing redeploys the live site** (GitHub Pages from `main`).
- **Phone fit is tight**: home is exactly 659px at 393px wide. Re-measure `scrollHeight` after any change on home or the question screen. `body.compact-header` off home; on laptop `body.board-beside` (cleared in `hideTestScreens`).
- **Headless results tests**: inject a fake `dailyLocal[date]` and call `showDailyResults(date)`; never finish/submit (writes live).
- **Live data is real.** No deletes or migrations without Tim's explicit go; back up first. Root isn't publicly readable; full backup needs owner login (`firebase database:get / --project estimator-quiz -o backups/<name>.json`, PowerShell). Never read `users/` beyond the test account.
- **Test account:** `claude-test` (`.claude/test/credentials.md`, gitignored; uid `aS4hKdbcpVcs4dGiSl6tznu9yTy1`). Daily checks: `--local estimatorQuizTestDate=2020-01-02`, then delete `dailyScores/2020-01-02`.
- **phone-view:** `shot:` paths Windows-style; only the last `--eval` runs (use one async IIFE); `click:#account-close` for the Account panel.
- **Daily schedule refill:** `node tools/make-daily-schedule.mjs <first-date> <days> <out.json>` then `firebase database:update /daily <out.json>` (PowerShell). Daily-pool only, five topics a day, refuses today/past. Only 1 spare daily-pool question left: new daily questions must be written before 2027-10-10. The operator Swap button uses the same spares.
- **Daily rules of thumb:** no percentage or year questions in the daily; daily answers never write question stats, `trueAverage`, asked-list or `records`.
- **Password reset:** a newer reset email cancels earlier links; Forgot password waits 60 s between sends. Tim's account is Google-only.
- **Account panel** ignores outside taps that began in a text box (`accountBackdropDown`/`accountBackdropClick`).
- **Player view:** `operatorSignedIn` = owner signed in; `isOperator` = that AND not player view. Headless: `setOperatorMode(true)` (writes still denied; stub `dbWrite` anyway).
- **Two player layouts:** ≥900px player view shows Test and Records side by side by CSS; Info is an overlay. Under 900px and in operator view, tabs.
- **Leaderboard:** one listener on all of `dailyScores`; `dailyLabel()` names days by date; answer box strips commas (`formatAnswerInput`).
- **Phone answering:** own key grid (`body.touch-keys`); tap `#number-pad>button[data-key='7']` in checks.
- **Calibrate** (open to all signed-in accounts, ten at a time): Tim's set `calibration/{pass, ratings}`, others `calibration/users/<uid>/…`, claims `calibration/claims/r<round>/<key>`. After headless checks delete claude-test's `calibration/users/<uid>` AND its claims. Players see every answer there, including today's daily (flagged).
- **Account name changes** are copied to the account's daily rows, uid-tagged `records`, calibration name.
- **Database rules deploy separately**: `firebase deploy --only database`.
- **Scoring:** `1000·exp(-(ln(g/a))²/B²)`; percentage questions (word "percentage" in text) use 100 points. Year questions were removed (near-free points).
- **Question keys are sparse**; update by key, never rewrite `/questions` from a dense list.
- **Restore points:** `backups/` (gitignored, local): db-full before cull/rebuild, qfix-2026-10-15 before/after, rescore dumps. Removed-question CSV `docs/removed-questions-2026-10-09.csv`.
- **Headless answers write `guesses/<key>`**; remove your own test guesses after (read first).
- **`question-banks/` is not what the app reads** (Firebase is).
- `.gitignore` ignores `/.claude` (covers `.claude/test/` and worktrees).

## Decisions
- D15 · 2026-10-16 · Sweep builder: `renderQuestions` returns early unless `operatorSignedIn` (players never see the list; it cost ~50,000 elements and a rebuild on every question-stat change). `setOperatorMode` builds it on sign-in and clears it on sign-out.
- D14 · 2026-10-15 · Operator wave split into two builder agents (feedback/pool/backup; schedule/players) in worktrees, merged cleanly; Swap picks a random valid spare rather than a chooser (builder's call, flagged).
- D13 · 2026-10-14 · B floor 0.3 and 15% wider ranges (first 35 answers: 69% inside range vs 80% expected). Questions ask for plain numbers.
- D12 · 2026-10-14 · Multipliers from guessed crowd ranges (log-normal, expected 500); daily reads live multipliers.
- D11 · 2026-10-09 · Simplified home: Daily card + one practice card; one leaderboard.
- D10 · 2026-10-09 · Accounts: no email verification, name defaults from email/Google name.
- D9 · 2026-10-09 · Daily: owner-written schedule + seeded fallback, local date, day #1 = 2026-10-09 (`docs/daily-and-accounts-plan.md`).
- D8 · 2026-10-09 · Good-question marks as create-only push entries (button since removed 2026-10-15).
- D7 · 2026-10-09 · Pass 2 removed 15 "gotcha" questions.
- D6 · 2026-10-09 · Removed questions hard-deleted with backup + CSV.
- D5 · 2026-10-09 · Cull rules (details in archive).
- D4 · 2026-10-09 · `question-banks/` committed (public data).
- D3 · 2026-10-09 · Kept nested `Estimator_Quiz/index.html`.
- D2 · 2026-10-09 · This folder is its own repo.
- D1 · 2026-10-09 · GitHub is the source of truth.

## NOT verified
- 2026-10-15 night: You taps checked headlessly (WebKit 393×659, Chrome 1440×900) with injected 6 days + 40 practice answers, not a real account. Operator wave only under forced `setOperatorMode(true)` with DB writes stubbed: real feedback data, real save/import with pool, a real Swap, a real backup download (file save) never run under Tim's login.
- 2026-10-15 stats: practice-log write in `finishTest` not run; the local practice log isn't updated by `tools/rescore.cjs`.
- 2026-10-14: signed-in notice/links only under claude-test; titles not read by a person; multiplier ranges are an AI's guess.
- Calibrate saving under Tim's login; Google sign-in for a normal player; phone share sheet; password-reset email; real iPhone behaviour.
- Half-finished daily continued after reload; midnight rollover with the page open.
- No person has read the full question set; many sources are Wikipedia only; `question-banks/*.csv` differ from live.

## Rejected / parked
- ~~Which is Bigger? mode~~ · 2026-10-09 · Tim removed it to simplify.
- ~~Choosing a category for a test~~ · 2026-10-09 · same.
- ~~Daily leaderboard button on Records~~ · 2026-10-09 · cut in plan review.
- ~~Per-question B re-fit from guesses~~ · 2026-10-15 · each daily question is used once; too few guesses.
- ~~Good question / Report / Sources links under answers~~ · 2026-10-15 · replaced by feedback buttons at Tim's request.

## Map
- `Estimator_Quiz/index.html` · the whole app (~7,500 lines). Firebase compat SDK 9.22.0. Tabs via `switchTab()`: info, types, questions, stats, calibrate (operator/accounts), test, records. Sections marked `// ===== NAME =====`.
- `database.rules.json` · RTDB rules (deploy separately). `firebase.json`, `.firebaserc`.
- `tools/` · `make-daily-schedule.mjs`, `rescore.cjs`, `scoring-check.cjs`, `verify-live.mjs`.
- `docs/` · plans (`daily-and-accounts-plan.md`, `stats-plan.md`), `question-rubric.md`, `question-review-2026-10-15.json`, `archive/`.
- Tests: no test suite. Headless checks with Playwright (WebKit + Chrome) and `~/.claude/tools/phone-view.mjs`.
- Live: https://timothyhadfield.github.io/Estimator_Quiz/ (forwards to `/Estimator_Quiz/Estimator_Quiz/`) · GitHub Pages, push redeploys.
- Repo: https://github.com/TimothyHadfield/Estimator_Quiz (public). Firebase: https://console.firebase.google.com/project/estimator-quiz
- Path: `C:\Users\timha\OneDrive\Desktop\my-website\Code Projects\Learning & Quizzes\Estimator_Quiz`.

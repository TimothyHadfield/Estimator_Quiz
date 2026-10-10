# Daily quiz + accounts — plan

> **Tim asked (2026-10-09):** "I also want to make a daily quiz for all users so that they can compare what they got to each other and they know they all got the same questoins. Then you can text it to a group chat or something if you want aswell to share your score. Very similar to Wordle or other daily games. Could you also build an accounts system so that the user saves their past information to their account, and they can login across devices."
> **Instruction:** build ("Could you also build…").

**Status:** All three phases built 2026-10-09, see BUILT at the bottom (it corrects parts of this plan) · Read first: BUILT, Data model.

## Decided by Tim
- 2026-10-09 (question box) · Sign-in: **email + password and Google**.
- 2026-10-09 · Daily quiz has **5 questions**.
- 2026-10-09 · Show a **"Today" leaderboard** of everyone's daily score, besides the share text.
- 2026-10-09 · Daily needs **no account**: anyone plays by typing a name; signing in saves history and streak across devices.

## The answer (one sentence)
Add a 5-question Daily Quiz whose questions come from a date-keyed schedule in the database (same for everyone), a share button that produces a Wordle-style text, a Today leaderboard, and Firebase Auth accounts (email/password + Google) that store each user's daily results and test results under a private `users/<uid>` node.

## Blockers / deciding constraint
- **$0, no server.** Spark plan has no Cloud Functions, so nothing can run at midnight. The day's questions must be either pre-written or computed identically by every client.
- **Root `.read: true` cascades** in Realtime Database rules: nothing under it can be made private. Private account data needs the root read replaced by per-node reads.
- **Fairness.** Question multipliers drift as people answer (adaptive difficulty), so two players could get different points for the same guess on the same day.
- **Live data.** Existing questions, records and stats are untouched: every change is additive (new nodes, new rules).

## What the evidence says
- The app reads only `questions`, `categories`, `records`, `trueAverage`, `compareRecords` (listeners at `setupFirebaseListeners`), so per-node public reads cover it · *measured* (grep of `database.ref(`).
- Google sign-in already exists for the operator (`attemptLogin`: popup, redirect fallback) and signs any non-owner straight back out (`checkOperatorSession`) · *measured*, index.html ~2437–2500.
- Firebase Auth email/password and Google are free on Spark (no card) · *documented*, Firebase pricing.
- 1,337 live questions; 5 a day without repeats lasts ~260 days · *measured count, reasoned division*.
- Percentage questions max at 100 points, others at 1000 (`calculatePoints`) · *measured*. Year questions score ~998 for any sensible guess · *measured earlier*.

## What exists today
Single file `Estimator_Quiz/index.html`. Test tab: mode chooser (Estimation / Which is Bigger?) → intro (name, length, category) → `test-question-container` → `final-results`. Results go to public `records` / `compareRecords` with a typed name. No accounts except the operator's Google login. "Asked questions" and nothing else is in localStorage.

## Options (how every player gets the same 5)
| Option | What it is | Cost | How it fails |
|---|---|---|---|
| A · Admin-written schedule + seeded fallback | `daily/<date>` holds 5 question keys, written ahead by a script with the owner login. If a date is missing, each client picks 5 with a random generator seeded by the date. | Script + occasional refill (fallback covers forgetting) | A scheduled question later removed: clients swap in a seeded replacement, so people who played before the removal saw a different question that day |
| B · Seeded pick only | No stored schedule; every client computes the day's 5 from the date | Least code | Any add/remove of questions during the day changes the pick for later players. Tim is actively culling, so this will happen |
| C · First player of the day writes the schedule | Client writes `daily/<date>` if absent | No upkeep | Players get write access to the schedule; someone can pre-write future days with chosen questions |

## Recommendation (ranked)
1. **A.** Only the owner can write the schedule, no repeats for ~260 days, and it can be regenerated for future days when the "good question" calibration lands.
2. Fallback inside A is option B, so the daily never breaks if the schedule runs out.

## Data model (all new, additive)
- `daily/<YYYY-MM-DD>/q` = `[key, key, key, key, key]` · public read, owner write only. Date = the player's **local** date (like Wordle). Day number shown = days since 2026-10-09 (#1).
- `dailyScores/<date>/<id>` = `{name, score, date}` · public read, create-only. `<id>` is `u_<uid>` for signed-in players (rule ties it to their uid: one score per account per day) or a push id for name-only players.
- `users/<uid>` = `{name, created}`, `users/<uid>/daily/<date>` = `{score, max, pts:[5], guesses:[5]}` (create-only), `users/<uid>/tests/<pushId>` = `{mode, score, n, category, date}` (create-only) · read and write by that user only (and the owner via the root rule).
- Root `.read: true` → per-node public reads for `questions`, `categories`, `records`, `compareRecords`, `trueAverage`, `daily`, `dailyScores`; root read stays for the owner.
- localStorage: `estimatorQuizDaily` (per-date result and in-progress answers, so a refresh resumes instead of restarting), `estimatorQuizName` (last name typed).

## Decisions (Claude's, technical)
- Daily scoring uses **multiplier 1 for every question** and daily answers **do not write question stats** (avgPoints / multiplier / trueAverage): same guess = same points for everyone all day.
- Schedule script skips "What year…" questions (nearly free points under ratio scoring) and never repeats a question until the pool is used up.
- Share squares are per question by fraction of that question's maximum: 🟩 ≥ 80%, 🟨 ≥ 40%, 🟥 below (same cut-offs as the existing good / medium / bad colours).
- Share uses the phone's share sheet (`navigator.share`) and falls back to copying the text.
- One daily attempt per day per browser (localStorage) and per account (create-only node). A name-only player can replay in a private window; accepted (Tim chose no account needed).
- On sign-in, daily results stored on this device are copied into the account if that date isn't there yet.
- Daily results do not go into the all-time `records` board.
- Operator mode = signed in with the owner's email. Other accounts stay signed in instead of being signed out.
- Email addresses live only in Firebase Auth, never in the database. No email verification step.
- Hidden test hook: localStorage `estimatorQuizTestDate` overrides "today" so checks can run on a past date and be deleted afterwards.

## UI (built plain, matching what exists; all of it is Tim's to redirect)
- Test tab mode screen: a full-width **Daily Quiz** card above the two modes. Not played: "Daily Quiz #N · 5 questions · same for everyone" + Play. Played: score, squares, Share, Leaderboard.
- Daily intro: name box (prefilled from account or last name) + Start. Then the existing question screen. Final screen adds squares, **Share** and the **Today** list.
- Records tab: a third type button **Daily** with today's board (shown once you've played today).
- Profile icon in the top corner → account panel. Signed out: email, password, Sign in, Create account, Continue with Google, Forgot password. Signed in: name (editable), streak, daily history, past tests, Sign out.

## Deliberately NOT planned
- ~~Cloud Functions / scheduled jobs~~ · needs a paid plan.
- ~~Server-side score checking~~ · no server; scores are client-computed like today's records. A cheater can post a fake daily score.
- ~~Daily for Which is Bigger?~~ · not asked.
- ~~Friends lists, groups, notifications, archives of past dailies~~ · not asked.
- ~~Deleting or migrating existing records into accounts~~ · live data, not asked.
- ~~Apple sign-in~~ · needs a paid Apple developer account.

## How this could be wrong
- Email/password provider can't be enabled from the CLI → check `firebase deploy --only auth`, else the Identity Toolkit API, else Tim flips one switch in the console.
- Google popup sign-in fails on iPhone Safari for normal users → only Tim's phone can prove it; email sign-in is the fallback path.
- Per-node read rules break an existing read → verify every listener still loads headlessly after the rules deploy, before pushing the app.
- Local-date days mean a player far ahead in time zone sees tomorrow's quiz first → accepted (Wordle does the same).

## Phases (each ships on its own)
1. **Rules + schedule:** new rules deployed, schedule script run. Done when the live app still loads all five nodes, anonymous probes on `users/` and `daily/` are denied, and `daily/<today>` reads back 5 existing keys.
2. **Daily quiz + share + Today board:** done when a headless run on a test date at 393px and 1440px plays 5 questions, shows the share text, writes exactly one `dailyScores` entry, refuses a second attempt after reload, and two fresh browsers get the same 5 questions.
3. **Accounts:** done when `claude-test` signs up by email headlessly, plays a daily and a test, and a second fresh browser signing in sees the same history; another account cannot read it.

## Questions for Tim
a. ~~Sign-in method~~ → email + Google, 2026-10-09
b. ~~Daily length~~ → 5, 2026-10-09
c. ~~Today leaderboard~~ → yes, 2026-10-09
d. ~~Account required for the daily~~ → no, 2026-10-09
e. Share text wording and the look of the Daily card / profile icon · built plain, flagged in the reply.
f. Should the daily later draw only from questions marked "good"? · recommended: yes, once calibration is done.

## BUILT 2026-10-09
- Shipped: Daily Quiz card, intro, results (squares, Share, Today board), profile button and Account panel in `Estimator_Quiz/index.html`; new rules in `database.rules.json`; email/password provider enabled through `firebase.json` + `firebase deploy --only auth`; `tools/make-daily-schedule.mjs`; schedule uploaded for 2026-10-08 to 2026-12-08 plus test date 2020-01-02.
- Plan was wrong about (changed after the plan-reviewer pass and while building):
  - ~~`daily/<date>/q` = list of keys~~ → list of `{key, text, answer}` copies, so culls and edits can't change a scheduled day.
  - ~~create-only nodes under `users/<uid>`~~ → the owner has full read/write on their own node (write rules cascade); shapes are validated.
  - ~~`dailyScores` rows carry a date~~ → `{name, score}` only; name max 30.
  - ~~Records tab "Daily" button~~ → cut; the Today board shows on the daily results screen only.
  - ~~Percentage questions in the daily with a per-question maximum~~ → the schedule and the fallback skip percentage questions, so every daily is out of 5,000.
  - The seeded fallback runs only when the server answers that the date has no schedule; a failed load shows "Can't load today's quiz".
  - Google sign-in from the Account panel is popup only (redirect is documented broken on Safari when the app isn't on the auth domain); on failure it says to use email.
  - Same day, Tim also asked to remove Which is Bigger? and category choice and to erase all records: done in the same commit (see `chat.md`).
- Verified: see the 2026-10-09 "Daily quiz, accounts, simplify" entry in `chat.md`.
- Still open: Google sign-in for a normal user and the phone share sheet were not exercised (need a real phone); password-reset email not sent in checks; two people sharing one browser can't both play the daily signed out.

## Sources
- https://firebase.google.com/pricing
- https://firebase.google.com/docs/database/security/core-syntax (read rules cascade)

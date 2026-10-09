# Estimator Quiz — chat log (for Claude)

_One entry per session, newest at the bottom, capped at 60 KB. Older entries are in `docs/archive/chat-archive.md`. The current state is in `progress.md`._

## 2026-10-09 · Find the build files, set up the folder and handoff files
- **Asked:** "I don't think I can find the actual build files in this folder, but If they're somewhere else, fiind them and move them to this folder. Once we're ready to start building and have everything finalized and ready let me know. Also make sure to create md files to track our progress and everything and so that reseting the chat is easy."
- **Found:** the folder had only a Dec 2025 `index.html` and `question-banks/`. The current build (3 commits from 2026-09-27: empty-quiz fix, README + screenshots, Google operator login + database rules) existed only on GitHub. No other clone on the laptop (searched home and OneDrive for `database.rules.json` / `.firebaserc`).
- **Decided (Claude):** GitHub is the source of truth; make this folder its own repo; keep the nested app path; commit the question banks.
- **Built:** `git init` here with the existing remote, checked out `origin/main` (`93358b8`). Removed the old root `index.html` after confirming it was identical to old commit `93e6a5d`. Added `progress.md`, `chat.md`, committed `question-banks/`.
- **Verified how:** curl of the live page diffed identical to `Estimator_Quiz/index.html` at HEAD. phone-view WebKit iPhone 15 (393px) and `--desktop` (1440px) on the live URL: page renders, no console errors, no failed requests, no horizontal overflow; Estimation button click worked. Firebase CLI 15.24.0 logged in.
- **Open:** Tim to say what to build. See NOT verified in `progress.md` (database vs CSVs, deployed rules, full play-through).

## 2026-10-09 · Question cull (same chat)
- **Asked:** "There are too many questions that are either too similar or there's a word or reference in the question that the average person would have no idea what it's referring to. Could you review these questions and make decisions on which ones you think we should keep or remove? Also there might be other questions you think we should remove for other reasons. If so, go ahead and remove them."
- **Decided (Claude, under that go):** read all 2,500 live questions and removed 1,148: 294 too similar, 563 obscure/jargon, 196 vague or unknowable, 54 wrong or garbled, 41 trick/giveaway/not an estimate. Rules are D5 in `progress.md`.
- **Built:** deleted those keys from `/questions` with `firebase database:update` (PowerShell). Backup first: `backups/db-full-2026-10-09-before-question-cull.json` (local, gitignored). `docs/removed-questions-2026-10-09.csv` lists each removed question with reason. README counts corrected. No app code changed.
- **Verified how:** re-downloaded the database: 1,352 questions left, 0 of the removed keys present, 0 kept keys missing or altered, records/compareRecords/categories/trueAverage byte-equal to before. Live app via phone-view WebKit 393px and `--desktop` 1440px: loads 1,352, category counts show 295/192/327/184/354, a 20-question test starts and shows a question, no console errors. No answers submitted.
- **Open:** year questions score ~1000 for any sensible guess (63 left), needs Tim's decision on a scoring fix. History and Fine Arts are now the thinnest categories (192, 184).

# Player stats, question types, operator panel, scoring graph — plan

**Status:** building (Tim said go in the ask itself), 2026-10-15.

## Tim's words (2026-10-15)
> "right now personal data and records for questions is pretty much nonexistant for anyone that isn't an opperator and even the opperator is pretty limited. could you expand this so that both the opperator and the user's have more relavent and visual data that's easier and nicer to see and use.
> I also want to make a summary for the user so that it tells the user what type of questions they're good or bad at (distance, population, money, or whatever you want to categorize the questions as. Maybe questions will get multiple categorizations or something like that).
> Additionally could you analyze the questions and category sections in the opperator pannel. They're pretty outdated and I'm not sure they're really useful anymore. Maybe we could categorize them differently or something.
> Could you show a visual graph of what the scoring system looks like so it's easier to understand for the user?"

## One-sentence answer
Every question gets two tags (what kind of number: Money, People, Distance…; and what it's about: Nature, History, Sports…), players get a "You" view in Records built from their own answers, the operator's old Categories tab becomes a Types overview that drives the Questions list, and Info gets a points-vs-miss curve.

## Two tags per question (Tim: "maybe multiple categorizations")
- `kind` (10): money, people, distance, time, weight, speed, area (area & volume), count (things), science (temperature, energy…), percent.
- `subject` (10): nature, space (science & space), body, history, places, business, sports, entertainment, food, everyday.
- Tagged once by 8 read-only agents (fixed lists), written as new fields on `/questions/<k>`; old `category` left in place (unused by play). New questions without tags show as "Untagged".

## Player "You" view (Records tab: Leaderboard | You)
Data = this player's own answers only: dailies on this device + the account's dailies (keys from the day's schedule copy), the account's practice tests (`answers {k,g,p}`), and from now on practice answers saved on the device (`estimatorQuizPracticeLog`). Nothing new is written to the database.
1. Four numbers: Played · Daily average · Best · Streak.
2. Daily scores: one bar per day (latest 30), red→green, line at 2,500.
3. Strengths: one bar per type (avg points per answer, red→green), sorted; switch Kind / Subject; a one-line summary ("Best at Distance. Hardest: Money."). Needs 2+ answers per type.
4. Guess tendency: share low vs high and typical miss ("You guess low 60% of the time · typical miss 2.1×"), with a small under/over histogram.

## Operator
- Categories tab → **Types**: one card per kind and per subject with questions (daily/practice), logged answers, average points, % low, median B. Tapping a card opens Questions filtered to it.
- Questions tab: search box + filters (kind, subject, pool) + sorts; each row shows its tags, answer, B, guesses and average; import/add forms folded under one "Add questions" toggle. Category banner and create-category UI removed (categories are no longer used in play).
- Stats tab: adds "By type" (avg points per kind) and "Players" (plays per day, distinct names).

## Scoring graph (Info → Scoring System)
SVG curve of points (0–1,000) against "your guess ÷ answer" on a log axis from ÷10 to ×10, three curves: strict (B 0.6), typical (B 1.3, the median), forgiving (B 3). Plainest version; Tim decides look.

## Deliberately NOT planned
- No new database writes from players (privacy and rules unchanged).
- Old `category` field not deleted (data rule: no deletes without his go; harmless).
- No player-vs-player comparisons beyond the existing leaderboard.

## Risks
- Tags are judgement calls; a wrong tag only shifts a strength bar. Operator can see tags per question.
- "You" for a name-only player covers only this device.

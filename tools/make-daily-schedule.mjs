// Builds the Daily Quiz schedule: 5 questions per day from the questions set aside for
// the daily (pool: "daily"), copied (key, text, answer) so later edits or removals can't
// change a scheduled day. Practice tests never use these questions.
//
//   node tools/make-daily-schedule.mjs <first-date YYYY-MM-DD> <days> <out.json> [--replace]
//   firebase database:update /daily <out.json> --project estimator-quiz --force   (run from PowerShell)
//
// Never touches today or a past date, and never reuses a question that is scheduled on a
// date it leaves alone. Without --replace, a date that is already scheduled is left alone;
// with --replace, dates from <first-date> onward are rebuilt.
//
// A day's five questions come from five different topics, and a topic is not used again
// until the topics with more questions left have had their turn, so look-alike questions
// end up weeks apart. Percentage questions are skipped (worth 100, not 1000).

import { writeFileSync } from 'node:fs';

const DB = 'https://estimator-quiz-default-rtdb.firebaseio.com';
const PER_DAY = 5;
const args = process.argv.slice(2);
const replace = args.includes('--replace');
const [first, daysArg, outPath] = args.filter(a => a !== '--replace');
if (!/^\d{4}-\d{2}-\d{2}$/.test(first || '') || !Number(daysArg) || !outPath) {
    console.error('usage: node tools/make-daily-schedule.mjs <first-date YYYY-MM-DD> <days> <out.json> [--replace]');
    process.exit(2);
}

// The app's day changes at midnight in the US; the day before UTC's today is always safe to call "past or today"
const todayUtc = new Date().toISOString().slice(0, 10);
if (first <= todayUtc) {
    console.error(`First date must be after ${todayUtc}: today's and past quizzes are never rewritten.`);
    process.exit(2);
}

const getJson = async path => (await fetch(`${DB}/${path}.json`)).json();
const shuffle = list => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const rawQuestions = await getJson('questions');
const existing = (await getJson('daily')) || {};

const dates = [];
const [y, m, d] = first.split('-').map(Number);
for (let i = 0; i < Number(daysArg); i++) {
    dates.push(new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10));
}
const rebuilt = new Set(dates.filter(date => replace || !existing[date]));

const used = new Set();
for (const [date, day] of Object.entries(existing)) {
    if (rebuilt.has(date)) continue;
    Object.values(day.q || {}).forEach(item => used.add(String(item.key)));
}

const topics = {};
for (const [key, q] of Object.entries(rawQuestions)) {
    if (!q || typeof q !== 'object' || q.pool !== 'daily') continue;
    if (used.has(String(key)) || typeof q.answer !== 'number' || /percentage/i.test(q.text)) continue;
    const topic = q.topic || q.category || 'other';
    (topics[topic] = topics[topic] || []).push({ key: String(key), text: q.text, answer: q.answer });
}
for (const topic of Object.keys(topics)) topics[topic] = shuffle(topics[topic]);

const updates = {};
let written = 0;
for (const date of dates) {
    if (!rebuilt.has(date)) continue;
    // The five topics with the most questions left (ties in random order)
    const pick = shuffle(Object.keys(topics).filter(t => topics[t].length))
        .sort((a, b) => topics[b].length - topics[a].length)
        .slice(0, PER_DAY);
    if (pick.length < PER_DAY) {
        console.error(`Ran out of daily questions at ${date}`);
        break;
    }
    updates[date] = { q: shuffle(pick.map(topic => topics[topic].pop())) };
    written++;
}

writeFileSync(outPath, JSON.stringify(updates));
const left = Object.values(topics).reduce((sum, list) => sum + list.length, 0);
console.log(`${written} days written to ${outPath} (${dates[0]} to ${Object.keys(updates).pop()}), ${dates.length - rebuilt.size} already scheduled and left alone.`);
console.log(`Daily questions left unused: ${left} across ${Object.values(topics).filter(l => l.length).length} topics.`);

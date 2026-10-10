// Builds the Daily Quiz schedule: 5 questions per day, one from each category,
// copied (key, text, answer) so later edits or removals can't change a scheduled day.
//
//   node tools/make-daily-schedule.mjs <first-date YYYY-MM-DD> <days> <out.json>
//   firebase database:update /daily <out.json> --project estimator-quiz --force   (run from PowerShell)
//
// Never overwrites a date that is already scheduled, and never reuses a question that
// is already scheduled on any date. Skips "What year..." questions (nearly free points)
// and percentage questions (worth 100, not 1000), so every daily is out of 5,000.

import { writeFileSync } from 'node:fs';

const DB = 'https://estimator-quiz-default-rtdb.firebaseio.com';
const CATEGORIES = ['Industry', 'Science', 'History', 'Entertainment', 'Fine Arts'];
const [first, daysArg, outPath] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(first || '') || !Number(daysArg) || !outPath) {
    console.error('usage: node tools/make-daily-schedule.mjs <first-date YYYY-MM-DD> <days> <out.json>');
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

const used = new Set();
Object.values(existing).forEach(day => (day.q || []).forEach(item => used.add(String(item.key))));

const pools = {};
for (const cat of CATEGORIES) pools[cat] = [];
for (const [key, q] of Object.entries(rawQuestions)) {
    if (!q || typeof q !== 'object' || !pools[q.category]) continue;
    if (used.has(String(key)) || typeof q.answer !== 'number') continue;
    // Year questions are nearly free points; percentage questions max at 100 instead of 1000
    if (/^what year\b/i.test(q.text) || /percentage/i.test(q.text)) continue;
    pools[q.category].push({ key: String(key), text: q.text, answer: q.answer });
}
for (const cat of CATEGORIES) pools[cat] = shuffle(pools[cat]);

const updates = {};
const [y, m, d] = first.split('-').map(Number);
let written = 0, skipped = 0;
for (let i = 0; i < Number(daysArg); i++) {
    const date = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    if (existing[date]) { skipped++; continue; }
    if (CATEGORIES.some(cat => pools[cat].length === 0)) {
        console.error(`Ran out of unused questions at ${date}`);
        break;
    }
    updates[date] = { q: shuffle(CATEGORIES.map(cat => pools[cat].pop())) };
    written++;
}

writeFileSync(outPath, JSON.stringify(updates));
console.log(`${written} days written to ${outPath}, ${skipped} already scheduled and left alone.`);
console.log('Unused questions left per category:', Object.fromEntries(CATEGORIES.map(c => [c, pools[c].length])));

// Is the scoring on target? Every question aims for an average of half its maximum (500).
// Reads owner dumps and reports, for daily board answers and logged practice guesses, the
// average score now and the single factor k that would bring it to 500 if every multiplier
// were multiplied by k, with a 90% bootstrap range. Changes nothing.
//
//   node tools/scoring-check.cjs <dump-dir>
// <dump-dir> holds questions.json, daily.json, dailyScores.json, guesses.json
// (firebase database:get /<node> --project estimator-quiz -o <dump-dir>/<node>.json).
//
// Only act (scale multipliers, then tools/rescore.cjs) when the 90% range excludes 1.
// 2026-10-15: daily 50 answers, avg 475, k 1.09 (0.81-1.45) -> no change.
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const read = name => {
    const file = path.join(dir, name);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) || {} : {};
};
const questions = read('questions.json'), daily = read('daily.json');
const dailyScores = read('dailyScores.json'), guesses = read('guesses.json');
const list = v => (Array.isArray(v) ? v : Object.values(v || {}));

// Share of the maximum, same formula as the app's calculatePoints (unrounded)
function fraction(x, U, B, text) {
    if (/percentage/i.test(text)) return Math.exp(-((x - U) ** 2) / (200 * B));
    if (U === 0) return x === 0 ? 1 : 0;
    if ((x < 0 && U > 0) || (x > 0 && U < 0) || x === 0) return 0;
    const ln = Math.log(Math.abs(x) / Math.abs(U));
    return Math.exp(-(ln * ln) / (B * B));
}
const mean = (rows, k) => rows.reduce((s, r) => s + fraction(r.g, r.a, r.B * k, r.text), 0) / rows.length;
function solveK(rows) {
    let lo = 0.05, hi = 50;
    for (let i = 0; i < 60; i++) { const m = Math.sqrt(lo * hi); if (mean(rows, m) < 0.5) lo = m; else hi = m; }
    return lo;
}
function report(name, rows) {
    if (!rows.length) { console.log(name, 'no answers'); return; }
    const ks = [];
    for (let b = 0; b < 500; b++) ks.push(solveK(rows.map(() => rows[Math.floor(Math.random() * rows.length)])));
    ks.sort((x, y) => x - y);
    console.log(JSON.stringify({
        set: name, answers: rows.length, avgNow: Math.round(mean(rows, 1) * 1000),
        k: +solveK(rows).toFixed(2), range90: [+ks[25].toFixed(2), +ks[475].toFixed(2)]
    }));
}

// Daily: every board row with its answers, scored against that day's stored questions
const dailyRows = [];
for (const [date, rows] of Object.entries(dailyScores)) {
    const items = list(daily[date] && daily[date].q);
    for (const row of Object.values(rows || {})) {
        if (!row || !row.g) continue;
        list(row.g).forEach((g, i) => {
            const it = items[i];
            if (!it) return;
            const q = questions[it.key];
            dailyRows.push({ g, a: it.answer, B: (q && q.multiplier) || 1, text: it.text });
        });
    }
}
// Practice: the guess log (daily guesses are already counted from the board)
const practiceRows = [];
for (const [key, rows] of Object.entries(guesses)) {
    const q = questions[key];
    if (!q || q.pool !== 'practice') continue;
    for (const r of Object.values(rows || {})) {
        if (r.d) continue;
        practiceRows.push({ g: r.g, a: typeof r.a === 'number' ? r.a : q.answer, B: q.multiplier || 1, text: q.text });
    }
}
report('daily', dailyRows);
report('practice', practiceRows);

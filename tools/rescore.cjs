// Recalculates every saved score that still has its answers, after a scoring change.
// Tim (2026-10-14): "Every time you adjust the algorithm for scoring on the cite, could you
// rhetrospectively change everyone's practice and daily scores based on their answer to each
// question and everything."
//
//   node tools/rescore.cjs <dump-dir>
// <dump-dir> holds owner dumps (firebase database:get ... -o): questions.json, daily.json,
// dailyScores.json, users.json, records.json, scoring.json. Writes <dump-dir>/rescore-update.json
// (paths from the database root, for `firebase database:update / <file>`) and prints a summary
// without names or answers.
//
// What it changes (same formula and multipliers as the app's calculatePoints):
//  - users/<uid>/daily/<date>: pts and score from the saved guesses; scoreNotice {v, from, to}
//    = the account's daily average before and after (shown once in the app).
//  - dailyScores/<date>/<id>: score (and pts) from the row's own g, or for u_<uid> rows from the
//    account's guesses. Old name-only rows without g can't be recalculated and stay.
//  - records/<r> and users/<uid>/tests/<t> that have answers: each p and the total score.
//  - scoring/v + 1, so name-only devices recalculate their own saved dailies on next visit.
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const read = name => {
    const file = path.join(dir, name);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) || {} : {};
};
const questions = read('questions.json'), daily = read('daily.json'), dailyScores = read('dailyScores.json');
const users = read('users.json'), records = read('records.json'), scoring = read('scoring.json');

// Copy of the app's calculatePoints
function calculatePoints(userAnswer, correctAnswer, multiplier = 1, questionText = '') {
    const B = multiplier || 1;
    if (questionText.toLowerCase().includes('percentage')) {
        const points = 100 * Math.exp(-((userAnswer - correctAnswer) ** 2) / (200 * B));
        return Math.round(points * 10) / 10;
    }
    if (correctAnswer === 0) return userAnswer === 0 ? 1000 : 0;
    if ((userAnswer < 0 && correctAnswer > 0) || (userAnswer > 0 && correctAnswer < 0)) return 0;
    const x = Math.abs(userAnswer), U = Math.abs(correctAnswer);
    if (x === 0) return 0;
    const ln = Math.log(x / U);
    return Math.round(1000 * Math.exp(-(ln * ln) / (B * B)) * 10) / 10;
}
const list = v => (Array.isArray(v) ? v : Object.values(v || {}));
const multiplier = key => (questions[key] && questions[key].multiplier) || 1;
const total = pts => Math.round(pts.reduce((s, p) => s + p, 0) * 10) / 10;

function dailyPoints(date, guesses) {
    const items = daily[date] && list(daily[date].q);
    if (!items || items.length < guesses.length) return null;
    return guesses.map((g, i) => calculatePoints(g, items[i].answer, multiplier(items[i].key), items[i].text));
}

const v = (Number(scoring.v) || 0) + 1;
const update = { 'scoring/v': v, 'scoring/t': Date.now() };
const stats = { accounts: 0, accountDays: 0, boardRows: 0, boardSkipped: 0, records: 0, tests: 0 };
const accountDaily = {}; // uid -> date -> new {pts, score}

for (const [uid, user] of Object.entries(users)) {
    if (!user || !user.daily) continue;
    let before = [], after = [];
    for (const [date, day] of Object.entries(user.daily)) {
        const guesses = list(day.guesses);
        const pts = guesses.length ? dailyPoints(date, guesses) : null;
        if (!pts) { if (typeof day.score === 'number') { before.push(day.score); after.push(day.score); } continue; }
        const score = total(pts);
        before.push(day.score); after.push(score);
        update[`users/${uid}/daily/${date}/pts`] = pts;
        update[`users/${uid}/daily/${date}/score`] = score;
        (accountDaily[uid] = accountDaily[uid] || {})[date] = { pts, score, late: !!day.late };
        stats.accountDays++;
    }
    if (before.length) {
        const avg = a => Math.round(a.reduce((s, x) => s + x, 0) / a.length * 10) / 10;
        update[`users/${uid}/scoreNotice`] = { v, from: avg(before), to: avg(after) };
        stats.accounts++;
    }
}

for (const [date, rows] of Object.entries(dailyScores)) {
    for (const [id, row] of Object.entries(rows || {})) {
        if (!row) continue;
        let pts = row.g ? dailyPoints(date, list(row.g)) : null;
        if (!pts && id.startsWith('u_') && accountDaily[id.slice(2)] && accountDaily[id.slice(2)][date]) {
            pts = accountDaily[id.slice(2)][date].pts;
            update[`dailyScores/${date}/${id}/score`] = total(pts);  // pts stay private to the account
            stats.boardRows++;
            continue;
        }
        if (!pts) { stats.boardSkipped++; continue; }
        update[`dailyScores/${date}/${id}/score`] = total(pts);
        update[`dailyScores/${date}/${id}/pts`] = pts;
        stats.boardRows++;
    }
}

function rescoreAnswers(prefix, entry, scoreField) {
    const answers = entry && entry.answers && list(entry.answers);
    if (!answers || !answers.length) return false;
    const pts = answers.map(a => {
        const q = questions[a.k];
        return q ? calculatePoints(a.g, q.answer, q.multiplier || 1, q.text) : a.p;
    });
    pts.forEach((p, i) => { update[`${prefix}/answers/${i}/p`] = p; });
    update[`${prefix}/${scoreField}`] = total(pts);
    return true;
}
for (const [key, record] of Object.entries(records)) if (rescoreAnswers(`records/${key}`, record, 'score')) stats.records++;
for (const [uid, user] of Object.entries(users)) {
    for (const [key, test] of Object.entries((user && user.tests) || {})) {
        if (rescoreAnswers(`users/${uid}/tests/${key}`, test, 'score')) stats.tests++;
    }
}

fs.writeFileSync(path.join(dir, 'rescore-update.json'), JSON.stringify(update));
console.log(JSON.stringify({ scoringVersion: v, ...stats }));

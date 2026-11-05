// Re-weights question multipliers (B) from players' real answers. Changes nothing live by itself.
// Tim (2026-11-05): "make sure that you're thinking critically before you adjust anything. Just because
// the 2 people who answered scored poorly doesn't mean that it needs to be drastically changed. Look at
// the types of questions that people are scoring very low or very high on and look for patterns."
//
//   node tools/reweight.cjs <dump-dir>
// <dump-dir> holds owner dumps: questions.json, daily.json, dailyScores.json, users.json, records.json,
// guesses.json. Writes <dump-dir>/reweight-update.json (paths under /questions, for
// `firebase database:update /questions <file>`) and <dump-dir>/reweight-report.txt. Then run
// tools/rescore.cjs on a dump that has the new multipliers (the standing rescoring rule).
//
// Two steps, in order:
// 1. KIND_FACTOR: a rule for every question of a kind, played or not (the future daily schedule and the
//    practice pool included; the daily reads live multipliers). Only for patterns that held across
//    players and questions (progress.md, 2026-11-05). New questions of that kind: B solved from the
//    guessed range, times the factor.
// 2. Per played question, only once the data can tell a hard question from an unlucky day: the test is
//    whether OTHER players' misses on a question predict this player's miss on it (correlation rho,
//    95% interval over questions). If the interval doesn't exclude 0, step 2 changes nothing.
//    Otherwise each question's typical miss (|ln(guess/answer)| / B, capped at 10x) is pooled toward
//    the average with weight n*rho / (1 + (n-1)*rho) (one answer counts for about rho), and B follows
//    it, never more than x1.5 or /1.5.
// Answers 1000x or more off (typing in millions, etc.) are left out: no sensible B rescues them.
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const read = name => {
    const file = path.join(dir, name);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) || {} : {};
};
const questions = read('questions.json'), daily = read('daily.json'), dailyScores = read('dailyScores.json');
const users = read('users.json'), records = read('records.json'), guesses = read('guesses.json');
const list = v => (Array.isArray(v) ? v : Object.values(v || {}));

// 2026-11-05: money questions averaged 366 (k 1.32; 95% 1.08-1.58 over questions, 1.14-1.62 over
// players; 5 of 6 players below 500; daily 1.33 and practice 1.31 separately; 1.26-1.40 leaving out
// any one question). Shrunk toward the other kinds (empirical Bayes over the six tested kinds): 1.19.
const KIND_FACTOR = { money: 1.19 };
const STEP_MAX = 1.5, B_MIN = 0.3, B_MAX = 10, MISS_CAP = Math.log(10);
const TEST_UID = 'aS4hKdbcpVcs4dGiSl6tznu9yTy1';   // claude-test

const isPct = text => /percentage/i.test(text || '');
const clampB = b => Math.round(Math.max(B_MIN, Math.min(B_MAX, b)) * 1000) / 1000;
const share = (g, a, B) => Math.exp(-(Math.log(g / a) ** 2) / (B * B));
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
// One person = one player (board names as shown publicly; an account name and a signed-out name can differ)
const ALIASES = { vardenh: 'varden' };
const name = s => { const n = String(s || '').trim().toLowerCase().split(/\s+/)[0].replace(/[^a-z]/g, ''); return ALIASES[n] || n || 'anon'; };

// Every answer: daily board rows (+ account rows, late plays), practice guess log (player from the
// practice records/tests when the answer matches, else "unknown")
const answers = [];   // {key, g, a, player}
const addAnswer = (key, g, a, player) => {
    const q = questions[key];
    if (!q || isPct(q.text) || !(g > 0) || !(a > 0)) return;
    if (Math.abs(Math.log10(g / a)) >= 3) return;
    answers.push({ key: String(key), g, a, player });
};
const uidName = uid => (uid && users[uid] ? name(users[uid].name) : 'anon');
const seenAccountDays = new Set();
for (const [date, rows] of Object.entries(dailyScores)) {
    const items = list(daily[date] && daily[date].q);
    for (const [id, row] of Object.entries(rows || {})) {
        if (!row) continue;
        const uid = id.startsWith('u_') ? id.slice(2) : null;
        if (uid === TEST_UID) continue;
        let g = row.g ? list(row.g) : null;
        if (!g && uid && users[uid] && users[uid].daily && users[uid].daily[date]) g = list(users[uid].daily[date].guesses);
        if (!g) continue;
        if (uid) seenAccountDays.add(uid + '|' + date);
        const player = uid ? uidName(uid) : name(row.name);
        g.forEach((x, i) => items[i] && addAnswer(items[i].key, x, items[i].answer, player));
    }
}
for (const [uid, user] of Object.entries(users)) {
    if (uid === TEST_UID) continue;
    for (const [date, day] of Object.entries((user && user.daily) || {})) {
        if (seenAccountDays.has(uid + '|' + date) || !day.guesses) continue;
        const items = list(daily[date] && daily[date].q);
        list(day.guesses).forEach((x, i) => items[i] && addAnswer(items[i].key, x, items[i].answer, uidName(uid)));
    }
}
const owner = {};
for (const r of Object.values(records)) if (r && r.answers && r.uid !== TEST_UID) for (const a of list(r.answers)) owner[a.k + '|' + a.g] = r.uid ? uidName(r.uid) : name(r.name);
for (const [uid, user] of Object.entries(users)) for (const t of Object.values((user && user.tests) || {})) for (const a of list(t.answers)) owner[a.k + '|' + a.g] = uid === TEST_UID ? null : uidName(uid);
for (const [key, entries] of Object.entries(guesses)) {
    const q = questions[key];
    if (!q || q.pool !== 'practice') continue;     // daily guesses logged before the d flag are on the board
    for (const e of Object.values(entries || {})) {
        if (e.d || owner[key + '|' + e.g] === null) continue;
        addAnswer(key, e.g, typeof e.a === 'number' ? e.a : q.answer, owner[key + '|' + e.g] || 'unknown');
    }
}

// Step 1: kind factors
const step1 = {};
for (const [key, q] of Object.entries(questions)) {
    if (!q || isPct(q.text)) continue;
    step1[key] = clampB((q.multiplier || 1) * (KIND_FACTOR[q.kind] || 1));
}

// Step 2: is there a per-question signal yet?
for (const r of answers) r.m = Math.min(MISS_CAP, Math.abs(Math.log(r.g / r.a))) / step1[r.key];
const byQ = {};
for (const r of answers) (byQ[r.key] = byQ[r.key] || []).push(r);
const pairs = [];
for (const r of answers) {
    // Practice answers we can't tie to a player might be the same person: left out of this test
    if (r.player === 'unknown') continue;
    const others = byQ[r.key].filter(x => x.player !== r.player && x.player !== 'unknown');
    if (others.length) pairs.push({ key: r.key, own: r.m, others: mean(others.map(x => x.m)) });
}
const corr = P => {
    const mx = mean(P.map(p => p.others)), my = mean(P.map(p => p.own));
    let sxy = 0, sxx = 0, syy = 0;
    for (const p of P) { sxy += (p.others - mx) * (p.own - my); sxx += (p.others - mx) ** 2; syy += (p.own - my) ** 2; }
    return sxy / Math.sqrt(sxx * syy);
};
const rho = pairs.length >= 10 ? corr(pairs) : 0;
let seed = 2026; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const clusters = Object.values(pairs.reduce((o, p) => ((o[p.key] = o[p.key] || []).push(p), o), {}));
const boots = [];
for (let b = 0; b < 1000 && clusters.length >= 5; b++) {
    let s = []; for (let i = 0; i < clusters.length; i++) s = s.concat(clusters[Math.floor(rnd() * clusters.length)]);
    boots.push(corr(s));
}
boots.sort((x, y) => x - y);
const rhoLo = boots.length ? boots[24] : 0, rhoHi = boots.length ? boots[974] : 0;
const perQuestion = rhoLo > 0;

const final = { ...step1 }, notes = {};
const overall = mean(answers.map(r => r.m));
for (const [key, rs] of Object.entries(byQ)) {
    const q = questions[key], n = rs.length;
    let w = 0;
    if (perQuestion) {
        w = n * rho / (1 + (n - 1) * rho);
        const ratio = 1 + w * (mean(rs.map(r => r.m)) / overall - 1);
        final[key] = clampB(step1[key] * Math.max(1 / STEP_MAX, Math.min(STEP_MAX, ratio)));
    }
    const avg = B => Math.round(1000 * mean(rs.map(r => share(r.g, r.a, B))));
    notes[key] = { n, avgBefore: avg(q.multiplier || 1), w: +w.toFixed(2), avgAfter: avg(final[key]) };
}

const update = {}, changed = [];
for (const [key, B] of Object.entries(final)) {
    const old = questions[key].multiplier || 1;
    if (Math.abs(B - old) < 0.0005) continue;
    update[`${key}/multiplier`] = B;
    update[`${key}/avgPoints`] = 0;     // the in-app practice adjuster starts a fresh count at the new B
    update[`${key}/avgCount`] = 0;
    changed.push({ key, old, B, ratio: B / old, kind: questions[key].kind, pool: questions[key].pool, ...(notes[key] || {}) });
}

const ratios = changed.map(c => c.ratio).sort((a, b) => a - b);
const pick = p => ratios.length ? ratios[Math.floor(p * (ratios.length - 1))].toFixed(2) : '-';
const played = changed.filter(c => c.n);
const allPlayed = Object.values(notes);
const report = [
    `answers used ${answers.length} on ${Object.keys(byQ).length} questions, ${new Set(answers.map(r => r.player)).size} players`,
    `per-question signal: rho ${rho.toFixed(2)} (95% ${rhoLo.toFixed(2)} to ${rhoHi.toFixed(2)}, ${pairs.length} answer pairs on ${clusters.length} questions) -> ${perQuestion ? 'pooling applied' : 'interval includes 0: no per-question changes'}`,
    `kind factors ${JSON.stringify(KIND_FACTOR)}`,
    `questions changed ${changed.length} (played ${played.length}, unplayed ${changed.length - played.length}); new/old ratio min ${pick(0)} median ${pick(0.5)} max ${pick(1)}`,
    `played questions (all ${allPlayed.length}): average points per answer-question at old B ${Math.round(mean(allPlayed.map(c => c.avgBefore)))} -> new ${Math.round(mean(allPlayed.map(c => c.avgAfter)))}`,
    '', 'CHANGED AND PLAYED (key kind pool n oldB -> newB  avg before -> after  weight):',
    ...played.sort((a, b) => a.ratio - b.ratio).map(c => `${c.key}\t${c.kind}\t${c.pool}\tn${c.n}\t${c.old} -> ${c.B}\t${c.avgBefore} -> ${c.avgAfter}\tw ${c.w}`)
];
fs.writeFileSync(path.join(dir, 'reweight-update.json'), JSON.stringify(update));
fs.writeFileSync(path.join(dir, 'reweight-report.txt'), report.join('\n') + '\n');
console.log(report.slice(0, 5).join('\n'));

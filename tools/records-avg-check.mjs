// records-avg-check: the per-question averages shown at the top of a day's leaderboard (Records).
//
//   node tools/records-avg-check.mjs            (exit 1 on failure)
//   options: --app <path to an index.html>      (an old copy, to watch it fail)
//
// Pulls dailyQuestionAverages() out of the app and runs it on rows shaped exactly like
// dailyScores/<date> (real points from 2026-10-16 and 2026-10-10, names removed).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const i = argv.indexOf('--app');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = resolve(i >= 0 ? argv[i + 1] : join(ROOT, 'Estimator_Quiz', 'index.html'));

const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };

const html = readFileSync(APP, 'utf8');
const m = html.match(/function dailyQuestionAverages\([\s\S]*?\r?\n        \}\r?\n/);
check('app defines dailyQuestionAverages()', !!m);
if (!m) { console.log('0 of 1 passed'); process.exit(1); }
const dailyQuestionAverages = new Function(m[0] + '\nreturn dailyQuestionAverages;')();

const near = (a, b) => Math.abs(a - b) < 0.01;

// 2026-10-16: six players, every row has five points
const day16 = {
    '-P44a': { g: [285, 145, 5000000, 1000000, 300], name: 'a', pts: [1000, 997.3, 500.3, 964, 500.3], score: 3961.9 },
    '-P45b': { g: [300, 80, 2000000, 2000000, 400], name: 'b', pts: [999.5, 515.2, 1000, 923, 302.5], score: 3740.2 },
    '-P46c': { g: [31, 250, 150000, 3000000, 20], name: 'c', pts: [345.7, 658.5, 3.9, 730.4, 70.8], score: 1809.3 },
    'u_d': { g: [105, 135, 500000, 130000, 230], name: 'd', pts: [805.7, 979.6, 204.9, 80.4, 705.3], score: 2775.9 },
    'u_e': { g: [150, 220, 200000, 400000, 400], name: 'e', pts: [914.3, 792.3, 12.6, 511.7, 302.5], score: 2533.4 },
    'u_f': { g: [38, 416, 800000, 845000, 115], name: 'f', pts: [416.3, 184.9, 500.3, 910.2, 998.5], score: 3010.2 }
};
let out = dailyQuestionAverages(day16);
const want16 = [746.917, 687.967, 370.333, 686.617, 479.983];
check('2026-10-16: five averages', out.length === 5, `got ${out.length}`);
check('2026-10-16: averages match', out.every((q, k) => near(q.avg, want16[k]) && q.n === 6),
    out.map(q => q.avg.toFixed(1) + '/' + q.n).join(' '));

// 2026-10-10: an early row saved before points were stored is left out, not counted as 0
const day10 = {
    'x': { name: 'x', score: 1765 },
    'y': { name: 'y', pts: [231.1, 953.5, 790, 0, 19.4], score: 1994 },
    'z': { name: 'z', pts: [889, 44, 986.2, 402.6, 999.6], score: 3321.4 }
};
out = dailyQuestionAverages(day10);
const want10 = [560.05, 498.75, 888.1, 201.3, 509.5];
check('2026-10-10: row without points skipped', out.every((q, k) => near(q.avg, want10[k]) && q.n === 2),
    out.map(q => q.avg.toFixed(1) + '/' + q.n).join(' '));
check('a real 0 counts as 0', near(out[3].avg, 201.3));

// Firebase turns a sparse array into an object; a missing slot is skipped for that question only
out = dailyQuestionAverages({ p: { pts: { 0: 800, 2: 400, 3: 100, 4: 900 }, score: 2200 }, q: { pts: [600, 500, 200, 300, 100], score: 1700 } });
check('sparse points: missing slot skipped', near(out[0].avg, 700) && out[1].n === 1 && near(out[1].avg, 500) && near(out[2].avg, 300),
    out.map(q => q.avg.toFixed(1) + '/' + q.n).join(' '));

// Nothing to average: empty day, no rows with points, junk rows
check('empty day gives no cells', dailyQuestionAverages({}).length === 0 && dailyQuestionAverages(undefined).length === 0);
check('only old rows gives no cells', dailyQuestionAverages({ x: { score: 1765 }, y: null }).length === 0);

const passed = results.filter(Boolean).length;
console.log(`${passed} of ${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);

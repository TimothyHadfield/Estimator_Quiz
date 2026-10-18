// breakdown-check: the question breakdown opened from a Q cell in Records.
//
//   node tools/breakdown-check.mjs            (exit 1 on failure)
//   options: --app <path to an index.html>    (an old copy, to watch it fail)
//
// Pulls questionBreakdownRows() and breakdownAllowed() out of the app and runs them on rows
// shaped exactly like dailyScores/<date> (real points and guesses from 2026-10-16, names changed).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const ai = argv.indexOf('--app');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = resolve(ai >= 0 ? argv[ai + 1] : join(ROOT, 'Estimator_Quiz', 'index.html'));

const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };
const html = readFileSync(APP, 'utf8');
const grab = name => (html.match(new RegExp(`function ${name}\\([\\s\\S]*?\\r?\\n        \\}\\r?\\n`)) || [])[0];

const src = ['playerKey', 'questionBreakdownRows', 'breakdownAllowed'].map(grab);
check('app defines questionBreakdownRows() and breakdownAllowed()', !!(src[1] && src[2]));
if (!src[1] || !src[2]) { console.log('0 of 1 passed'); process.exit(1); }
const { questionBreakdownRows, breakdownAllowed } = new Function(src.join('\n') + '\nreturn { questionBreakdownRows, breakdownAllowed };')();

const day16 = {
    '-P44a': { g: [285, 145, 5000000, 1000000, 300], name: 'kay', pts: [1000, 997.3, 500.3, 964, 500.3], score: 3961.9 },
    '-P45b': { g: [300, 80, 2000000, 2000000, 400], name: 'hugo', pts: [999.5, 515.2, 1000, 923, 302.5], score: 3740.2 },
    '-P46c': { g: [31, 250, 150000, 3000000, 20], name: 'kar', pts: [345.7, 658.5, 3.9, 730.4, 70.8], score: 1809.3 },
    'u_d': { g: [105, 135, 500000, 130000, 230], name: 'var', pts: [805.7, 979.6, 204.9, 80.4, 705.3], score: 2775.9 },
    'u_e': { g: [150, 220, 200000, 400000, 400], name: 'tee', pts: [914.3, 792.3, 12.6, 511.7, 302.5], score: 2533.4 },
    'u_f': { g: [38, 416, 800000, 845000, 115], name: 'chick', pts: [416.3, 184.9, 500.3, 910.2, 998.5], score: 3010.2 },
    'old': { name: 'early', score: 1765 }   // saved before points were stored
};

// Q3 (index 2), you = u_e
let rows = questionBreakdownRows(day16, 2, 'u_e', []);
check('one row per player with points for that question', rows.length === 6, `got ${rows.length}`);
check('sorted by points, highest first', rows.map(r => r.name).join(',') === 'hugo,chick,kay,var,tee,kar', rows.map(r => r.name + ':' + r.p).join(' '));
check('answer and points are that question\'s', rows[0].g === 2000000 && rows[0].p === 1000 && rows[5].g === 150000 && rows[5].p === 3.9);
check('your row marked (account id)', rows.filter(r => r.mine).map(r => r.name).join() === 'tee');
// Signed-out player: their own row is matched by the push id kept on the device
rows = questionBreakdownRows(day16, 0, null, ['-P46c']);
check('your row marked (device push id)', rows.filter(r => r.mine).map(r => r.name).join() === 'kar');
// Operator "View as" a name-only player: matched by name key
rows = questionBreakdownRows(day16, 0, 'n_kay', []);
check('your row marked (View as, no account)', rows.filter(r => r.mine).map(r => r.name).join() === 'kay');
// Equal points: ties keep a stable order by name
rows = questionBreakdownRows({ a: { name: 'b', pts: [500], g: [1] }, b: { name: 'a', pts: [500], g: [2] } }, 0, null, []);
check('ties ordered by name', rows.map(r => r.name).join() === 'a,b');
// Missing guesses (old rows had pts but no g)
rows = questionBreakdownRows({ a: { name: 'x', pts: [300, 1], score: 301 } }, 0, null, []);
check('row without saved guesses still listed, answer blank', rows.length === 1 && rows[0].g === null);
check('empty day gives no rows', questionBreakdownRows(undefined, 0, null, []).length === 0);

// Access: only after submitting that day's quiz (dailyLocal[date].done), or the operator
check('submitted player may open', breakdownAllowed({ done: true, pts: [1] }, false) === true);
check('half-finished quiz may not open', breakdownAllowed({ done: false, pts: [1, 2] }, false) === false);
check('never played may not open', breakdownAllowed(undefined, false) === false);
check('operator may always open', breakdownAllowed(undefined, true) === true);

const passed = results.filter(Boolean).length;
console.log(`${passed} of ${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);

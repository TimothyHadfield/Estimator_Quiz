// records-ux-check: the 2026-11-06 Records changes (Tim's UX list).
//
//   node tools/records-ux-check.mjs              (exit 1 on failure)
//   options: --app <path to an index.html>       (an old copy, to watch it fail)
//
// Pulls shortNumber(), fullNumber() and breakdownItemHtml() out of the app and checks:
// long numbers shortened ("13,430,000,000,000 -> 13 tril."), guess and answer shown under every
// question title (not only when tapped), the Q breakdown table without its Answer column,
// Day | All-time | Practice as a switch with ‹ › day arrows (not options in the date list),
// the day's questions fetched before a Q number is tapped, and vertical-only lists.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const ai = argv.indexOf('--app');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = resolve(ai >= 0 ? argv[ai + 1] : join(ROOT, 'Estimator_Quiz', 'index.html'));

const results = [];
const check = (name, ok, detail = '') => { results.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };
const html = readFileSync(APP, 'utf8');
const grab = name => (html.match(new RegExp(`function ${name}\\([\\s\\S]*?\\r?\\n        \\}\\r?\\n`)) || [])[0] || '';

// ---- Number formatting
const fmtSrc = ['fullNumber', 'shortNumber'].map(grab);
check('app defines shortNumber() and fullNumber()', fmtSrc.every(Boolean));
let shortNumber = () => '';
if (fmtSrc.every(Boolean)) ({ shortNumber } = new Function(fmtSrc.join('\n') + '\nreturn { shortNumber };')());
const cases = [
    [13430000000000, '13 tril.'],      // Tim's example
    [2450000000, '2.5 bil.'],
    [24400000000, '24 bil.'],
    [345600000, '346 mil.'],
    [11300000, '11 mil.'],
    [1000000, '1 mil.'],
    [999600000, '1 bil.'],             // rounds up into the next word
    [999999, '999,999'],               // under a million: the full number
    [6678, '6,678'],
    [9148.86, '9,148.86'],
    [0.0035, '0.0035'],
    [-2500000, '-2.5 mil.']
];
cases.forEach(([n, want]) => { const got = shortNumber(n); check(`shortNumber(${n}) = "${want}"`, got === want, `got "${got}"`); });

// ---- Breakdown rows: guess and answer right under the title, in two colours
const rowSrc = ['fullNumber', 'shortNumber', 'breakdownItemHtml'].map(grab);
let rowHtml = '';
if (rowSrc[2]) {
    const stubs = 'function dailyQuestionMax(t){return /percentage/i.test(t)?100:1000}function escapeHtml(s){return String(s)}function questionTitle(){return "NASA Budget"}function missText(){return "2.4× low"}function scoreColor(){return "red"}';
    try {
        const { breakdownItemHtml } = new Function(stubs + rowSrc.join('\n') + '\nreturn { breakdownItemHtml };')();
        rowHtml = breakdownItemHtml(3, "How many dollars is NASA's budget for one year (2026)?", 10000000000, 24400000000, 698, 'k1', '');
    } catch (e) { console.log('  ' + e.message); }
}
const visible = rowHtml.split('class="breakdown-detail"')[0] || '';
check('row shows the guess outside the tap-to-open detail', /Guess[\s\S]*10 bil\./.test(visible), visible.replace(/\s+/g, ' ').slice(0, 160));
check('row shows the answer outside the tap-to-open detail', /Answer[\s\S]*24 bil\./.test(visible));
check('guess and answer in their own colours (bn-guess, bn-answer)', /class="bn-guess"/.test(visible) && /class="bn-answer"/.test(visible) && /\.bn-guess\s*\{[^}]*color/.test(html) && /\.bn-answer\s*\{[^}]*color/.test(html));
check('tapped open: exact numbers when shortened', /24,400,000,000/.test(rowHtml.split('class="breakdown-detail"')[1] || ''));

// ---- Q breakdown table: no Answer column; guesses shortened
const thead = (html.match(/<table class="qb-table">[\s\S]*?<\/thead>/) || [''])[0];
check('Q breakdown table has no Answer column', thead && !/<th>Answer<\/th>/.test(thead), thead.replace(/\s+/g, ' '));
const qb = grab('renderQuestionBreakdown');
check('Q breakdown guesses use shortNumber with the exact number on hover', /shortNumber\(r\.g\)/.test(qb) && /title="\$\{fullNumber\(r\.g\)\}"/.test(qb));

// ---- Q numbers: open at once and look tappable
const avgs = grab('renderDayQuestionAverages');
check('day board fetches its questions before a Q number is tapped', /loadDailyQuestions\(view\)/.test(avgs));
check('breakdown fills from the cache without waiting a turn', /dailyQuestionCache\[date\]/.test(qb));
check('hint line under the Q numbers', /day-q-hint/.test(avgs));
check('Q labels styled as links when they open something', /\.open-ok \.you-num-label\s*\{[^}]*color/.test(html));

// ---- Leaderboard: Day | All-time | Practice switch on top, ‹ › arrows
check('Day | All-time | Practice switch', /id="lb-mode"/.test(html) && /setLeaderboardMode\('average'\)/.test(html) && /setLeaderboardMode\('practice'\)/.test(html));
const rr = grab('renderRecords');
check('All-time / Practice no longer options in the date list', rr && !/<option value="average">/.test(rr) && !/<option value="practice">/.test(rr));
check('‹ › arrows beside the date', /id="lb-prev"[^>]*stepLeaderboardDay\(1\)/.test(html) && /id="lb-next"[^>]*stepLeaderboardDay\(-1\)/.test(html));
check('arrows disabled at the ends', /lb-prev'\)\.disabled/.test(html) && /lb-next'\)\.disabled/.test(html));

// ---- Vertical-only lists
const lock = (html.match(/([^{}]*)\{\s*overflow-x:\s*hidden;\s*overscroll-behavior-x:\s*none;/) || [])[1] || '';
['.daily-archive-list', '#leaderboard', '.qb-scroll', '.you-scroll'].forEach(sel =>
    check(`${sel} can't scroll sideways`, lock.includes(sel)));

const passed = results.filter(Boolean).length;
console.log(`${passed} of ${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);

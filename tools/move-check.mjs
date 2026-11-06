// move-check: the operator's "Move to" in Stats → Players (link a no-account name to an
// account or another name) and the in-site confirm dialog it uses.
//
//   node tools/move-check.mjs [--app <path to an index.html>] [--shots <dir>]
//
// Serves the app locally, stubs every database write (they are recorded, never sent), puts
// in leaderboard rows shaped exactly like dailyScores / records (real public rows from before
// the 2026-11-06 names merge; the account's private copy is made up), and drives the UI in
// WebKit at iPhone size (393×659) and Chrome at laptop size.
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = resolve(opt('--app') || join(ROOT, 'Estimator_Quiz', 'index.html'));
const SHOTS = opt('--shots');
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const PORT = 8847;

// Records every write instead of sending it; push() without a value still makes a key
const STUB = `<script>(function () {
    window.__writes = [];
    const R = firebase.database.Reference.prototype;
    const path = ref => decodeURIComponent(ref.toString().replace(/^https?:\\/\\/[^/]+\\/?/, ''));
    ['set', 'update', 'remove', 'transaction', 'setWithPriority'].forEach(m => {
        R[m] = function (v) { window.__writes.push({ m, path: path(this), v: v === undefined ? null : JSON.parse(JSON.stringify(v)) }); return Promise.resolve(); };
    });
    const push = R.push;
    R.push = function (v) { if (v !== undefined) { window.__writes.push({ m: 'push', path: path(this), v }); } return push.call(this); };
    const once = R.once;
    R.once = function (ev) {
        const p = path(this);
        if (p.startsWith('users/') && window.__accounts) {
            const parts = p.split('/');
            const v = ((window.__accounts[parts[1]] || {})[parts[2]]) || null;
            return Promise.resolve({ val: () => v, exists: () => v !== null });
        }
        return once.apply(this, arguments);
    };
})();</script>`;

const html = readFileSync(APP, 'utf8').replace(/(<script src="[^"]*firebase-auth-compat\.js"><\/script>)/, `$1\n${STUB}`);
const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/Estimator_Quiz/' || u.pathname === '/Estimator_Quiz/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(html);
    }
    res.writeHead(404); res.end();
});
await new Promise((ok, fail) => { server.once('error', fail); server.listen(PORT, '127.0.0.1', ok); });

// Public rows as they were before the merge (dailyScores + records)
const VU = '0msGVwScHBdOyjc9SfrRFsvj4Eh2', NU = 'E6TuaujiAVPcuuraR07drVCs9hE2';
const DAILY = {
    '2026-10-14': {
        '-P3wN7I7h1DueX8O1Lsl': { g: [28, 200000, 48, 300, 60000], name: 'Autumn', pts: [586.9, 935.3, 0, 0, 41], score: 1563.2 },
        '-P3xd2HTtUzRw_mCMeRE': { g: [2, 300, 80, 500, 100000], name: 'Debra', pts: [41.9, 0, 0.2, 0, 97.2], score: 139.3 },
        '-P3xd4X95gDWpJleL8L2': { g: [28.5, 25000, 20000, 35, 10000000], name: 'Varden', pts: [572.5, 81.1, 618.7, 969.1, 510.2], score: 2751.6 },
    },
    '2026-10-15': { ['u_' + VU]: { g: [3000, 200, 300, 35000, 190], name: 'vardenh', pts: [480.9, 0.6, 828.9, 932.1, 995.3], score: 3237.8 } },
    '2026-10-19': { '-P4HmE6zCjRY6cmFa5m4': { g: [184, 1400000, 190, 1250, 100], name: 'Varden', pts: [118.5, 632.8, 88, 840.6, 168.5], score: 1848.4 } },
    '2026-11-03': {
        '-P5ZJND52nNW6GWdvtKN': { g: [40000, 125, 75, 2000000000, 75], name: 'Nathan', pts: [0, 29.2, 940.6, 59, 687.9], score: 1716.7 },
        ['u_' + NU]: { g: [10000, 12, 100, 5000000000, 300], name: 'Nathan Hadfield', pts: [0, 0.1, 773.4, 321, 13.6], score: 1108.1 },
    },
    '2026-11-04': { '-P5c1aiv7SSlWIUs8mRa': { g: [50, 1250, 100000, 350000, 2000000], name: 'Debra', pts: [816.9, 8.2, 725.1, 868.5, 2.4], score: 2421.1 } },
};
const RECORDS = {
    '-P3xgPPtR8SQvaqTGG2z': { category: 'all', date: '2026-10-15T03:53:35.234Z', id: '1792036415234', name: 'Varden', questionsAnswered: 5, score: 704.9 },
    '-P5cE2L2yDtOsc_DPRYY': { answers: [{ g: 50, k: '3959', p: 540 }, { g: 200000, k: '850', p: 0.2 }], category: 'all', date: '2026-11-04T20:24:40.611Z', id: '1793823880611', name: 'Debra Hadfield', questionsAnswered: 10, score: 3517.8 },
    '-P3xeXhogyYjBqNHnGJ5': { category: 'all', date: '2026-10-15T03:45:24.792Z', id: '1792035924792', name: 'Debra', questionsAnswered: 5, score: 1775.5 },
};
// Made-up private copies: vardenh's account already has 10-14 (synced from his phone), not 10-19
const ACCOUNTS = { [VU]: { daily: { '2026-10-14': { score: 2751.6, max: 5000 } }, tests: { '-t1': { mode: 'estimation', score: 2160.8, n: 5, date: 1792047589318 } } }, [NU]: {} };

let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire(join(homedir(), '.claude', 'tools', 'package.json'))('playwright'); }

const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };

async function setup(page) {
    await page.goto(`http://localhost:${PORT}/Estimator_Quiz/`);
    await page.waitForFunction(() => typeof questions !== 'undefined' && questions.length > 0, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { setOperatorMode(true); switchTab('stats'); renderPlayersList(); });
    // Let the list's own load of the live records finish first, so it can't replace the fixture
    await page.waitForFunction(() => playersAllRecords !== null, null, { timeout: 30000 });
    await page.evaluate(({ DAILY, RECORDS, ACCOUNTS }) => {
        window.__accounts = ACCOUNTS;
        dailyScoresAll = DAILY;
        playersAllRecords = listFromSnapshot(JSON.parse(JSON.stringify(RECORDS)));
        playersLoading = true;   // keep the fixture (no reload of live records)
        document.querySelectorAll('.report-modal.show').forEach(m => m.classList.remove('show'));
        renderPlayersList();
        document.getElementById('players-list').scrollIntoView({ block: 'start' });
        window.__writes.length = 0;
    }, { DAILY, RECORDS, ACCOUNTS });
}

const rowFor = (page, name) => page.locator('#players-list > li', { has: page.locator('.player-name', { hasText: new RegExp(`^${name}$`) }) });
const writes = page => page.evaluate(() => window.__writes);
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

const browser = await pw.webkit.launch({ headless: true });
let failedEarly = false;
try {
    const ctx = await browser.newContext({ ...pw.devices['iPhone 15'], viewport: { width: 393, height: 659 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await setup(page);

    // 1. Varden (no account) -> vardenh (account)
    const varden = rowFor(page, 'Varden');
    await varden.locator('.player-row').click();
    const move = varden.locator('.player-move');
    check('a no-account player shows "Move to"', await move.isVisible().catch(() => false));
    if (!(await move.isVisible().catch(() => false))) { failedEarly = true; throw new Error('no Move to row'); }
    check('an account player has no "Move to"', await rowFor(page, 'vardenh').locator('.player-row').click().then(() => rowFor(page, 'vardenh').locator('.player-move').count()) === 0);
    await move.locator('select').selectOption('u_' + VU);
    await move.locator('button').click();
    await page.waitForSelector('#ask-dialog.show', { timeout: 5000 });
    const text = await page.locator('#ask-dialog').innerText();
    check('confirm is the in-site dialog with counts', /Varden\s*→\s*vardenh \(account\)/.test(text) && /2 dailies and 1 practice test/.test(text), text.replace(/\s+/g, ' '));
    const box = await page.locator('#ask-dialog .report-modal-content').boundingBox();
    check('dialog fits the phone screen', box && box.x >= 0 && box.x + box.width <= 393 && box.y >= 0 && box.y + box.height <= 659, JSON.stringify(box));
    if (SHOTS) await page.screenshot({ path: join(SHOTS, 'move-confirm-phone.png') });
    check('nothing written before confirming', (await writes(page)).length === 0);
    await page.click('#ask-dialog-ok');
    await page.waitForTimeout(300);
    let w = await writes(page);
    const up = (w.find(x => x.m === 'update' && x.path === '') || {}).v || {};
    const keys = Object.keys(up).sort();
    check('one root update', w.filter(x => x.m === 'update').length === 1, JSON.stringify(w.map(x => x.m + ' ' + x.path)));
    check('daily rows moved onto the account row', up[`dailyScores/2026-10-14/u_${VU}`]?.name === 'vardenh' && up['dailyScores/2026-10-14/-P3xd4X95gDWpJleL8L2'] === null
        && up[`dailyScores/2026-10-19/u_${VU}`]?.score === 1848.4 && up['dailyScores/2026-10-19/-P4HmE6zCjRY6cmFa5m4'] === null);
    check('moved row keeps points and guesses', JSON.stringify(up[`dailyScores/2026-10-19/u_${VU}`]?.g) === JSON.stringify([184, 1400000, 190, 1250, 100]));
    check('account copy added only for the day it lacked', !up[`users/${VU}/daily/2026-10-14`] && up[`users/${VU}/daily/2026-10-19`]?.score === 1848.4
        && up[`users/${VU}/daily/2026-10-19`]?.max === 5000 && up[`users/${VU}/daily/2026-10-19`]?.guesses?.length === 5);
    check('practice record gets the uid and name', up['records/-P3xgPPtR8SQvaqTGG2z/uid'] === VU && up['records/-P3xgPPtR8SQvaqTGG2z/name'] === 'vardenh');
    const tests = keys.filter(k => k.startsWith(`users/${VU}/tests/`));
    check('practice test added to the account', tests.length === 1 && up[tests[0]].score === 704.9 && up[tests[0]].n === 5 && up[tests[0]].date === Date.parse('2026-10-15T03:53:35.234Z'));
    check('nothing else written', keys.length === 8, keys.join(' '));
    check('dialog closed', !(await page.locator('#ask-dialog.show').count()));

    // 2. Nathan -> Nathan Hadfield: both played Nov. 3, account's row kept; Cancel writes nothing
    await setup(page);
    const nathan = rowFor(page, 'Nathan');
    await nathan.locator('.player-row').click();
    await nathan.locator('.player-move select').selectOption('u_' + NU);
    await nathan.locator('.player-move button').click();
    await page.waitForSelector('#ask-dialog.show');
    const t2 = await page.locator('#ask-dialog').innerText();
    check('a day both played is named in the dialog', /Both played Nov\. 3: keeps Nathan Hadfield's score and removes Nathan's/.test(t2), t2.replace(/\s+/g, ' '));
    await page.locator('#ask-dialog .btn-secondary').click();
    await page.waitForTimeout(200);
    check('Cancel writes nothing', (await writes(page)).length === 0);
    await nathan.locator('.player-move button').click();
    await page.waitForSelector('#ask-dialog.show');
    await page.mouse.click(5, 5);   // outside the dialog
    await page.waitForTimeout(200);
    check('a tap outside cancels', !(await page.locator('#ask-dialog.show').count()) && (await writes(page)).length === 0);
    await nathan.locator('.player-move button').click();
    await page.click('#ask-dialog-ok');
    await page.waitForTimeout(300);
    w = await writes(page);
    const up2 = (w.find(x => x.m === 'update') || {}).v || {};
    check('duplicate day: only the moved row is removed', JSON.stringify(up2) === JSON.stringify({ 'dailyScores/2026-11-03/-P5ZJND52nNW6GWdvtKN': null }), JSON.stringify(up2));

    // 3. Debra (no account) -> Debra Hadfield (no account): names change in place
    await setup(page);
    const debra = rowFor(page, 'Debra');
    await debra.locator('.player-row').click();
    await debra.locator('.player-move select').selectOption('n_debra hadfield');
    if (SHOTS) await page.screenshot({ path: join(SHOTS, 'move-row-phone.png') });
    await debra.locator('.player-move button').click();
    await page.click('#ask-dialog-ok');
    await page.waitForTimeout(300);
    const up3 = ((await writes(page)).find(x => x.m === 'update') || {}).v || {};
    check('rename to another name: rows renamed, nothing removed', up3['dailyScores/2026-10-14/-P3xd2HTtUzRw_mCMeRE/name'] === 'Debra Hadfield'
        && up3['dailyScores/2026-11-04/-P5c1aiv7SSlWIUs8mRa/name'] === 'Debra Hadfield' && up3['records/-P3xeXhogyYjBqNHnGJ5/name'] === 'Debra Hadfield'
        && Object.keys(up3).length === 3 && !Object.values(up3).includes(null), JSON.stringify(up3));

    // 4. A new name typed in
    await setup(page);
    const autumn = rowFor(page, 'Autumn');
    await autumn.locator('.player-row').click();
    await autumn.locator('.player-move select').selectOption('new');
    await autumn.locator('.player-move-name').fill('Autumn Dossey');
    await autumn.locator('.player-move button').click();
    await page.click('#ask-dialog-ok');
    await page.waitForTimeout(300);
    const up4 = ((await writes(page)).find(x => x.m === 'update') || {}).v || {};
    check('new name typed in', JSON.stringify(up4) === JSON.stringify({ 'dailyScores/2026-10-14/-P3wN7I7h1DueX8O1Lsl/name': 'Autumn Dossey' }), JSON.stringify(up4));

    check('no horizontal overflow (phone)', (await overflow(page)) <= 0, String(await overflow(page)));
    check('no page errors (phone)', errors.length === 0, errors.join(' | '));
} catch (e) {
    if (!failedEarly) check('run', false, e.message);
} finally {
    await browser.close();
}

// Laptop width, Chrome
if (!failedEarly) {
    const chrome = await pw.chromium.launch({ headless: true, channel: 'chrome' }).catch(() => pw.chromium.launch({ headless: true }));
    try {
        const page = await (await chrome.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await setup(page);
        const varden = rowFor(page, 'Varden');
        await varden.locator('.player-row').click();
        await varden.locator('.player-move select').selectOption('u_' + VU);
        if (SHOTS) await page.screenshot({ path: join(SHOTS, 'move-row-laptop.png') });
        await varden.locator('.player-move button').click();
        await page.waitForSelector('#ask-dialog.show');
        if (SHOTS) await page.screenshot({ path: join(SHOTS, 'move-confirm-laptop.png') });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        check('Escape cancels (laptop)', !(await page.locator('#ask-dialog.show').count()) && (await writes(page)).length === 0);
        check('no horizontal overflow (laptop)', (await overflow(page)) <= 0);
        check('no page errors (laptop)', errors.length === 0, errors.join(' | '));
    } finally { await chrome.close(); }
}

server.close();
const passed = results.filter(Boolean).length;
console.log(`${passed} of ${results.length} passed`);
process.exitCode = passed === results.length ? 0 : 1;

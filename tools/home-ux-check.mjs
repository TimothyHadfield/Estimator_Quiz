// Home + pop-up checks (2026-11-06): in-site "Leave the test?" dialog instead of the browser's confirm,
// the home note box (one note, dismissible, nothing when none applies), the smaller practice box,
// home fitting 393x659 with and without a note, and no dart-board emoji.
//   node tools/home-ux-check.mjs [--app path/to/index.html] [--port 8796]
// Serves the app like Pages with every database write stubbed (tools/fresh-check.mjs --serve).
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +opt('port', 8796);
const APP = resolve(opt('app', join(ROOT, 'Estimator_Quiz', 'index.html')));
const URL_ = `http://localhost:${PORT}/Estimator_Quiz/`;

const server = spawn(process.execPath, [join(ROOT, 'tools', 'fresh-check.mjs'), '--serve', '--port', String(PORT), '--app', APP], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((ok, fail) => { server.stdout.once('data', ok); server.once('exit', () => fail(new Error('server did not start'))); });

let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire(join(homedir(), '.claude', 'tools', 'package.json'))('playwright'); }

const results = [];
const check = (name, ok, detail = '') => { results.push({ ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };
const browser = await pw.webkit.launch({ headless: true });
try {
    const context = await browser.newContext({ ...pw.devices['iPhone 15'], viewport: { width: 393, height: 659 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => { if (!/firebaseio\.com\/\.lp\?disconn/.test(e.message)) errors.push(e.message); });
    let nativeDialogs = 0;
    page.on('dialog', d => { nativeDialogs++; d.dismiss().catch(() => {}); });
    const ready = async () => {
        await page.waitForFunction(() => typeof accountReady !== 'undefined' && accountReady
            && typeof questions !== 'undefined' && questions.length > 0, null, { timeout: 20000 });
        await page.waitForTimeout(500);
        await page.evaluate(() => document.querySelectorAll('#score-notice.show, #report-modal.show').forEach(m => m.classList.remove('show')));
    };
    const askShown = () => page.evaluate(() => {
        const d = document.getElementById('ask-dialog');
        return !!(d && d.classList.contains('show'));
    });
    const state = () => page.evaluate(() => ({
        active: testState.isActive,
        testTab: document.getElementById('test-tab').classList.contains('active'),
        recordsTab: document.getElementById('records-tab').classList.contains('active')
    }));
    const home = () => page.evaluate(() => {
        const note = document.getElementById('home-note');
        const warn = document.getElementById('signin-warning');
        const opt = document.querySelector('.test-mode-option');
        return {
            note: note && !note.hidden && note.offsetHeight > 0 ? document.getElementById('home-note-text').textContent : null,
            noteH: note ? note.offsetHeight : -1,
            warn: !!warn && warn.style.display !== 'none',
            sh: document.documentElement.scrollHeight,
            ih: innerHeight,
            optH: opt ? Math.round(opt.getBoundingClientRect().height) : -1,
            dart: document.body.innerText.includes('\u{1F3AF}')
        };
    });

    // 1. Signed-out home: one note (make an account), the amber line folded into it, fits 659
    await page.goto(URL_);
    await page.evaluate(() => localStorage.removeItem('estimatorQuizNotesDismissed'));
    await page.reload();
    await ready();
    let h = await home();
    check('signed out: home note asks to make an account', /account/i.test(h.note || ''), `note "${h.note}"`);
    check('signed out: amber bottom line not shown twice while the note says it', h.note && !h.warn, `amber line ${h.warn}`);
    check('home fits 393x659 with the note showing', h.sh <= h.ih, `scrollHeight ${h.sh} / ${h.ih}`);
    check('practice box is small (under 100px tall)', h.optH > 0 && h.optH < 100, `${h.optH}px`);
    check('no dart-board emoji on home', !h.dart);

    // 2. Dismiss → the next note; dismissal survives a reload
    const first = h.note;
    await page.evaluate(() => dismissHomeNote()).catch(() => {});
    h = await home();
    check('dismissing shows the next note (one at a time)', !!h.note && h.note !== first, `now "${h.note}"`);
    check('after dismissing the sign-in note, the amber line is back', h.warn);
    await page.reload();
    await ready();
    h = await home();
    check('dismissal remembered after reload', h.note !== first, `note "${h.note}"`);

    // 3. Nothing applies → no box and no space
    await page.evaluate(() => {
        const all = {};
        (typeof homeNoteCandidates === 'function' ? homeNoteCandidates() : []).forEach(n => { all[n.id] = 1; });
        localStorage.setItem('estimatorQuizNotesDismissed', JSON.stringify(all));
    });
    await page.reload();
    await ready();
    h = await home();
    check('no note applies: box takes no space', h.note === null && h.noteH === 0, `note "${h.note}", height ${h.noteH}`);
    check('home fits 393x659 without a note', h.sh <= h.ih, `scrollHeight ${h.sh}`);

    // 4. Practice test → Records: in-site dialog, no browser confirm
    await page.locator('.test-mode-option').first().click();
    await page.fill('#player-name', 'home check');
    await page.locator('.test-length-option', { hasText: '5' }).first().click();
    await page.locator('#test-intro .btn-primary').click();
    await page.waitForSelector('#test-question-container', { state: 'visible' });
    await page.locator('.tab-btn', { hasText: 'Records' }).click();
    await page.waitForTimeout(300);
    let shown = await askShown();
    check('leaving a practice test opens the in-site dialog', shown);
    check('no browser confirm/alert used', nativeDialogs === 0, `${nativeDialogs} native dialogs`);
    let s = await state();
    check('tabs do not switch while the dialog is open', s.testTab && !s.recordsTab && s.active);
    if (shown) {
        const title = await page.textContent('#ask-dialog-title');
        check('dialog says "Leave the test?"', /Leave the test\?/.test(title), title);
        await page.click('#ask-dialog-cancel');
        await page.waitForTimeout(200);
        s = await state();
        check('Stay keeps the test going on the Test tab', !(await askShown()) && s.active && s.testTab);
        await page.locator('.tab-btn', { hasText: 'Records' }).click();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        s = await state();
        check('Escape = Stay', !(await askShown()) && s.active && s.testTab);
        await page.locator('.tab-btn', { hasText: 'Records' }).click();
        await page.keyboard.press('Enter');   // OK button has focus
        await page.waitForTimeout(300);
        s = await state();
        check('Enter = Leave: test ended, Records open', !(await askShown()) && !s.active && s.recordsTab);
    }
    check('still no browser dialogs at the end', nativeDialogs === 0, `${nativeDialogs}`);
    const writes = await page.evaluate(() => window.__writes ? window.__writes.list.length : 0);
    console.log(`info  database writes caught by the stub: ${writes}`);
    check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

    // 5. Laptop: home fits, note shows
    const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p2 = await desk.newPage();
    const errors2 = [];
    p2.on('pageerror', e => errors2.push(e.message));
    await p2.goto(URL_);
    await p2.waitForFunction(() => typeof accountReady !== 'undefined' && accountReady, null, { timeout: 20000 });
    await p2.waitForTimeout(500);
    const d = await p2.evaluate(() => ({
        sh: document.documentElement.scrollHeight, ih: innerHeight, sw: document.documentElement.scrollWidth, iw: innerWidth,
        note: (document.getElementById('home-note') || {}).hidden === false
    }));
    check('laptop 1440x900: note shows, no page scroll, no sideways overflow', d.note && d.sh <= d.ih && d.sw <= d.iw, JSON.stringify(d));
    check('laptop: no page errors', errors2.length === 0, errors2.slice(0, 3).join(' | '));
    await desk.close();
} finally {
    await browser.close();
    server.kill();
}
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);

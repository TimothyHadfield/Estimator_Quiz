// daily-check: practice-stat refusals stay quiet, a half-finished daily resumes after a reload,
// and a page left open past midnight moves to the new day without crashing.
//
//   node tools/daily-check.mjs                 (WebKit, iPhone 393x659; exit 1 on failure)
//   options: --port 8795   --app <path to an index.html>  (an old copy, to watch it fail)
//
// Serves the app through tools/fresh-check.mjs --serve, so every database write is a counted no-op
// (nothing reaches the LIVE database; reads still work). ?denystats makes question-stat updates fail
// with PERMISSION_DENIED, like two players answering the same question at once.
// The "date" is moved with the app's own test override (localStorage estimatorQuizTestDate).
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +opt('port', 8795);
const APP = resolve(opt('app', join(ROOT, 'Estimator_Quiz', 'index.html')));
const URL_ = `http://localhost:${PORT}/Estimator_Quiz/`;
// A scheduled day (questions exist in daily/<date>) and the day after it
const DAY = '2026-10-17', NEXT = '2026-10-18';

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
    // Log every notification the app shows (before the app's own script defines showNotification)
    await context.addInitScript(() => {
        window.__notes = [];
        new MutationObserver(() => {
            const n = document.getElementById('notification');
            if (n && n.classList.contains('show')) window.__notes.push(n.className + ': ' + n.textContent);
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => { if (!/firebaseio\.com\/\.lp\?disconn/.test(e.message)) errors.push(e.message); });
    let wsWrites = 0, wsFrames = 0;
    page.on('websocket', ws => ws.on('framesent', f => {
        wsFrames++;
        if (/"a":"(p|m|o|om|oc)"/.test(String(f.payload))) wsWrites++;   // RTDB write actions
    }));
    const ready = async () => {
        await page.waitForFunction(() => typeof accountReady !== 'undefined' && accountReady
            && typeof questions !== 'undefined' && questions.length > 0, null, { timeout: 20000 });
        // The "Scoring updated" notice can pop up and swallow taps; it isn't what's tested here
        await page.evaluate(() => document.querySelectorAll('.report-modal.show').forEach(m => m.classList.remove('show')));
    };
    const answer = (value) => page.evaluate(v => {
        document.getElementById('test-answer').value = String(v);
        submitAnswer();
    }, value);
    const card = () => page.evaluate(() => ({
        day: document.getElementById('daily-card-number').textContent,
        sub: document.getElementById('daily-card-sub').textContent,
        btn: document.getElementById('daily-card-btn').textContent
    }));

    // 1. Practice answer whose question-stat write is refused: no error shown
    await page.goto(URL_ + '?denystats');
    await ready();
    await page.evaluate(() => { window.__notes = []; });
    await page.locator('.test-mode-option').first().click();
    await page.fill('#player-name', 'daily check');
    await page.locator('.test-length-option', { hasText: '5' }).first().click();
    await page.locator('#test-intro .btn-primary').click();
    await page.waitForSelector('#test-question-container', { state: 'visible' });
    await answer(1000);
    await page.waitForTimeout(1500);
    const s1 = await page.evaluate(() => ({
        writes: window.__writes.list.filter(w => /^update \/questions\//.test(w)).length,
        notes: window.__notes.filter(n => /error/.test(n)),
        result: getComputedStyle(document.getElementById('result-display')).display !== 'none'
    }));
    check('practice stat write was attempted and refused', s1.writes === 1, `question-stat updates ${s1.writes}`);
    check('refused stat write shows no error to the player', s1.notes.length === 0, s1.notes.join(' | '));
    check('the answer still scored and showed its result', s1.result);

    // 2. Half-finished daily, then a reload: it continues at question 3 with the same 2 answers
    await page.goto(URL_);
    await page.evaluate(d => { localStorage.setItem('estimatorQuizTestDate', d); localStorage.removeItem('estimatorQuizDaily'); }, DAY);
    await page.reload();
    await ready();
    await page.evaluate(() => openDaily());
    await page.waitForSelector('#daily-intro', { state: 'visible' });
    await page.fill('#daily-player-name', 'daily check');
    await page.evaluate(() => startDaily());
    await page.waitForSelector('#test-question-container', { state: 'visible' });
    const firstQs = [];
    for (let i = 0; i < 2; i++) {
        firstQs.push(await page.evaluate(() => testState.shuffledQuestions[testState.currentIndex].text));
        await answer(5000 * (i + 1));
        await page.evaluate(() => nextQuestion());
    }
    const q3 = await page.evaluate(() => testState.shuffledQuestions[testState.currentIndex].text);
    const before = await page.evaluate(d => JSON.parse(localStorage.getItem('estimatorQuizDaily'))[d], DAY);
    await page.reload();
    await ready();
    const c2 = await card();
    check('after a reload the home card offers to continue', c2.btn === 'Continue' && /2 of 5 answered/.test(c2.sub), `${c2.day} · ${c2.sub} · ${c2.btn}`);
    await page.locator('#daily-card-btn').click();
    await page.waitForSelector('#test-question-container', { state: 'visible' });
    const resumed = await page.evaluate(() => ({
        index: testState.currentIndex, text: testState.shuffledQuestions[testState.currentIndex].text,
        guesses: testState.answers.map(a => a.userAnswer), score: testState.totalScore
    }));
    check('continues at question 3 (same question as before the reload)', resumed.index === 2 && resumed.text === q3, `index ${resumed.index}`);
    check('earlier answers and score kept', JSON.stringify(resumed.guesses) === JSON.stringify(before.guesses)
        && Math.abs(resumed.score - before.pts.reduce((a, b) => a + b, 0)) < 1e-9, `guesses ${resumed.guesses.join(', ')}`);

    // 3. Midnight passes during the daily: it finishes on the day it started, then home shows the new day
    await answer(30000);
    await page.evaluate(() => nextQuestion());
    await page.evaluate(d => localStorage.setItem('estimatorQuizTestDate', d), NEXT);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    const stillQ = await page.evaluate(() => testState.isActive && document.getElementById('test-question-container').style.display === 'block');
    check('coming back to the page mid-quiz after midnight leaves the question alone', stillQ);
    for (let i = 0; i < 2; i++) {
        await answer(40000);
        await page.evaluate(() => nextQuestion());
    }
    await page.waitForSelector('#final-results', { state: 'visible' });
    const fin = await page.evaluate(([d, n]) => ({
        title: document.getElementById('final-title').textContent,
        done: !!(JSON.parse(localStorage.getItem('estimatorQuizDaily'))[d] || {}).done,
        nextTouched: !!JSON.parse(localStorage.getItem('estimatorQuizDaily'))[n],
        board: window.__writes.list.filter(w => w.startsWith('set /dailyScores/')).join(', ')
    }), [DAY, NEXT]);
    check('daily started before midnight finishes under its own day', fin.done && !fin.nextTouched && /Oct\. 17, 2026/.test(fin.title)
        && fin.board.includes('/dailyScores/' + DAY + '/'), `${fin.title}; board write ${fin.board}`);
    await page.evaluate(() => leaveDaily());
    const c3 = await card();
    check('back home, the card shows the new day', /Oct\. 18, 2026/.test(c3.day) && c3.btn === 'Play', `${c3.day} · ${c3.btn}`);

    // 4. Page left on home over midnight: coming back to it shows the new day (card and leaderboard)
    await page.evaluate(d => localStorage.setItem('estimatorQuizTestDate', d), DAY);
    await page.reload();
    await ready();
    const c4a = await card();
    await page.evaluate(d => localStorage.setItem('estimatorQuizTestDate', d), NEXT);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(300);
    const c4 = await card();
    const board = await page.evaluate(() => {
        const s = document.getElementById('leaderboard-view');
        return s.value + ' / ' + (s.selectedOptions[0] ? s.selectedOptions[0].textContent : '');
    });
    check('home left open past midnight shows the new day on return', /Oct\. 17/.test(c4a.day) && /Oct\. 18, 2026/.test(c4.day), `${c4a.day} -> ${c4.day}`);
    check('leaderboard moves to the new today too', board.startsWith(NEXT) && /Today/.test(board), board);

    check('no database writes sent (all stubbed)', wsWrites === 0 && wsFrames > 0, `write frames on the socket ${wsWrites} of ${wsFrames} sent`);
    check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
    await browser.close();
    server.kill();
}
const failed = results.filter(r => !r.ok).length;
console.log(failed ? `\n${failed} of ${results.length} checks FAILED` : `\nAll ${results.length} checks passed`);
process.exit(failed ? 1 : 0);

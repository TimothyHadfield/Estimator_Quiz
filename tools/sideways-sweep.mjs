// Sideways-scroll sweep: every screen at 393 and 320 wide (WebKit), lists any element that can
// scroll or drag sideways (scrollWidth > clientWidth with overflow-x not hidden/clip) and page overflow.
// node tools/sideways-sweep.mjs [app.html] [outdir for screenshots] [verdana]   (exit 1 on any problem)
// No server needed: the page is served from the file by Playwright; database writes are stubbed.
// Days played on this device are faked (dailyLocal only) so results, Past quizzes and You have long numbers.
// Added 2026-11-06 for Tim: "Horizontal scrolling should pretty much never be a thing".
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { homedir } from 'node:os';
const pw = createRequire(join(homedir(), '.claude', 'tools', 'package.json'))('playwright');
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const argv = process.argv.slice(2);
const app = argv[0] || resolve(dirname(fileURLToPath(import.meta.url)), '..', 'Estimator_Quiz', 'index.html');
const shots = argv[1] || '', font = argv[2] || '';
// iPhone has no Segoe UI or Tahoma: the app's font stack lands on Verdana there (much wider)
const FONT = font === 'verdana' ? '<style>*{font-family:Verdana,sans-serif!important}</style>' : '';
const STUB = `<script>(function(){var R=firebase.database.Reference.prototype;['set','update','remove','setWithPriority','setPriority'].forEach(function(m){R[m]=function(){return Promise.resolve();};});R.transaction=function(){return Promise.resolve({committed:false});};var push=R.push;R.push=function(v){var r=push.call(this);if(v===undefined)return r;r.then=function(a,b){return Promise.resolve().then(a,b)};r.catch=function(){return Promise.resolve()};return r;};})();</script>`;
const html = readFileSync(app, 'utf8').replace('firebase-auth-compat.js"></script>', 'firebase-auth-compat.js"></script>\n' + STUB).replace('</head>', FONT + '</head>');
const browser = await pw.webkit.launch();
let bad = 0;
for (const width of [393, 320]) {
    const ctx = await browser.newContext({ ...pw.devices['iPhone 15'], viewport: { width, height: width === 393 ? 659 : 548 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('http://localhost:8823/Estimator_Quiz/', r => r.fulfill({ body: html, contentType: 'text/html' }));
    await page.goto('http://localhost:8823/Estimator_Quiz/');
    await page.waitForFunction(() => typeof dailyScoresAll === 'object' && Object.keys(dailyScoresAll).length > 3 && questions.length > 1000, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    // Played days with long guesses (real questions of the last 12 days)
    const big = await page.evaluate(async () => {
        const dates = Object.keys(dailyScoresAll).filter(x => /^\d{4}-/.test(x) && x < dailyToday()).sort().reverse().slice(0, 12);
        let bigDate = null, bigQ = 0, bigA = 0;
        for (const d of dates) {
            const list = await loadDailyQuestions(d);
            const guesses = list.map((q, i) => i === 0 ? 13430000000000 : Math.round(q.answer * 1.37 * 100) / 100);
            const pts = list.map((q, i) => [12.3, 870.4, 455, 999.9, 230][i]);
            dailyLocal[d] = { done: true, name: 'claude-test', pts, guesses, maxes: [], score: pts.reduce((s, p) => s + p, 0), max: 5000, id: 'zz' + d };
            list.forEach((q, i) => { if (q.answer > bigA) { bigA = q.answer; bigDate = d; bigQ = i; } });
        }
        document.querySelectorAll('.report-modal.show').forEach(e => e.classList.remove('show'));
        return { bigDate, bigQ, bigA };
    });
    const scan = async (label) => {
        await page.waitForTimeout(400);
        const r = await page.evaluate(() => {
            const out = [];
            const de = document.documentElement;
            if (de.scrollWidth > window.innerWidth + 1) out.push(`PAGE scrollWidth ${de.scrollWidth} > ${window.innerWidth}`);
            document.querySelectorAll('body *').forEach(el => {
                if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
                const cs = getComputedStyle(el);
                if (el.scrollWidth > el.clientWidth + 1 && (!['hidden', 'clip', 'visible'].includes(cs.overflowX) || el.matches('#leaderboard, .leaderboard, .you-scroll, .questions-list, .daily-archive-list, .daily-board, .account-list, .qb-scroll'))) {
                    out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} overflow-x:${cs.overflowX} ${el.scrollWidth}>${el.clientWidth}`);
                }
                // Visible content poking past the screen edge
                const b = el.getBoundingClientRect();
                let clipped = false;
                for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
                    const o = getComputedStyle(p).overflowX;
                    if (o === 'hidden' || o === 'clip') { const pb = p.getBoundingClientRect(); if (pb.right <= window.innerWidth + 1) { clipped = true; break; } }
                }
                if (!clipped && b.width && b.right > window.innerWidth + 1 && cs.position !== 'fixed') out.push(`EDGE ${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).trim().split(/\s+/).join('.')} right ${Math.round(b.right)}`);
            });
            return out;
        });
        // drop children of an already listed EDGE parent? keep it short
        const uniq = [...new Set(r)].slice(0, 8);
        if (uniq.length) bad += uniq.length;
        console.log(`${width}  ${label.padEnd(28)} ${uniq.length ? 'FAIL ' + uniq.join(' | ') : 'ok'}`);
        if (shots) await page.screenshot({ path: join(shots, `sweep-${width}-${label.replace(/\W+/g, '_')}.png`) });
    };
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const clearModal = () => ev(() => document.querySelectorAll('.report-modal.show').forEach(e => e.classList.remove('show')));

    await scan('home');
    await ev(() => openDailyArchive()); await scan('past quizzes');
    await ev(d => { dailyFrom = 'archive'; showDailyResults(d); document.querySelectorAll('#score-breakdown .breakdown-item').forEach(e => e.classList.add('open')); }, big.bigDate);
    await page.waitForTimeout(800);
    await ev(() => document.querySelectorAll('#score-breakdown .breakdown-item').forEach(e => e.classList.add('open')));
    await scan('daily results (open rows)');
    await ev(() => resetTest());
    await ev(() => { selectTestMode('estimation', document.querySelector('.test-mode-option') || document.body); }).catch(() => {});
    await scan('practice intro');
    await ev(() => resetTest());
    await ev(() => { const d = dailyToday(); delete dailyLocal[d]; openDaily(d, 'home'); });
    await scan('daily intro');
    await ev(() => resetTest());
    await ev(() => switchTab('info')); await scan('info');
    await ev(d => { switchTab('records'); showRecordsView('board'); if (typeof setLeaderboardView === 'function') setLeaderboardView(d); else document.getElementById('leaderboard-view').value = d; leaderboardFocus = null; renderRecords(); }, big.bigDate);
    await clearModal();
    await scan('records day');
    await ev(() => { const li = document.querySelector('#leaderboard .leaderboard-item.tappable'); if (li) li.click(); });
    await page.waitForTimeout(800);
    await ev(() => document.querySelectorAll('#leaderboard .breakdown-item').forEach(e => e.classList.add('open')));
    await scan('records row detail');
    await ev(a => openQuestionBreakdown(a.bigDate, a.bigQ), big); await page.waitForTimeout(800);
    await scan('Q breakdown (biggest answer)');
    await ev(a => openQuestionBreakdown(a.bigDate, 0), big); await page.waitForTimeout(800);
    await scan('Q breakdown Q1');
    await ev(() => closeQuestionBreakdown());
    await ev(() => { if (typeof setLeaderboardMode === 'function') setLeaderboardMode('average'); else { document.getElementById('leaderboard-view').value = 'average'; renderRecords(); } });
    await scan('records all-time');
    await ev(() => { if (typeof setLeaderboardMode === 'function') setLeaderboardMode('practice'); else { document.getElementById('leaderboard-view').value = 'practice'; renderRecords(); } });
    await scan('records practice');
    await ev(() => { const li = document.querySelector('#leaderboard .leaderboard-item.tappable'); if (li) li.click(); document.querySelectorAll('#leaderboard .breakdown-item').forEach(e => e.classList.add('open')); });
    await scan('records practice detail');
    await ev(() => showRecordsView('you')); await page.waitForTimeout(1500);
    await scan('you');
    await ev(d => toggleYouDetail('day', d), big.bigDate); await page.waitForTimeout(500);
    await ev(() => document.querySelectorAll('#you-view .breakdown-item').forEach(e => e.classList.add('open')));
    await scan('you day detail');
    await ev(() => { youOpen = null; toggleYouDetail('bin', String(tendencyBin({ g: 1.37, a: 1 }))); }); await page.waitForTimeout(300);
    await scan('you bin detail');
    await ev(() => { showRecordsView('board'); switchTab('test'); openAccountModal(); }); await scan('account panel');
    await ev(() => closeAccountModal());
    // Operator screens (forced, writes stubbed)
    await ev(() => { setOperatorMode(true); switchTab('questions'); }); await page.waitForTimeout(1500); await scan('op questions');
    await ev(() => { if (typeof showOpQuestionsView === 'function') showOpQuestionsView('schedule'); }); await page.waitForTimeout(1500); await scan('op schedule');
    await ev(() => switchTab('stats')); await page.waitForTimeout(2500); await scan('op stats');
    await ev(() => switchTab('types')); await page.waitForTimeout(800); await scan('op types');
    console.log(`${width}  console errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
    await ctx.close();
}
console.log(bad ? `${bad} sideways problems` : 'no sideways problems');
await browser.close();
process.exit(bad ? 1 : 0);




// fresh-check: proves a new build reaches a phone that has the old page cached, without a hard refresh.
//
//   node tools/fresh-check.mjs                 run the test (WebKit, iPhone size 393x659), exit 1 on failure
//   node tools/fresh-check.mjs --serve         only serve the app like GitHub Pages (for phone-view by hand)
//   options: --port 8791   --app <path to an index.html>  (default Estimator_Quiz/index.html; use an old copy
//            to watch the test fail)
//
// The server mimics GitHub Pages: Cache-Control max-age=600, Last-Modified = the "deploy time", an ETag,
// 304s. Every page it serves gets a small script after the Firebase SDK that turns all database writes
// (set/update/remove/push with a value/transaction) into counted no-ops, so nothing reaches the LIVE
// database (reads still work, so a practice test can start). Add ?denystats to the page address to make
// question-stat updates fail with PERMISSION_DENIED instead. The test also counts write frames on the
// Firebase websocket as a second check.
//
// Steps: load the page, "deploy" (new deploy time + changed "Past quizzes" text), open the page again in
// the same browser (it gets the stale cached copy) -> the new text must appear within a few seconds.
// Then start a practice test, deploy again, and check the page does NOT reload while a question is shown;
// going back home must then pick up the new build.
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = resolve(opt('app', join(ROOT, 'Estimator_Quiz', 'index.html')));
const PORT = +opt('port', 8791);
const SERVE_ONLY = argv.includes('--serve');

const STUB = `<script>
(function () {
    // fresh-check: every database write becomes a counted no-op (nothing reaches the live database)
    window.__writes = { count: 0, list: [] };
    var R = firebase.database.Reference.prototype;
    var denyStats = /[?&]denystats\\b/i.test(location.search);
    function note(op, ref) { window.__writes.count++; window.__writes.list.push(op + ' ' + String(ref).replace(/^https?:\\/\\/[^/]+/, '')); }
    ['set', 'update', 'remove', 'setWithPriority', 'setPriority'].forEach(function (m) {
        if (!R[m]) return;
        R[m] = function () {
            note(m, this);
            if (denyStats && m === 'update' && /\\/questions\\//.test(String(this))) {
                var e = new Error('PERMISSION_DENIED: Permission denied'); e.code = 'PERMISSION_DENIED';
                return Promise.reject(e);
            }
            return Promise.resolve();
        };
    });
    R.transaction = function () { note('transaction', this); return Promise.resolve({ committed: false, snapshot: null }); };
    var push = R.push;
    R.push = function (value) {
        var ref = push.call(this);
        if (value === undefined) return ref;
        note('push', this);
        var p = Promise.resolve(ref);
        ref.then = function (a, b) { return Promise.resolve().then(a, b); };
        ref.catch = function (b) { return Promise.resolve(); };
        return ref;
    };
})();
</script>`;

// The current "deploy": its time (whole seconds, like a real Last-Modified) and build number
const deploy = { n: 0, time: new Date(Math.floor(Date.now() / 1000) * 1000 - 3600 * 1000) };
const hits = { get: 0, head: 0, notModified: 0 };

function appHtml() {
    let html = readFileSync(APP, 'utf8');
    html = html.replace('firebase-auth-compat.js"></script>', 'firebase-auth-compat.js"></script>\n' + STUB);
    if (deploy.n > 0) html = html.replace('>Past quizzes</button>', `>Past quizzes build ${deploy.n}</button>`);
    return html;
}

const TYPES = { '.png': 'image/png', '.svg': 'image/svg+xml', '.html': 'text/html; charset=utf-8' };

const server = http.createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/Estimator_Quiz') { res.writeHead(301, { Location: '/Estimator_Quiz/' }); return res.end(); }
    let body, type;
    if (path === '/Estimator_Quiz/' || path === '/Estimator_Quiz/index.html') {
        body = Buffer.from(appHtml());
        type = TYPES['.html'];
        if (req.method === 'HEAD') hits.head++; else hits.get++;
    } else if (path.startsWith('/Estimator_Quiz/') && !path.includes('..') && existsSync(join(ROOT, path.slice(1)))) {
        try { body = readFileSync(join(ROOT, path.slice(1))); } catch { body = null; }
        type = TYPES[extname(path)] || 'application/octet-stream';
    }
    if (!body) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found'); }
    const etag = '"' + createHash('sha1').update(body).digest('hex').slice(0, 16) + '"';
    const headers = {
        'Content-Type': type, 'Cache-Control': 'max-age=600', 'Last-Modified': deploy.time.toUTCString(),
        ETag: etag, 'Access-Control-Allow-Origin': '*'
    };
    if (req.headers['if-none-match'] === etag) {
        if (type === TYPES['.html']) hits.notModified++;
        res.writeHead(304, headers);
        return res.end();
    }
    res.writeHead(200, Object.assign({ 'Content-Length': body.length }, headers));
    res.end(req.method === 'HEAD' ? undefined : body);
});

function newDeploy() {
    deploy.n++;
    deploy.time = new Date(deploy.time.getTime() + 120 * 1000);
}

await new Promise((ok, fail) => { server.once('error', fail); server.listen(PORT, '127.0.0.1', ok); });
const URL_ = `http://localhost:${PORT}/Estimator_Quiz/`;
if (SERVE_ONLY) {
    console.log(`Serving ${APP} like GitHub Pages at ${URL_} (writes stubbed; add ?fresh to test the update check)`);
} else {
    let pw;
    try { pw = await import('playwright'); }
    catch { pw = createRequire(join(homedir(), '.claude', 'tools', 'package.json'))('playwright'); }

    const results = [];
    const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };
    const browser = await pw.webkit.launch({ headless: true });
    let wsWrites = 0, wsFrames = 0;
    try {
        const context = await browser.newContext({ ...pw.devices['iPhone 15'], viewport: { width: 393, height: 659 } });
        // Log what each page load showed first (before any update check could reload it)
        await context.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
            try {
                const el = document.querySelector('.past-quizzes-btn');
                const log = JSON.parse(sessionStorage.getItem('freshCheckLoads') || '[]');
                log.push(el ? el.textContent : '');
                sessionStorage.setItem('freshCheckLoads', JSON.stringify(log));
            } catch (e) {}
        }));
        const loads = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('freshCheckLoads') || '[]')).catch(() => []);
        const page = await context.newPage();
        const errors = [];
        // (Firebase's long-poll script aborted by a page navigation is noise, not an app error)
        page.on('pageerror', e => { if (!/firebaseio\.com\/\.lp\?disconn/.test(e.message)) errors.push(e.message); });
        page.on('websocket', ws => ws.on('framesent', f => {
            wsFrames++;
            // RTDB write actions: p (put), m (merge), o/om/oc (on-disconnect)
            if (/"a":"(p|m|o|om|oc)"/.test(String(f.payload))) wsWrites++;
        }));
        const url = URL_ + '?fresh';
        // (evaluate, not a locator: during a reload this just returns '' and the loop tries again)
        const pastText = () => page.evaluate(() => {
            const el = document.querySelector('.past-quizzes-btn');
            return el ? el.textContent : '';
        }).catch(() => '');

        // 1. First visit: build 0 lands in the browser's cache
        await page.goto(url);
        await page.waitForSelector('.past-quizzes-btn');
        await page.waitForTimeout(1500);
        check('first load shows build 0', (await pastText()).trim() === 'Past quizzes', await pastText());

        // 2. Deploy build 1, open the page again: the browser serves its cached copy first
        newDeploy();
        // (via another page first: going straight to the same address counts as a reload, which revalidates)
        await page.goto('about:blank');
        const loadsBefore = (await loads()).length;
        await page.goto(url);
        await page.waitForSelector('.past-quizzes-btn');
        let firstSeen;
        for (let i = 0; i < 10 && firstSeen === undefined; i++) {
            firstSeen = (await loads())[loadsBefore];
            if (firstSeen === undefined) await page.waitForTimeout(200);
        }
        check('reopened page came from the stale cache (test is meaningful)', firstSeen === 'Past quizzes',
            `first showed "${firstSeen}"`);
        let fresh = false;
        for (let i = 0; i < 16 && !fresh; i++) {
            await page.waitForTimeout(500);
            fresh = (await pastText()).includes('build 1');
        }
        check('new build appears within 8 s without a hard refresh', fresh, (await pastText()).trim());

        // 3. A practice question is on screen: a new deploy must NOT reload the page
        await page.evaluate(() => { window.__marker = 'still-here'; });
        await page.locator('.test-mode-option').first().click();
        await page.fill('#player-name', 'fresh check');
        await page.locator('.test-length-option', { hasText: '5' }).first().click();
        await page.waitForFunction(() => typeof questions !== 'undefined' && questions.length > 0, null, { timeout: 15000 });
        await page.locator('#test-intro .btn-primary').click();
        await page.waitForSelector('#test-question-container', { state: 'visible' });
        newDeploy();
        const headsBefore = hits.head;
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        await page.waitForTimeout(5000);
        const stayed = await page.evaluate(() => window.__marker === 'still-here'
            && document.getElementById('test-question-container').style.display === 'block' && testState.isActive);
        check('no reload while a practice question is showing', stayed, `update checks made: ${hits.head - headsBefore}`);
        check('the update check did run during the question', hits.head > headsBefore);

        // 4. Back home (resting): the waiting update is picked up
        await page.evaluate(() => resetTest());
        let picked = false;
        for (let i = 0; i < 16 && !picked; i++) {
            await page.waitForTimeout(500);
            picked = (await pastText()).includes('build 2');
        }
        check('back on home, the new build is picked up', picked, (await pastText()).trim());
        const settled = (await loads()).length;
        await page.waitForTimeout(4000);
        check('no further reloads once up to date', (await loads()).length === settled, `page loads so far ${settled}`);

        const writes = await page.evaluate(() => (window.__writes ? window.__writes.count : -1));
        check('database writes were stubbed (none sent)', wsWrites === 0 && wsFrames > 0, `stubbed calls ${writes}, write frames on the socket ${wsWrites} of ${wsFrames} sent`);
        check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    } finally {
        await browser.close();
        server.close();
    }
    const failed = results.filter(r => !r.ok).length;
    console.log(failed ? `\n${failed} of ${results.length} checks FAILED` : `\nAll ${results.length} checks passed`);
    process.exit(failed ? 1 : 0);
}

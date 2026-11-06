// Checks database.rules.json lets the owner move a no-account player's results to an
// account (Stats → Players → Move to), and still stops anyone else from tagging a record
// with another person's uid. Needs the RTDB emulator:
//   firebase emulators:start --only database --project demo-estimator
//   node tools/move-rules-check.mjs [rules-file]   (default: database.rules.json)
import { readFileSync } from 'fs';

const NS = 'demo-estimator-default-rtdb';
const HOST = process.env.RTDB_EMULATOR || 'http://127.0.0.1:9000';
const rulesFile = process.argv[2] || new URL('../database.rules.json', import.meta.url);
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
// The emulator accepts unsigned tokens
const token = claims => `${b64({ alg: 'none', typ: 'JWT' })}.${b64(Object.assign({
    iss: 'https://securetoken.google.com/demo-estimator', aud: 'demo-estimator',
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, auth_time: 1,
    firebase: { sign_in_provider: 'custom' } }, claims))}.`;
const OWNER = token({ sub: 'owner1', user_id: 'owner1', email: 'timhadfield7@gmail.com', email_verified: true });
const PLAYER = token({ sub: 'p1', user_id: 'p1', email: 'p1@example.com', email_verified: false });

async function req(method, path, body, auth) {
    const url = `${HOST}/${path}.json?ns=${NS}` + (auth === 'admin' ? '' : `&auth=${auth}`);
    const headers = { 'Content-Type': 'application/json' };
    if (auth === 'admin') headers.Authorization = 'Bearer owner';
    const r = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { ok: r.ok, status: r.status, text: await r.text() };
}

let fails = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' · ' + extra : ''}`); if (!cond) fails++; };

const rules = readFileSync(rulesFile, 'utf8').replace(/^﻿/, '');
let r = await req('PUT', '.settings/rules', JSON.parse(rules), 'admin');
if (!r.ok) { console.log('could not load rules', r.status, r.text); process.exit(2); }

// Seed: a no-account player "Varden" with one daily row and one practice record,
// and an account vu1 that already played another day
const seed = {
    dailyScores: {
        '2026-10-14': { '-anonrow1': { name: 'Varden', score: 2751.6, pts: [572.5, 81.1, 618.7, 969.1, 510.2], g: [28.5, 25000, 20000, 35, 10000000] } },
        '2026-10-15': { 'u_vu1': { name: 'vardenh', score: 3237.8 } },
    },
    records: { '-rec1': { category: 'all', date: '2026-10-15T03:53:35.234Z', id: '1792036415234', name: 'Varden', questionsAnswered: 5, score: 704.9 } },
    users: { vu1: { name: 'vardenh', daily: { '2026-10-15': { score: 3237.8, max: 5000 } } } },
};
r = await req('PUT', '', seed, 'admin');
check('seed', r.ok, r.text);

// The move, as playerMovePlan() writes it (one multi-path update at the root)
const move = {
    'dailyScores/2026-10-14/u_vu1': { name: 'vardenh', score: 2751.6, pts: [572.5, 81.1, 618.7, 969.1, 510.2], g: [28.5, 25000, 20000, 35, 10000000] },
    'dailyScores/2026-10-14/-anonrow1': null,
    'users/vu1/daily/2026-10-14': { score: 2751.6, max: 5000, pts: [572.5, 81.1, 618.7, 969.1, 510.2], maxes: [1000, 1000, 1000, 1000, 1000], guesses: [28.5, 25000, 20000, 35, 10000000] },
    'records/-rec1/name': 'vardenh',
    'records/-rec1/uid': 'vu1',
    'users/vu1/tests/-test1': { mode: 'estimation', score: 704.9, n: 5, category: 'all', date: 1792036415234 },
};

r = await req('PATCH', '', { 'records/-rec1/uid': 'vu1' }, PLAYER);
check('a player cannot tag a record with someone else\'s uid', !r.ok, String(r.status));
r = await req('PATCH', '', { 'dailyScores/2026-10-14/u_vu1': move['dailyScores/2026-10-14/u_vu1'] }, PLAYER);
check('a player cannot write another account\'s daily row', !r.ok, String(r.status));

r = await req('PATCH', '', move, OWNER);
check('owner can move the results (one update)', r.ok, `${r.status} ${r.ok ? '' : r.text}`);
r = await req('GET', '', undefined, 'admin');
const db = JSON.parse(r.text);
check('daily row now on the account', db.dailyScores['2026-10-14'].u_vu1?.name === 'vardenh' && !db.dailyScores['2026-10-14']['-anonrow1']);
check('record carries the account uid', db.records['-rec1'].uid === 'vu1' && db.records['-rec1'].name === 'vardenh');
check('account copies added', !!db.users.vu1.daily['2026-10-14'] && !!db.users.vu1.tests?.['-test1']);

console.log(fails ? `${fails} FAILED` : 'all passed');
process.exitCode = fails ? 1 : 0;

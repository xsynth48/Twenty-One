'use strict';
// Robo's chat, faster (beta 129; the user after testing beta 128: "faster, and that eye should simply be automatic").
//   - the answer streams: website/cloud robo.js roboChatStream sends NDJSON lines, robo-plus-main.cjs reads them as they come
//     and falls back to the plain request when a stream breaks or never starts
//   - a plain question thinks at effort low; no status wait before every question; Word is only read when it matters
//   - Robo talks back (and shows the "no voice on your PC" tip) only after a SPOKEN question, the tip at most once
// No real API, no mouse, no Word, no Electron.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

// ---------- a pretend api.twocode.nl for the app's side ----------
let mode = 'ok', hits = [];
const LINES = ['{"t":"d","x":"Hoi"}\n{"t":"d","x":"! Zo"}\n', 'not json at all\n{"t":"d","x":" doe je', ' dat."}\n', '{"t":"done","ok":true,"answer":"Hoi! Zo doe je dat.","energy":{"usedCents":2,"budgetCents":300},"cost":{"task":120}}\n'];
const server = http.createServer((req, res) => {
  let b = ''; req.on('data', d => { b += d; });
  req.on('end', async () => {
    const body = JSON.parse(b || '{}'); hits.push({ url: req.url, stream: body.stream === true });
    if (!req.url.endsWith('/robo/chat')) { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ ok: false })); }
    if (body.stream !== true) { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ ok: true, answer: 'plain answer' })); }
    if (mode === 'energy') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ ok: false, error: 'energy', energy: { usedCents: 300, budgetCents: 300 } })); }
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    const lines = mode === 'broken' ? LINES.slice(0, 2) : mode === 'error' ? ['{"t":"d","x":"Ho"}\n', '{"t":"e","ok":false,"error":"busy"}\n'] : LINES;
    for (const l of lines) { res.write(l); await new Promise(r => setTimeout(r, 5)); }
    res.end();
  });
});
let robo;
test.before(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  process.env.TWOCODE_STORE_API = `http://127.0.0.1:${server.address().port}/v1`;
  robo = require('../robo-plus-main.cjs');
});
test.after(() => server.close());
const cloud = () => import(require('node:url').pathToFileURL(path.join(__dirname, '..', 'website', 'cloud', 'src', 'robo.js')).href);

// ---------- the stream, read by the app ----------
test('lineReader: lines cut over chunks come out whole, what is not JSON is skipped, the last line without \\n too', () => {
  const got = [], r = robo.lineReader(ev => got.push(ev));
  r.push('{"t":"d","x":"a"}\n{"t":"d"'); r.push(',"x":"b"}\njunk\n'); r.push('{"t":"done","ok":true,"answer":"ab"}'); r.end();
  assert.deepEqual(got, [{ t: 'd', x: 'a' }, { t: 'd', x: 'b' }, { t: 'done', ok: true, answer: 'ab' }]);
  assert.deepEqual(robo.streamResult(got), { json: { ok: true, answer: 'ab' }, text: 'ab' });
  assert.deepEqual(robo.streamResult([{ t: 'd', x: 'Ho' }, { t: 'e', error: 'busy' }]), { json: { error: 'busy', ok: false }, text: 'Ho' });
  assert.deepEqual(robo.streamResult([{ t: 'd', x: 'half' }]), { broken: true, text: 'half' }); // no end: the plain way again
});

test('the app streams: onText gets the answer so far, the end gives the whole answer and his energy', async () => {
  mode = 'ok'; hits = []; const seen = [];
  const answer = await robo.chat({ prompt: 'hoi', onText: t => seen.push(t) });
  assert.equal(answer, 'Hoi! Zo doe je dat.');
  assert.deepEqual(seen, ['Hoi', 'Hoi! Zo', 'Hoi! Zo doe je dat.']);
  assert.deepEqual(hits, [{ url: '/v1/robo/chat', stream: true }]);          // one request, no second one
  // without onText (your own AI's callers, "write anywhere", Word) it stays the plain request
  hits = []; assert.equal(await robo.chat({ prompt: 'hoi' }), 'plain answer'); assert.deepEqual(hits, [{ url: '/v1/robo/chat', stream: false }]);
});

test('a stream that breaks asks again the plain way; an error line and a check before the model are not asked twice', async () => {
  mode = 'broken'; hits = [];
  assert.equal(await robo.chat({ prompt: 'hoi', onText: () => {} }), 'plain answer');
  assert.deepEqual(hits.map(h => h.stream), [true, false]);
  mode = 'error'; hits = [];
  await assert.rejects(robo.chat({ prompt: 'hoi', onText: () => {}, nl: true }), /druk/);   // "Robo heeft het even druk"
  assert.deepEqual(hits.map(h => h.stream), [true]);
  mode = 'energy'; hits = [];
  await assert.rejects(robo.chat({ prompt: 'hoi', onText: () => {}, nl: true }), /energie/);
  assert.deepEqual(hits.map(h => h.stream), [true]);
});

// ---------- the stream, sent by the server ----------
const PC = 'fedcba9876543210fedcba9876543210';
const pcWho = 'pc:' + crypto.createHash('sha256').update('twocode-install:' + PC).digest('hex');
const future = new Date(Date.now() + 10 * 864e5).toISOString();
function fakeDb({ plans = [], steps = [] } = {}) {
  const db = { plans, steps };
  db.prepare = sql => {
    const run = (args = []) => ({
      first: async () => {
        if (/FROM robo_plan WHERE who = \?/.test(sql)) return db.plans.find(r => r.who === args[0]) || null;
        if (/SUM\(cost_ueur\).*WHERE who = \? AND month = \?/.test(sql)) return { n: db.steps.filter(s => s.who === args[0] && s.month === args[1]).reduce((a, s) => a + s.cost, 0) };
        return null;
      },
      run: async () => { if (/^INSERT INTO robo_steps/.test(sql)) db.steps.push({ month: args[1], who: args[2], task: args[3], model: args[4], cost: args[9], stop: args[10] }); return { success: true }; },
      all: async () => ({ results: [] }),
    });
    return { bind: (...args) => run(args), ...run() };
  };
  return db;
}
// a pretend Anthropic client with streams: each answer = { pieces, msg } or an Error (thrown by finalMessage)
function streamClient(...answers) {
  const calls = [], betaCalls = []; let i = 0;
  const make = list => p => {
    list.push(p); const a = answers[Math.min(i++, answers.length - 1)]; let cb = null;
    return { on(ev, f) { if (ev === 'text') cb = f; return this; }, async finalMessage() { if (a instanceof Error) throw a; for (const x of a.pieces || []) cb?.(x, ''); return a.msg; } };
  };
  return { calls, betaCalls, messages: { stream: make(calls) }, beta: { messages: { stream: make(betaCalls) } } };
}
const MSG = { model: 'claude-haiku-5-5', content: [{ type: 'text', text: 'Hoi! Zo doe je dat.' }], stop_reason: 'end_turn', usage: { input_tokens: 1200, output_tokens: 40 } };
const lines = async stream => (await new Response(stream).text()).split('\n').filter(Boolean).map(l => JSON.parse(l));

test('roboChatStream: no plan = plain JSON and no model call; with a plan the pieces, then the end with cost and energy', async () => {
  const c = await cloud();
  const env = { DB: fakeDb(), ANTHROPIC_API_KEY: 'k' };
  const client = streamClient({ pieces: ['Hoi', '! Zo doe je dat.'], msg: MSG });
  assert.deepEqual(await c.roboChatStream(env, { install: PC }, { prompt: 'hoi' }, { client }), [{ ok: false, error: 'not allowed' }, 403]);
  assert.equal(client.calls.length, 0);
  env.DB.plans.push({ who: pcWho, plan: 'plus', until: future });
  const out = await c.roboChatStream(env, { install: PC }, { prompt: 'hoi' }, { client });
  assert.ok(out.stream);
  const got = await lines(out.stream); await out.done;
  assert.deepEqual(got.slice(0, 2), [{ t: 'd', x: 'Hoi' }, { t: 'd', x: '! Zo doe je dat.' }]);
  const end = got[2];
  assert.equal(end.t, 'done'); assert.equal(end.ok, true); assert.equal(end.answer, 'Hoi! Zo doe je dat.');
  assert.equal(end.cost.task, c.costMicroEur('claude-haiku-5-5', MSG.usage, 0.92));
  assert.equal(env.DB.steps.length, 1); assert.equal(env.DB.steps[0].stop, 'chat:end_turn');       // the cost is written down, like roboChat
  assert.deepEqual(client.calls[0].output_config, { effort: 'low' });                             // a plain question: Haiku at low
  assert.equal(c.STREAM_TYPE, 'application/x-ndjson; charset=utf-8');
});

test('roboChatStream: a busy model is an error line; a model without that web tool gets the next one; "slim:" streams with the fallback', async () => {
  const c = await cloud();
  const env = { DB: fakeDb({ plans: [{ who: pcWho, plan: 'pro', until: future }] }), ANTHROPIC_API_KEY: 'k' };
  const busy = streamClient(Object.assign(new Error('rate'), { status: 429 }));
  let out = await c.roboChatStream(env, { install: PC }, { prompt: 'x' }, { client: busy });
  assert.deepEqual(await lines(out.stream), [{ t: 'e', ok: false, error: 'busy' }]);
  const noTool = Object.assign(new Error('tool not supported'), { status: 400 });
  const web = streamClient(noTool, { pieces: ['ok'], msg: { ...MSG, content: [{ type: 'text', text: 'ok' }] } });
  out = await c.roboChatStream(env, { install: PC }, { prompt: 'zoek', web: true }, { client: web });
  const got = await lines(out.stream);
  assert.equal(got.at(-1).answer, 'ok');
  assert.equal(web.calls[0].tools[0].type, c.WEB_TOOLS[0]); assert.equal(web.calls[1].tools[0].type, c.WEB_TOOLS[1]);
  const smart = streamClient({ pieces: ['a'], msg: { ...MSG, model: 'claude-sonnet-5-5' } });
  out = await c.roboChatStream(env, { install: PC }, { prompt: 'x', smart: true }, { client: smart });
  await lines(out.stream);
  assert.equal(smart.calls.length, 0); assert.equal(smart.betaCalls.length, 1);
  assert.equal(smart.betaCalls[0].fallbacks, 'default'); assert.deepEqual(smart.betaCalls[0].betas, ['server-side-fallback-2026-07-01']);
});

test('the route: stream:true answers NDJSON (a check before the model stays JSON), the Worker keeps going until the end', () => {
  const index = read('website/cloud/src/index.js');
  assert.match(index, /async fetch\(request, env, ctx\) \{/);
  assert.match(index, /if \(b\.stream === true\) \{[\s\S]{0,120}const out = await roboChatStream\(env, who, b, \{ waitUntil: p => ctx\?\.waitUntil\?\.\(p\) \}\);\n            return Array\.isArray\(out\) \? json\(out\[0\], out\[1\]\) : new Response\(out\.stream, \{ headers: \{ 'Content-Type': ROBO_STREAM_TYPE, 'Cache-Control': 'no-store' \} \}\);/);
});

// ---------- the app: no waiting before a question, Word only when it matters, words in the chat as they come ----------
test('main: a question does not wait for the status once it is known; Word is read only for a question about it (or its follow-ups)', () => {
  const main = read('buddy-main.cjs');
  assert.match(main, /const plus = robo\.asked\(\) \? robo\.isOn\(\) : await Promise\.race\(/);
  assert.match(main, /if \(robo\.asked\(\)\) robo\.status\(\)\.catch\(\(\) => \{\}\);/);
  assert.match(read('robo-plus-main.cjs'), /const asked = \(\) => known\.at > 0;/);
  // Word: only when the question is about the document, or the chat's last question was (15 min); read again after 5 s
  const fc = main.slice(main.indexOf('const DOC_Q ='), main.indexOf('// ---------- the layer ----------'));
  assert.match(fc, /const wantsDoc = \(question, chatId\) => DOC_Q\.test\(String\(question \|\| ''\)\) \|\| \(chatId && wordChat\.id === chatId && Date\.now\(\) - wordChat\.at < 15 \* 60000\);/);
  assert.match(fc, /if \(wordCache\.st && wordCache\.title === title && Date\.now\(\) - wordCache\.at < 5000\) return wordCache\.st;/);
  const DOC_Q = new RegExp(fc.match(/const DOC_Q = \/(.+)\/i;/)[1], 'i');
  for (const q of ['zet alle feedback in een tabel', 'vul de lege rijen in', 'check my spelling', 'summarize this document', 'maak de inleiding korter']) assert.ok(DOC_Q.test(q), q);
  for (const q of ['hoe laat is het in Tokio?', 'test', 'wie won gisteren?', 'what is an API?']) assert.ok(!DOC_Q.test(q), q);
  // the words go to the island under the question's id
  assert.match(main, /const onText = rid \? words => toIsland\('robo:delta', \{ rid: String\(rid\), text: String\(words \|\| ''\) \}\) : null;/);
  assert.match(main, /onText: typeof o\.onText === 'function' \? o\.onText : null/);
  assert.match(read('preload.js'), /onRoboDelta: callback => subscribe\('robo:delta', callback\),/);
});

test('island: the answer grows as it comes (only for this question), then the whole answer takes its place without a second fade', () => {
  const chat = read('chat-ui.js');
  assert.match(chat, /const rid = 'q' \+ \(\+\+askSeq\) \+ '-' \+ Date\.now\(\); liveRid = rid; liveMsg = null;/);
  assert.match(chat, /if \(!ev \|\| !waiting \|\| !liveRid \|\| ev\.rid !== liveRid\) return;/);              // an old question's words never land
  assert.match(chat, /liveMsg = \{ who: 'ai', text: '', live: true, nosave: true, fresh: true \}/);             // (not saved while it grows)
  assert.match(chat, /if \(!deltaTimer\) deltaTimer = setTimeout\(\(\) => \{ deltaTimer = null; if \(liveMsg\) render\(\); \}, 60\);/);
  assert.match(chat, /\+ \(waiting && !liveMsg \? `<div class="cr-wait">/);                                      // the dots until the first words
  assert.match(chat, /plan: r\.plan \|\| null, fresh: !streamed \}/);
});

// ---------- Robo talks back only after a spoken question; the tip once ----------
test('voice: typed = he does not talk (unless Settings says Always); the "no voice" tip only after a spoken question, once ever, plain words', () => {
  const chat = read('chat-ui.js');
  const mayTalk = new Function('window', 'return ' + chat.match(/const mayTalk = (byVoice => \{[^\n]+\});/)[1]);
  const at = pref => mayTalk({ __twocodePrefs: () => ({ roboVoice: pref }) });
  assert.equal(at('voice')(false), false); assert.equal(at('voice')(true), true);
  assert.equal(at(undefined)(false), false);                                   // (the default is "when I talk")
  assert.equal(at('always')(false), true); assert.equal(at('off')(true), false);
  // typed resets it, everything said sets it (microphone, the shortcut's pill, Windows voice typing, a pill command)
  assert.match(chat, /function typed\(text\) \{ saidIn = ''; voiceTurn = false;/);
  assert.match(chat, /if \(b\.dataset\.kind\) \{ voiceTurn = false; return ask\(b\.dataset\.kind, ''\); \}/);
  assert.match(chat, /voiceTurn = true; if \(!command\(said\)\) heardDo\(said\);/);
  assert.match(chat, /setTimeout\(\(\) => \{ voiceTurn = true; if \(!command\(said\)\) heardDo\(said\); \}, 380\);/);
  assert.match(chat, /voiceTurn = true; if \(!command\(v\)\) heardDo\(v\);/);
  assert.match(chat, /const inPill = Boolean\(pill\), byVoice = voiceTurn \|\| inPill;/);
  // every place he speaks asks mayTalk first (the old rule "unless Never" made a typed "test" speak)
  assert.doesNotMatch(chat, /roboVoice \|\| 'voice'\) !== 'off'\) say\(/);
  assert.equal((chat.match(/mayTalk\(/g) || []).length, 5); // (questions, commands, "do it" twice, his question while working)
  // the tip: only when asked by voice, remembered on this PC, and without ** in it
  assert.match(chat, /if \(r\?\.error === 'novoice' && asked && !toldVoice\) \{ toldVoice = true; try \{ localStorage\.setItem\('twocode:toldVoice', '1'\); \} catch \{\}/);
  assert.match(chat, /try \{ toldVoice = localStorage\.getItem\('twocode:toldVoice'\) === '1'; \} catch \{\}/);
  assert.doesNotMatch(chat.match(/noVoice: '[^\n]+/)[0], /\*\*/);
  assert.doesNotMatch(chat.match(/noVoiceIn: n => `[^\n]+/)[0], /\*\*/);
});

test('secrecy still holds: none of this shows Plus, Pro, a price or the "AI" name to a normal user', () => {
  const chat = read('chat-ui.js'), fun = read('twocode-fun.js');
  const row = fun.match(/row\('Robo ziet welke app je open hebt', '[^']+'/)[0];
  assert.doesNotMatch(row, /\bPlus\b|\bPro\b|€|\bAI\b/);
  assert.doesNotMatch(read('i18n-ui.js').match(/'Robo ziet welke app je open hebt': '[^']+', '[^']+': '[^']+'/)[0], /\bPlus\b|\bPro\b|€/);
  assert.match(chat, /let launch = false;\n  const lockedNow = \(\) => launch && !plusState\?\.on;/);
});

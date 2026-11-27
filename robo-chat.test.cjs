'use strict';
// Robo's chat, beta 128 (the user: "max 4 chats … when you open the chat you must see the bottom"; "make the chat better":
// it remembers the conversation, sees more of the screen, nicer and clearer) and launch mode (secret until launch day: the
// assistant needs Plus and is called "AI" by default; off for everyone but the test PC).
// No network, no mouse, no real Word, no Electron: robo-chats.cjs and chat-core.js are plain modules; the rest is read as source.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const chats = require('../robo-chats.cjs');
const core = require('../chat-core.js');
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tc-chats-')), 'robo-chats.json');

// ---------- the store: four chats at most, kept on this PC, nothing thrown away without a choice ----------
test('chats: one empty chat to start, at most four, an empty one is reused, a fifth asks which one may go', () => {
  const file = tmp(), st = chats.createStore(file);
  let s = st.state();
  assert.equal(s.chats.length, 1); assert.equal(s.max, 4); assert.deepEqual(s.messages, []); assert.equal(s.see, true);
  assert.equal(st.create().chats.length, 1); // the open chat is still empty: that IS the new chat
  st.save(s.current, [{ who: 'me', text: 'Wat is een API?' }, { who: 'ai', text: 'Een manier waarop programma’s praten.' }]);
  for (let i = 0; i < 3; i++) { const r = st.create(); assert.equal(r.ok, true); st.save(r.current, [{ who: 'me', text: 'vraag ' + i }]); }
  s = st.state(); assert.equal(s.chats.length, 4);
  const full = st.create();
  assert.equal(full.ok, false); assert.equal(full.full, true); assert.equal(full.chats.length, 4); // nothing was closed
  // you pick one: that one goes and a new, empty chat opens
  const gone = s.chats[1].id, r = st.replace(gone);
  assert.equal(r.ok, true); assert.equal(r.chats.length, 4); assert.ok(!r.chats.some(c => c.id === gone)); assert.deepEqual(r.messages, []);
});

test('chats: "close the oldest" closes the one used longest ago; closing the open one opens another', () => {
  const st = chats.createStore(tmp());
  const ids = [];
  for (let i = 0; i < 4; i++) { const r = i ? st.create() : st.state(); ids.push(r.current); st.save(r.current, [{ who: 'me', text: 'q' + i }]); }
  st.find(ids[2]).updated = 1; // used longest ago
  const r = st.replace();
  assert.ok(!r.chats.some(c => c.id === ids[2]));
  const open = st.state().current, after = st.close(open);
  assert.notEqual(after.current, open); assert.equal(after.chats.length, 3);
  // closing the very last one leaves one empty chat, never none
  const one = chats.createStore(tmp()); const only = one.state().current;
  assert.equal(one.close(only).chats.length, 1);
});

test('chats: kept on disk (a restart brings them back), cleaned, trimmed; only who/text/error/steps are kept', () => {
  const file = tmp(), st = chats.createStore(file), id = st.state().current;
  const long = Array.from({ length: 80 }, (_, i) => ({ who: i % 2 ? 'ai' : 'me', text: 'bericht ' + i }));
  st.save(id, [...long,
    { who: 'ai', text: 'Wat moet ik hiermee?', write: { preview: 'x', state: 'pick' } }, // a text waiting for "neater": not kept
    { who: 'ai', text: 'Gedaan', nosave: true },
    { who: 'ai', text: '', steps: [{ text: 'Open YouTube', state: 'ok' }, { text: 'Klik', state: 'busy' }, { text: 'Nee', state: 'fail' }], ask: true, plan: { x: 1 } },
    { who: 'ai', error: 'Er ging iets mis.' }, { who: 'system', text: 'nee' }, null]);
  const again = chats.createStore(file).state(); // a new store on the same file = Twenty-One started again
  assert.equal(again.current, id);
  assert.equal(again.messages.length, chats.MAX_MSGS);
  const last = again.messages.slice(-2);
  assert.deepEqual(last[0], { who: 'ai', steps: [{ text: 'Open YouTube', state: 'ok' }, { text: 'Klik', state: 'ok' }, { text: 'Nee', state: 'fail' }] });
  assert.deepEqual(last[1], { who: 'ai', error: 'Er ging iets mis.' });
  assert.ok(!again.messages.some(m => /Wat moet ik hiermee|Gedaan/.test(m.text || '')));
  // the tab is named after the first question
  assert.equal(again.chats[0].title, chats.titleOf(again.messages));
  // and the eye is per chat
  assert.equal(chats.createStore(file).setSee(id, false).see, false);
  assert.equal(chats.createStore(file).state().see, false);
  // a damaged file starts clean instead of breaking the island
  fs.writeFileSync(file, '{not json'); assert.equal(chats.createStore(file).state().chats.length, 1);
});

test('chats: the tab name is the first question, short', () => {
  assert.equal(core.titleOf([{ who: 'ai', text: 'Hoi' }, { who: 'me', text: '  Wat   is een API?  ' }]), 'Wat is een API?');
  assert.equal(core.titleOf([{ who: 'me', text: 'Speel Been Away van Brent Faiyaz op YouTube af' }]), 'Speel Been Away van Brent F…');
  assert.equal(core.titleOf([]), '');
});

// ---------- the conversation goes along with each question ----------
test('history: the newest turns of this chat, within a size; errors stay out', () => {
  const list = Array.from({ length: 30 }, (_, i) => ({ who: i % 2 ? 'ai' : 'me', text: 'turn ' + i }));
  const h = core.history([...list, { who: 'ai', error: 'mis' }]);
  assert.equal(h.length, 12); assert.equal(h[0].text, 'turn 18'); assert.equal(h[11].text, 'turn 29');
  const big = core.history(Array.from({ length: 10 }, () => ({ who: 'me', text: 'x'.repeat(5000) })));
  assert.ok(big.length >= 1 && big.reduce((a, m) => a + m.text.length, 0) <= 12000);
  assert.ok(big.every(m => m.text.length <= 2000));
  const chat = read('chat-ui.js');
  // ask() and "do it" both send THIS chat's history (chat-core history), and main keeps 12 turns of it
  assert.equal((chat.match(/const history = core \? core\.history\(messages\)/g) || []).length, 2);
  assert.match(read('buddy-main.cjs'), /const turns = \(Array\.isArray\(history\) \? history : \[\]\)\.slice\(-12\)/);
});

// ---------- always at the newest ----------
test('scrolling: opening lands at the newest, you stay there as messages come, reading higher up nothing jumps', () => {
  const box = { scrollHeight: 1000, clientHeight: 200 }; // the bottom is at 800
  assert.equal(core.nextScroll({ ...box, open: true, prevTop: 0, pinned: false }), 800);          // opened (also a tab)
  assert.equal(core.nextScroll({ ...box, pinned: true, prevTop: 790 }), 800);                       // at the bottom: stays
  assert.equal(core.nextScroll({ ...box, pinned: false, prevTop: 300 }), 300);                      // reading up: no jump
  assert.equal(core.nextScroll({ ...box, pinned: false, prevTop: 300, end: true }), 800);           // a yes/no to answer
  assert.equal(core.nextScroll({ ...box, readFrom: true, mineTop: 500 }), 496);                     // your question on top
  assert.equal(core.nextScroll({ ...box, readFrom: true, mineTop: 950 }), 800);                     // short answer: the bottom
  assert.equal(core.atBottom(790, 1000, 200), true); assert.equal(core.atBottom(600, 1000, 200), false);
  const chat = read('chat-ui.js');
  assert.match(chat, /if \(!visible\) \{ opening = true; render\(\);/);                              // opening the chat
  assert.match(chat, /async function openChat\(st\) \{ if \(!st\) return; applyChats\(st\); opening = true;/); // a tab
  assert.match(chat, /function showDown\(\) \{ root\.querySelector\('\.cr-down'\)\?\.classList\.toggle\('show', !pinned && messages\.length > 0\); \}/);
  assert.match(chat, /if \(act === 'down'\) \{ const l = root\.querySelector\('\.cr-msgs'\); if \(l\) \{ l\.scrollTop = l\.scrollHeight; pinned = true;/);
});

// ---------- nicer and safe ----------
test('formatting: lists, bold, headings, code with a copy button, links; no HTML of the AI ever gets in', () => {
  const html = core.md('# Kop\nHoi **jij** en *jou*\n- een\n- twee\n1. drie\n\n```\nlet a = "<b>";\n```\nZie https://twocode.nl/a?b=1&c=2. en [docs](https://example.com/x)');
  assert.match(html, /<p class="cr-h">Kop<\/p>/);
  assert.match(html, /<b>jij<\/b> en <i>jou<\/i>/);
  assert.match(html, /<ul><li>een<\/li><li>twee<\/li><\/ul><ol><li>drie<\/li><\/ol>/);
  assert.match(html, /<div class="cr-code"><pre>let a = &quot;&lt;b&gt;&quot;;<\/pre><button type="button" class="cr-copy" data-copycode="1">Copy<\/button><\/div>/);
  assert.match(html, /<a href="#" class="cr-link" data-link="https:\/\/twocode\.nl\/a\?b=1&amp;c=2"[^>]*>https:\/\/twocode\.nl\/a\?b=1&amp;c=2<\/a>\./);
  assert.match(html, /<a href="#" class="cr-link" data-link="https:\/\/example\.com\/x"[^>]*>docs<\/a>/);
  for (const evil of ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '[x](javascript:alert(1))', 'javascript:alert(1)', '"><svg onload=1>', 'https://a.b/"onmouseover="alert(1)']) {
    const out = core.md(evil), tags = out.match(/<[a-z][^>]*>/gi) || [];
    assert.doesNotMatch(out, /<img|<script|<svg|href="javascript|data-link="javascript/i, evil); // (escaped, they are only text)
    for (const tag of tags) {
      assert.match(tag, /^<(p|br|b|i|a|code|pre|div|button|ul|ol|li|span|kbd)[\s>]/, tag);             // only our own tags
      assert.doesNotMatch(tag.replace(/"[^"]*"/g, '""'), /\son\w+=/i, tag);                              // and no handler on them
    }
  }
  assert.equal(core.safeLink('https://twocode.nl/x'), 'https://twocode.nl/x');
  for (const bad of ['javascript:alert(1)', 'file:///C:/Windows', 'data:text/html,x', 'vbscript:x', '']) assert.equal(core.safeLink(bad), '', bad);
  assert.equal(core.plain('**Hoi** `code` [a](https://x.y)'), 'Hoi code a (https://x.y)');
  // a link never opens in the island itself: main opens http(s) in the browser after checking it again
  const chat = read('chat-ui.js'), main = read('buddy-main.cjs');
  assert.match(chat, /if \(a\) \{ e\.preventDefault\(\); const url = core\?\.safeLink\(a\.getAttribute\('data-link'\)\); if \(url\) api\.roboOpenLink\?\.\(url\); return; \}/);
  assert.match(main, /ipcMain\.on\('robo:open-link', \(e, url\) => \{\n  if \(!fromIsland\(e\)\) return;\n  try \{ const u = new URL\(String\(url \|\| ''\)\); if \(u\.protocol === 'https:' \|\| u\.protocol === 'http:'\) shell\.openExternal/);
  assert.match(read('mascot.html'), /<script src="\.\/chat-core\.js"><\/script>\n<script src="\.\/chat-ui\.js"><\/script>/);
});

// ---------- sees more of the screen: automatic (beta 129), one switch in Settings ----------
test('the eye is automatic: the window in front always goes along, unless Settings → "Robo sees which app you have open" is off', () => {
  const main = read('buddy-main.cjs');
  const fc = main.slice(main.indexOf('async function frontContext('), main.indexOf('// ---------- the layer ----------'));
  assert.match(fc, /^async function frontContext\(question, \{ light = false, see = true \} = \{\}\) \{\n  if \(chatTarget\) return null;\n  if \(!seeFront \|\| see === false\) return null;/);
  assert.doesNotMatch(fc, /chats\(\)\.current\(\)\?\.see/);                                // (no eye per chat anymore)
  assert.match(fc, /if \(win\.process === 'winword'\) \{\n    if \(wantsDoc\(question, chatId\)\) \{/); // Word: the document only when it matters
  assert.match(fc, /else if \(SCREEN_Q\.test\(String\(question \|\| ''\)\)\) ctx\.shot = await windowShot/); // a picture only when asked about the screen
  assert.match(main, /ipcMain\.handle\('robo:front', async e => \{\n  if \(!fromIsland\(e\)\) return null;\n  if \(!seeFront\) return \{ off: true \};/);
  assert.match(main, /ipcMain\.on\('robo:see-pref', \(e, on\) => \{ if \(fromIsland\(e\)\) seeFront = on !== false; \}\);/);
  assert.match(main, /if \(typeof see === 'boolean'\) seeFront = see;/);               // every question carries the setting too
  // questions and "do it" carry it; the island's own windows never (the helper skips Twenty-One's process)
  assert.match(main, /else result = await askScreen\(question, before, sm\.smart === true, await frontContext\(question\), onText\);/);
  assert.match(main, /const front = await frontContext\(request, \{ light: true \}\);/);
  const helper = read('buddy-helper.ps1');
  assert.match(helper, /public static string Front\(uint skip\) \{/);
  assert.match(helper, /uint pid; GetWindowThreadProcessId\(h, out pid\); if \(pid == skip\) return true;\n      var cls/);
  assert.match(helper, /'front' \{ \$out = \[RoboEyes\]::Front\(\[uint32\]\$Skip\) \}/);
  // the chat has no eye button anymore; a drop still shows what Robo was dropped on (with ✕)
  const chat = read('chat-ui.js');
  assert.doesNotMatch(chat, /data-do="see"|chatSee|roboChatsSee|refreshFront/);
  assert.match(chat, /const pill = context \? `<span class="cr-see on"[^\n]*data-do="forget"[^\n]*` : '';/);
  assert.match(chat, /const seesPref = \(\) => window\.__twocodePrefs\?\.\(\)\.aiSees !== false;/);
  // the switch: Settings (twocode-fun.js), on by default, told to main on every save
  const fun = read('twocode-fun.js');
  assert.match(fun, /roboVoice: 'voice', aiSees: true,/);
  assert.match(fun, /row\('Robo ziet welke app je open hebt', '[^']+', toggle\('aiSees'\)\)/);
  assert.match(fun, /window\.twocode\?\.roboSeePref\?\.\(prefs\.aiSees !== false\);/);
  assert.match(read('i18n-ui.js'), /'Robo ziet welke app je open hebt': 'Robo sees which app you have open'/);
});

test('tabs and "+": the chats are buttons; at four, "+" asks which one may go (or the oldest), never silently', () => {
  const chat = read('chat-ui.js');
  assert.match(chat, /async function newChat\(\) \{ if \(waiting\) return; saveChat\(true\); const st = await api\.roboChatsNew\?\.\(\)\.catch\(\(\) => null\); if \(!st\) return; if \(st\.full\) \{ fullPick = true; render\(\); return; \} openChat\(st\); \}/);
  assert.match(chat, /data-replace="\$\{esc\(c\.id\)\}"/); assert.match(chat, /data-do="replace-oldest"/); assert.match(chat, /data-do="full-cancel"/);
  assert.match(chat, /role="tab" aria-selected="\$\{on\}" class="cr-tab" data-chat=/);
  // dropping Robo on something gets its own chat, but four full chats are never emptied for it
  assert.match(chat, /if \(messages\.length && chatsReady\) \{ saveChat\(true\); const st = await api\.roboChatsNew\?\.\(\)\.catch\(\(\) => null\); if \(st && !st\.full\) applyChats\(st\); \}/);
  // the chats live only on this PC
  assert.match(read('buddy-main.cjs'), /chatsLib\.createStore\(path\.join\(app\.getPath\('userData'\), 'robo-chats\.json'\)\)/);
  assert.doesNotMatch(read('website/cloud/src/robo.js'), /robo-chats|chatsSave/);
});

// ---------- launch mode (secret): on for the test list only; off = exactly as before ----------
const PC = 'fedcba9876543210fedcba9876543210';
const pcWho = 'pc:' + crypto.createHash('sha256').update('twocode-install:' + PC).digest('hex');
function fakeDb(allow = []) {
  return { prepare: sql => { const run = (args = []) => ({
    first: async () => /FROM robo_allow WHERE who = \?/.test(sql) ? allow.find(r => r.who === args[0]) || null : /SUM\(cost_ueur\)/.test(sql) ? { n: 0 } : null,
    run: async () => ({ success: true }), all: async () => ({ results: [] }) }); return { bind: (...a) => run(a), ...run() }; } };
}
const cloud = () => import(require('node:url').pathToFileURL(path.join(__dirname, '..', 'website', 'cloud', 'src', 'robo.js')).href);

test('launch mode on the server: the test PC has it, everyone else only when ROBO_LAUNCH is "on"', async () => {
  const { roboStatus, launchFor } = await cloud();
  const env = { DB: fakeDb([{ who: pcWho, budget_cents: 300 }]), ANTHROPIC_API_KEY: 'k' };
  const [mine] = await roboStatus(env, { install: PC });
  assert.equal(mine.on, true); assert.equal(mine.launch, true);
  const [other] = await roboStatus(env, { install: '0123456789abcdef0123456789abcdef' });
  assert.equal(other.on, false); assert.equal(other.launch, false);
  const [later] = await roboStatus({ ...env, ROBO_LAUNCH: 'on' }, { install: '0123456789abcdef0123456789abcdef' });
  assert.equal(later.launch, true); assert.equal(later.on, false);
  assert.equal(launchFor({ ROBO_LAUNCH: 'off' }, null), false); assert.equal(launchFor({}, { source: 'stripe' }), false);
  assert.match(read('website/cloud/wrangler.toml'), /\nROBO_LAUNCH = "off"\n/); // off for everyone today
});

test('launch mode in the app: no plan = the assistant is locked (nothing to any AI); off = nothing changes', () => {
  const plus = read('robo-plus-main.cjs'), main = read('buddy-main.cjs'), chat = read('chat-ui.js');
  assert.match(plus, /const locked = \(\) => known\.launch === true && !known\.on;/);
  assert.match(plus, /launch: r\?\.ok \? r\.launch === true : known\.launch === true/); // offline: the last answer
  assert.match(main, /if \(robo\.locked\(\)\) return locked\(\); \/\/ launch mode without a plan/);      // questions
  assert.match(main, /const plus = await robo\.status\(\)\.catch\(\(\) => \(\{\}\)\);\n  if \(robo\.locked\(\)\) return locked\(\);/); // "do it"
  assert.match(main, /if \(!st\.on\) \{ toIsland\('robo:write', \{ kind: 'need-plus' \}\); return; \}/); // write anywhere: only with a plan anyway
  // the island: locked only when launch mode said so AND there is no plan; launch starts false and only the server sets it
  assert.match(chat, /let launch = false;\n  const lockedNow = \(\) => launch && !plusState\?\.on;/);
  assert.match(chat, /const l = p\?\.launch === true;/);
  assert.match(chat, /if \(lockedNow\(\)\) return renderLocked\(\);/);
  assert.match(chat, /async function ask\(kind, text\) \{\n    if \(waiting\) return;\n    if \(lockedNow\(\)\) \{ render\(\); return; \}/);
  assert.match(chat, /async function jarvis\(said\) \{\n    if \(waiting\) return;\n    if \(lockedNow\(\)\) \{ render\(\); return; \}/);
  // the "part of Plus" words only exist inside renderLocked, which only runs when locked
  const outside = chat.replace(/lockTitle: '[^']*', lockSub: '[^']*', lockBtn: '[^']*'/g, '').replace(/function renderLocked\(\) \{[\s\S]*?\n  \}/, '');
  assert.doesNotMatch(outside, /L\(\)\.lock(Title|Sub|Btn)/);
  // Settings: in launch mode the Plus page is there for everyone (to buy it); off: only with a plan, as in beta 127
  assert.match(read('settings-app-main.cjs'), /return \{ on: st\.on === true \|\| st\.launch === true \};/);
  assert.match(read('settings-app.html'), /if \(plusInfo\?\.status\?\.on !== true && plusInfo\?\.status\?\.launch !== true\) return showPlus\(false\); drawPlus\(\);/);
});

test('launch mode name: "AI" only when you never chose one; a chosen name stays; off = the name you had', () => {
  const fun = read('twocode-fun.js');
  assert.match(fun, /const defaultName = n => !String\(n \|\| ''\)\.trim\(\) \|\| \['Twenty-One', 'Robo'\]\.includes\(String\(n\)\.trim\(\)\);/);
  assert.match(fun, /function petNow\(\) \{ return window\.__twocodeLaunchMode === true && defaultName\(prefs\.name\) \? 'AI' : prefs\.name; \}/);
  assert.equal((fun.match(/window\.__twocodePack\?\.pet\(prefs\.name\)/g) || []).length, 0); // every place goes through petNow
  // run petNow for real
  const make = (name, launchMode) => { const prefs = { name }; const defaultName = n => !String(n || '').trim() || ['Twenty-One', 'Robo'].includes(String(n).trim());
    const window = { __twocodeLaunchMode: launchMode }; return (function () { return window.__twocodeLaunchMode === true && defaultName(prefs.name) ? 'AI' : prefs.name; })(); };
  assert.equal(make('Twenty-One', true), 'AI'); assert.equal(make('', true), 'AI'); assert.equal(make('Robo', true), 'AI');
  assert.equal(make('Tuco', true), 'Tuco');                                   // a name you chose stays
  assert.equal(make('Twenty-One', false), 'Twenty-One'); assert.equal(make('Tuco', false), 'Tuco'); // off: as before (the pack keeps "Robo")
  // the pack renames every "Robo" to the pet name, so "Robo is part of Plus" reads "AI is part of Plus"
  assert.match(read('lang-pack.js'), /const named = s => \(pet \? s\.replace\(\/\\bRobo\(\?=s\?\\b\)\/g, \(\) => pet\)/);
});

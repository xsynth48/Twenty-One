'use strict';
// Robo's chats (beta 128, the user: "max 4 chats, and when you open the chat you must see the bottom"): up to four
// conversations, kept on THIS PC only (userData/robo-chats.json), never on a server. The island shows them as tabs; each
// question to the AI carries the earlier turns of its own chat, so a follow-up ("and in English?") works, also after a restart.
// Per chat: whether Robo may look at what is in front of you (the eye chip in the chat; off = nothing of the screen is sent).
// Pure Node (fs only), so the tests can use it without Electron. buddy-main.cjs makes the one store and its ipc.
const fs = require('node:fs');

const MAX_CHATS = 4, MAX_MSGS = 60, MAX_TEXT = 4000;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, n);

// What is kept of a message: who said it and the words (an error stays an error, "do it" keeps its steps as lines). Things
// you had to answer then (a yes/no, a proposal, a text waiting for "neater/shorter") are not brought back later.
function cleanMessages(list) {
  const out = [];
  for (const m of Array.isArray(list) ? list : []) {
    if (!m || (m.who !== 'me' && m.who !== 'ai') || m.nosave || m.write) continue;
    const c = { who: m.who };
    const text = str(m.text, MAX_TEXT).trim(); if (text) c.text = text;
    if (m.who === 'ai' && m.error) c.error = str(m.error, 400);
    if (m.who === 'ai' && Array.isArray(m.steps) && m.steps.length) c.steps = m.steps.slice(0, 20).map(s => ({ text: str(s?.text, 200), state: s?.state === 'fail' ? 'fail' : 'ok' }));
    if (c.text || c.error || c.steps) out.push(c);
  }
  return out.slice(-MAX_MSGS);
}

// a tab's name (its first question, short) and the earlier turns that go along with a question: chat-core.js, shared
// with the island
const { titleOf, history } = require('./chat-core.js');

function createStore(file) {
  let data = null;
  const fresh = () => ({ id: newId(), title: '', see: true, created: Date.now(), updated: Date.now(), messages: [] });
  function load() {
    if (data) return data;
    try {
      const j = JSON.parse(fs.readFileSync(file, 'utf8'));
      data = { current: String(j?.current || ''), chats: (Array.isArray(j?.chats) ? j.chats : []).slice(0, MAX_CHATS).map(c => {
        const messages = cleanMessages(c?.messages);
        return { id: str(c?.id, 40) || newId(), title: str(c?.title, 60) || titleOf(messages), see: c?.see !== false, created: +c?.created || Date.now(), updated: +c?.updated || Date.now(), messages };
      }) };
    } catch { data = { current: '', chats: [] }; }
    if (!data.chats.length) data.chats.push(fresh());
    if (!data.chats.some(c => c.id === data.current)) data.current = data.chats[data.chats.length - 1].id;
    return data;
  }
  function write() {
    try { const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data)); fs.renameSync(tmp, file); } catch {}
  }
  const find = id => load().chats.find(c => c.id === id) || null;
  const current = () => find(load().current);
  // what the island needs: the tabs, and the messages and the eye of the open chat
  function state() {
    const d = load(), cur = current();
    return { current: d.current, max: MAX_CHATS, chats: d.chats.map(c => ({ id: c.id, title: c.title, count: c.messages.length, see: c.see })),
      messages: cur.messages, see: cur.see };
  }
  function select(id) { if (find(id)) { load().current = id; write(); } return state(); }
  // "+": an empty chat that is already there is the new one; with four full chats → { ok: false, full: true } (the island asks
  // which one may go: nothing is ever thrown away without you choosing it)
  function create() {
    const d = load();
    const empty = current()?.messages.length === 0 ? current() : d.chats.find(c => !c.messages.length);
    if (empty) { d.current = empty.id; write(); return { ok: true, ...state() }; }
    if (d.chats.length >= MAX_CHATS) return { ok: false, full: true, ...state() };
    const c = fresh(); d.chats.push(c); d.current = c.id; write();
    return { ok: true, ...state() };
  }
  function close(id) {
    const d = load(), was = d.current;
    d.chats = d.chats.filter(c => c.id !== id);
    if (!d.chats.length) d.chats.push(fresh());
    if (!d.chats.some(c => c.id === was)) d.current = d.chats[d.chats.length - 1].id;
    write(); return state();
  }
  // closes `id` (the one you picked) or else the chat you used longest ago, then opens a new one
  function replace(id = '') {
    const d = load();
    const gone = (id && find(id)) || [...d.chats].sort((a, b) => a.updated - b.updated)[0];
    if (gone) close(gone.id);
    return create();
  }
  function save(id, messages) {
    const c = find(id); if (!c) return { ok: false };
    c.messages = cleanMessages(messages);
    c.title = titleOf(c.messages) || '';
    c.updated = Date.now(); write();
    return { ok: true, id: c.id, title: c.title, count: c.messages.length };
  }
  function setSee(id, on) { const c = find(id); if (c) { c.see = on !== false; write(); } return state(); }
  return { load, state, select, create, close, replace, save, setSee, find, current };
}

module.exports = { createStore, cleanMessages, titleOf, history, MAX_CHATS, MAX_MSGS, MAX_TEXT };

'use strict';
// Sign in with Google. The official way for a desktop app: your own browser, a one-time address on this PC and PKCE, so
// Twenty-One never sees your password. Your sign-in stays on this PC, locked by Windows (safeStorage), and there is no server
// in between. It may do what Google approved for this app (calendar.events, gmail.send) plus two things that need no
// approval: which calendars you have, and how many new mails there are (gmail.labels: never who from, never what).
// google-client.json is Google's own download for this app and stays out of git. Without it: "not available", nothing breaks.
const { app, shell, ipcMain, safeStorage, net, BrowserWindow } = require('electron');
const T = s => require('./lang-main.cjs').t(s); // (only when the page is asked for)
const http = require('node:http'), crypto = require('node:crypto'), fs = require('node:fs'), path = require('node:path');

const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth', TOKEN = 'https://oauth2.googleapis.com/token', REVOKE = 'https://oauth2.googleapis.com/revoke';
const CAL = 'https://www.googleapis.com/calendar/v3', MAIL = 'https://gmail.googleapis.com/gmail/v1/users/me', MAIL_UP = 'https://gmail.googleapis.com/upload/gmail/v1/users/me';
const S = { calendar: 'https://www.googleapis.com/auth/calendar.events', calendars: 'https://www.googleapis.com/auth/calendar.calendarlist.readonly', mail: 'https://www.googleapis.com/auth/gmail.labels', send: 'https://www.googleapis.com/auth/gmail.send' };
const SCOPES = ['openid', 'email', S.calendar, S.calendars, S.mail, S.send];
const MAX_FILE = 25 * 1024 * 1024; // Gmail's own limit for an attachment
const WAIT_LOGIN = 5 * 60000;

// ---------- small pieces without side effects (tests/google.test.cjs) ----------
const b64url = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function pkce() { const verifier = b64url(crypto.randomBytes(48)); return { verifier, challenge: b64url(crypto.createHash('sha256').update(verifier).digest()) }; }
function authUrl({ clientId, redirect, state, challenge, scopes = SCOPES }) {
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: 'code', scope: scopes.join(' '), code_challenge: challenge, code_challenge_method: 'S256', state, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' });
  return `${AUTH}?${q}`;
}
const emailOf = idToken => { try { return String(JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString('utf8')).email || ''); } catch { return ''; } };
const dayStart = date => { const [y, m, d] = String(date).split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
/** Google's events in the shape the Agenda page already reads. */
function toEvents(items, calendarId = 'primary') {
  const out = [];
  for (const e of items || []) {
    if (e.status === 'cancelled' || !e.start) continue;
    const allDay = Boolean(e.start.date), start = allDay ? dayStart(e.start.date) : Date.parse(e.start.dateTime), end = allDay ? dayStart(e.end?.date || e.start.date) : Date.parse(e.end?.dateTime || e.start.dateTime);
    if (!Number.isFinite(start)) continue;
    out.push({ id: String(e.id || ''), calendar: calendarId, title: String(e.summary || ''), start, end: Number.isFinite(end) ? end : start + 3600000, allDay });
  }
  return out;
}
const validEmail = s => /^[^\s@<>,;:"()[\]\\]+@[^\s@<>,;:"()[\]\\]+\.[^\s@<>,;:"()[\]\\]{2,}$/.test(String(s || ''));
const headerWord = s => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`;
const oneLine = s => String(s || '').replace(/[\r\n]+/g, ' ').trim();
/** A mail with files, the way Gmail wants it. Line breaks in a name or subject can never add a header. */
function mimeMessage({ to, subject, text, files = [], boundary = 'twocode' + crypto.randomBytes(12).toString('hex') }) {
  if (!validEmail(to)) throw new Error('bad address');
  const head = [`To: ${oneLine(to)}`, `Subject: ${headerWord(oneLine(subject))}`, 'MIME-Version: 1.0'], wrap = buf => buf.toString('base64').replace(/(.{76})/g, '$1\r\n');
  const body = wrap(Buffer.from(String(text || ''), 'utf8'));
  if (!files.length) return Buffer.from([...head, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', body].join('\r\n'));
  const parts = files.flatMap(f => { const name = headerWord(oneLine(f.name).replace(/["\\]/g, '_') || 'file'); return [`--${boundary}`, `Content-Type: application/octet-stream; name="${name}"`, `Content-Disposition: attachment; filename="${name}"`, 'Content-Transfer-Encoding: base64', '', wrap(f.data)]; });
  return Buffer.from([...head, `Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', body, ...parts, `--${boundary}--`, ''].join('\r\n'));
}

// ---------- which app this is, and your sign-in ----------
let client; // { id, secret } from Google's download
function loadClient() {
  if (client !== undefined) return client;
  try { const o = JSON.parse(fs.readFileSync(path.join(__dirname, 'google-client.json'), 'utf8')).installed; client = o?.client_id && o?.client_secret ? { id: o.client_id, secret: o.client_secret } : null; } catch { client = null; }
  return client;
}
const file = () => path.join(app.getPath('userData'), 'google.json');
let saved; // { sealed, email, scopes, off }
function load() { if (saved !== undefined) return saved; try { saved = JSON.parse(fs.readFileSync(file(), 'utf8')); } catch { saved = null; } return saved; }
function store(next) { saved = next; try { if (next) fs.writeFileSync(file(), JSON.stringify(next), { mode: 0o600 }); else fs.rmSync(file(), { force: true }); } catch {} tell(); }
const tell = () => { for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) try { w.webContents.send('google:changed', status()); } catch {} };
const granted = key => Boolean(load()?.scopes?.includes(S[key]));
const on = key => granted(key) && !load()?.off?.includes(key);
function status() {
  const s = load();
  return { available: Boolean(loadClient()), signedIn: Boolean(s?.sealed), email: s?.email || '', can: { calendar: granted('calendar'), mail: granted('mail'), send: granted('send') }, on: { calendar: on('calendar'), mail: on('mail'), send: on('send') } };
}

let token = null, cache = {};
async function post(url, form) { return net.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form).toString(), signal: AbortSignal.timeout(15000) }); }
async function accessToken() {
  if (token && Date.now() < token.until) return token.value;
  const s = load(), c = loadClient();
  if (!s?.sealed || !c) throw new Error('signed-out');
  const r = await post(TOKEN, { client_id: c.id, client_secret: c.secret, grant_type: 'refresh_token', refresh_token: safeStorage.decryptString(Buffer.from(s.sealed, 'base64')) });
  const j = await r.json().catch(() => ({}));
  if (j.error === 'invalid_grant') { token = null; cache = {}; store(null); throw new Error('signed-out'); } // you took the access away at Google, or it expired
  if (!r.ok || !j.access_token) throw new Error('google-' + r.status);
  token = { value: j.access_token, until: Date.now() + (Number(j.expires_in) || 3000) * 1000 - 60000 };
  return token.value;
}
async function api(url, init = {}) {
  const r = await net.fetch(url, { ...init, headers: { Authorization: `Bearer ${await accessToken()}`, ...(init.headers || {}) }, signal: AbortSignal.timeout(init.timeout || 15000) });
  if (r.status === 401) token = null;
  if (!r.ok) throw new Error('google-' + r.status);
  return r.status === 204 ? {} : r.json();
}

// ---------- signing in ----------
let waiting = null;
const PAGE = done => `<!doctype html><meta charset="utf-8"><title>Twenty-One</title><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font:600 20px 'Segoe UI',sans-serif">${done ? T('Done. You can close this tab and go back to Twenty-One.') : T('Not signed in. You can close this tab.')}</body>`;
function signIn() {
  const c = loadClient();
  if (!c) return Promise.resolve({ ok: false, error: 'not-available' });
  if (!safeStorage.isEncryptionAvailable()) return Promise.resolve({ ok: false, error: 'no-safe-storage' }); // never on disk without Windows' lock
  waiting?.(); // (a second click: the first try ends)
  return new Promise(resolve => {
    const state = b64url(crypto.randomBytes(24)), { verifier, challenge } = pkce();
    let finished = false, timer = null, server = null;
    const end = result => { if (finished) return; finished = true; clearTimeout(timer); waiting = null; try { server.close(); server.closeAllConnections?.(); } catch {} resolve(result); };
    waiting = () => end({ ok: false, error: 'cancelled' });
    server = http.createServer(async (req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/') { res.writeHead(404).end(); return; }
      if (u.searchParams.get('state') !== state) { res.writeHead(400).end(); return; } // not from the browser you just sent to Google
      const code = u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(PAGE(Boolean(code)));
      if (!code) return end({ ok: false, error: u.searchParams.get('error') === 'access_denied' ? 'cancelled' : 'failed' });
      try {
        const r = await post(TOKEN, { client_id: c.id, client_secret: c.secret, code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: `http://127.0.0.1:${server.address().port}/` });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.refresh_token) return end({ ok: false, error: 'failed' });
        token = j.access_token ? { value: j.access_token, until: Date.now() + (Number(j.expires_in) || 3000) * 1000 - 60000 } : null; cache = {};
        store({ sealed: safeStorage.encryptString(j.refresh_token).toString('base64'), email: emailOf(j.id_token), scopes: String(j.scope || '').split(' '), off: load()?.off || [] });
        end({ ok: true, ...status() });
      } catch { end({ ok: false, error: 'failed' }); }
    });
    server.on('error', () => end({ ok: false, error: 'failed' }));
    server.listen(0, '127.0.0.1', () => {
      timer = setTimeout(() => end({ ok: false, error: 'timeout' }), WAIT_LOGIN);
      shell.openExternal(authUrl({ clientId: c.id, redirect: `http://127.0.0.1:${server.address().port}/`, state, challenge })).catch(() => end({ ok: false, error: 'failed' }));
    });
  });
}
async function signOut() {
  const s = load();
  try { if (s?.sealed) await post(REVOKE, { token: safeStorage.decryptString(Buffer.from(s.sealed, 'base64')) }); } catch {} // (offline: it is gone here anyway; Google's own page can still end it)
  token = null; cache = {}; store(null);
  return status();
}
function setFeature(key, value) { const s = load(); if (!s || !S[key]) return status(); const off = new Set(s.off || []); if (value) off.delete(key); else off.add(key); cache = {}; store({ ...s, off: [...off] }); return status(); }

// ---------- what it does ----------
/** Today and the coming two months, from every calendar you show in Google Calendar. */
async function events() {
  if (!on('calendar')) return [];
  if (cache.events && Date.now() - cache.events.at < 2 * 60000) return cache.events.list;
  const from = new Date(); from.setHours(0, 0, 0, 0);
  const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: new Date(from.getTime() + 62 * 864e5).toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250', fields: 'items(id,summary,status,start,end)' });
  let ids = ['primary'];
  if (granted('calendars')) try { const l = await api(`${CAL}/users/me/calendarList?minAccessRole=reader&fields=${encodeURIComponent('items(id,selected)')}`); const shown = (l.items || []).filter(c => c.selected).map(c => c.id).slice(0, 20); if (shown.length) ids = shown; } catch {}
  const parts = await Promise.all(ids.map(id => api(`${CAL}/calendars/${encodeURIComponent(id)}/events?${q}`).then(r => toEvents(r.items, id)).catch(() => [])));
  const list = parts.flat().sort((a, b) => a.start - b.start).slice(0, 400);
  cache.events = { at: Date.now(), list };
  return list;
}
async function addEvent({ title, start, end, allDay }) {
  const name = oneLine(title).slice(0, 200), a = Number(start), b = Number(end);
  if (!on('calendar') || !name || !(a > 0) || !(b > a)) return { ok: false };
  const day = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const body = allDay ? { summary: name, start: { date: day(a) }, end: { date: day(b) } } : { summary: name, start: { dateTime: new Date(a).toISOString() }, end: { dateTime: new Date(b).toISOString() } };
  const r = await api(`${CAL}/calendars/primary/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  delete cache.events;
  return { ok: true, id: r.id };
}
/** Only numbers: how many unread in your inbox and in Gmail's three tabs. */
async function mailCounts() {
  if (!on('mail')) return null;
  if (cache.mail && Date.now() - cache.mail.at < 60000) return cache.mail.counts;
  const unread = id => api(`${MAIL}/labels/${id}?fields=messagesUnread`).then(r => Number(r.messagesUnread) || 0);
  const [inbox, primary, updates, promotions] = await Promise.all(['INBOX', 'CATEGORY_PERSONAL', 'CATEGORY_UPDATES', 'CATEGORY_PROMOTIONS'].map(unread));
  const counts = { inbox, primary, updates, promotions };
  cache.mail = { at: Date.now(), counts };
  return counts;
}
/** Only when you press Send. */
async function sendFiles({ to, subject, text, paths = [] }) {
  if (!on('send')) return { ok: false, error: 'off' };
  if (!validEmail(to)) return { ok: false, error: 'address' };
  const files = []; let total = 0;
  for (const p of paths.slice(0, 20).map(String)) {
    const stat = await fs.promises.stat(p).catch(() => null);
    if (!stat?.isFile()) return { ok: false, error: 'file' };
    if ((total += stat.size) > MAX_FILE) return { ok: false, error: 'too-big' };
    files.push({ name: path.basename(p), data: await fs.promises.readFile(p) });
  }
  await api(`${MAIL_UP}/messages/send?uploadType=media`, { method: 'POST', headers: { 'Content-Type': 'message/rfc822' }, body: mimeMessage({ to, subject, text, files }), timeout: 120000 });
  return { ok: true };
}
const MAIL_TABS = { primary: '#inbox', updates: '#category/updates', promotions: '#category/promo' };
function openMail(tab) { const s = load(); shell.openExternal(`https://mail.google.com/mail/${s?.email ? `?authuser=${encodeURIComponent(s.email)}` : ''}${MAIL_TABS[tab] || MAIL_TABS.primary}`).catch(() => {}); }

ipcMain.handle('google:status', () => status());
ipcMain.handle('google:sign-in', () => signIn());
ipcMain.handle('google:sign-out', () => signOut());
ipcMain.handle('google:feature', (e, { key, value } = {}) => setFeature(String(key), Boolean(value)));
ipcMain.handle('google:mail', () => mailCounts().catch(() => null));
ipcMain.handle('google:send', (e, m) => sendFiles(m || {}).catch(() => ({ ok: false, error: 'failed' })));
ipcMain.on('google:open-mail', (e, tab) => openMail(String(tab)));

module.exports = { status, signIn, signOut, events, addEvent, mailCounts, sendFiles, on, api, CAL, pkce, authUrl, toEvents, mimeMessage, validEmail, emailOf, SCOPES };

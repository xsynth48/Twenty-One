// Twenty-One Drop (beta 56): files between the island and your phone, like AirDrop for Windows. Click "Phone" on the tray
// page, scan the code with your phone's camera: the files in the tray are on your phone, and what you send from your phone
// lands in Downloads and in the tray. It goes through api.twocode.nl (website/cloud/src/drop.js) so it works on every
// network (no firewall question, also with the phone on 4G), end-to-end encrypted: the key is made here and only travels
// in the QR code, after the '#' that browsers never send. A drop stops after an hour.
const { app, ipcMain, BrowserWindow, shell } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const API = process.env.TWOCODE_DROP_API || 'https://api.twocode.nl';
const CHUNK = 4 * 1024 * 1024, MAX_FILE = 500 * 1024 * 1024;
const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', bmp: 'image/bmp', svg: 'image/svg+xml',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', pdf: 'application/pdf', txt: 'text/plain',
  zip: 'application/zip', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };

let drop = null;   // { id, token, key, url, expires, sent: Map(path → {fid, name, size, done, skip}), got: Set(fid), phone, phoneSeen, serverNow }
let state = { on: false };
let timer = null, ticking = false, pumping = false;

const seal = (d, plain, label) => {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-128-gcm', d.key, iv);
  c.setAAD(Buffer.from(d.id + ':' + label));
  return Buffer.concat([iv, c.update(plain), c.final(), c.getAuthTag()]);
};
const open = (d, buf, label) => {
  const x = crypto.createDecipheriv('aes-128-gcm', d.key, buf.subarray(0, 12));
  x.setAAD(Buffer.from(d.id + ':' + label)); x.setAuthTag(buf.subarray(buf.length - 16));
  return Buffer.concat([x.update(buf.subarray(12, buf.length - 16)), x.final()]);
};
async function call(method, p, body, raw) {
  const headers = { Authorization: 'Bearer ' + drop.token };
  if (body && !raw) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + p, { method, headers, body: raw ? body : body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(120000) });
  if (res.status === 410) { const e = new Error('expired'); e.expired = true; throw e; }
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw new Error(j.error || 'answered ' + res.status);
  return j;
}
function installId() { try { return fs.readFileSync(path.join(app.getPath('userData'), 'install-id'), 'utf8').trim().toLowerCase(); } catch { return ''; } }
function userName() { // "levon" → "Levon" (the phone page says "to Levon's PC")
  let n = ''; try { n = os.userInfo().username || ''; } catch {}
  n = n.split(/[\s.@_-]/)[0] || '';
  return /^[\p{L}]{2,24}$/u.test(n) ? n[0].toUpperCase() + n.slice(1) : '';
}
function safeName(name) {
  let s = String(name || '').normalize('NFC').replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_').replace(/^[ .]+|[ .]+$/g, '');
  if (s.length > 150) { const ext = path.extname(s).slice(0, 12); s = s.slice(0, 150 - ext.length) + ext; }
  if (!s || /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(s)) s = 'file' + (s ? '-' + s : '');
  return s;
}
function unique(p) {
  if (!fs.existsSync(p)) return p;
  const ext = path.extname(p), base = ext ? p.slice(0, -ext.length) : p;
  for (let i = 2; i < 1000; i++) { const q = `${base} (${i})${ext}`; if (!fs.existsSync(q)) return q; }
  return `${base}-${Date.now()}${ext}`;
}
const trayPaths = () => (app.twocodeTray?.() || []).filter(p => { try { return fs.statSync(p).isFile(); } catch { return false; } });

// ---------- what the island sees ----------
function view() {
  if (!drop) return { ...state };
  const seen = drop.phoneSeen && (drop.serverNow || Date.now()) - drop.phoneSeen < 15000;
  const sent = [...drop.sent.entries()].map(([path, x]) => ({ ...x, path }));
  return { ...state, on: true, url: drop.url, expires: drop.expires, phone: seen ? drop.phone || 'phone' : '', phoneEver: Boolean(drop.phoneSeen),
    ready: sent.filter(x => x.done).length, readyBytes: sent.filter(x => x.done).reduce((a, x) => a + x.size, 0), tooBig: sent.filter(x => x.skip === 'big').map(x => x.name),
    files: sent.filter(x => !x.skip).slice(0, 6).map(x => ({ path: x.path, name: x.name, done: Boolean(x.done) })) }; // (the island shows them small, with a check once on the phone)
}
function push() {
  const v = view();
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL())) w.webContents.send('drop:status', v);
}
function islandSay(event) {
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL())) w.webContents.send('drop:event', event);
}

// ---------- start and stop ----------
async function start() {
  if (drop && drop.expires - Date.now() > 5 * 60000) return view();
  await stop(true);
  state = { on: false, starting: true }; push();
  const install = installId();
  try {
    if (!/^[0-9a-f]{32}$/.test(install)) throw new Error('no install id');
    const res = await fetch(API + '/v1/drop/new', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ install }), signal: AbortSignal.timeout(20000) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) throw new Error(j.error || 'answered ' + res.status);
    const key = crypto.randomBytes(16);
    drop = { id: j.id, token: j.token, key, expires: j.expires, url: `${API}/d/${j.id}#${key.toString('base64url')}`, sent: new Map(), got: new Set(), phone: '', phoneSeen: 0 };
    state = { on: true, received: [] };
    await call('POST', `/v1/drop/${drop.id}/meta`, { meta: seal(drop, Buffer.from(JSON.stringify({ user: userName() })), 'session').toString('base64url') }).catch(() => {});
    clearInterval(timer); timer = setInterval(() => { tick(); pump(); }, 2000);
    tick(); pump();
  } catch (e) {
    drop = null; state = { on: false, error: /fetch failed|timeout|abort|ENOTFOUND|ECONN/i.test(String(e.message)) ? 'offline' : 'server' };
  }
  push(); return view();
}
async function stop(quiet) {
  clearInterval(timer); timer = null;
  const was = drop; drop = null;
  if (was) fetch(`${API}/v1/drop/${was.id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + was.token }, signal: AbortSignal.timeout(10000) }).catch(() => {});
  state = { on: false };
  if (!quiet) push();
  return view();
}
function expired() { clearInterval(timer); timer = null; drop = null; state = { on: false, expired: true }; push(); }

// ---------- the phone's side, every 2 s: is it there, and did it send something ----------
async function tick() {
  if (!drop || ticking) return; ticking = true;
  const d = drop;
  try {
    if (Date.now() > d.expires) { expired(); return; }
    const s = await call('GET', `/v1/drop/${d.id}`);
    if (drop !== d) return;
    const was = view().phone;
    d.phone = s.phone; d.phoneSeen = s.phoneSeen; d.serverNow = s.now;
    if (!was && view().phone) islandSay({ kind: 'phone', phone: d.phone });
    for (const f of s.files) if (f.dir === 'phone' && f.done && !d.got.has(f.id)) await receive(d, f);
    delete state.error;
  } catch (e) {
    if (e.expired) expired(); else if (drop === d) state.error = 'offline';
  } finally { ticking = false; push(); }
}
async function receive(d, f) {
  d.got.add(f.id);
  let name = 'file', dest = '', tmp = '';
  try {
    const meta = JSON.parse(open(d, Buffer.from(f.meta, 'base64url'), f.id + ':meta').toString('utf8'));
    name = safeName(meta.name);
    const dir = app.getPath('downloads');
    dest = unique(path.join(dir, name)); tmp = dest + '.twocode-part';
    state.receiving = { name, pct: 0 }; push();
    const fd = fs.openSync(tmp, 'w');
    try {
      for (let n = 0; n < f.chunks; n++) {
        const res = await fetch(`${API}/v1/drop/${d.id}/${f.id}/${n}`, { headers: { Authorization: 'Bearer ' + d.token }, signal: AbortSignal.timeout(120000) });
        if (!res.ok) throw new Error('piece ' + n + ': ' + res.status);
        fs.writeSync(fd, open(d, Buffer.from(await res.arrayBuffer()), `${f.id}:${n}/${f.chunks}`));
        state.receiving = { name, pct: (n + 1) / f.chunks }; push();
      }
    } finally { fs.closeSync(fd); }
    dest = unique(dest); fs.renameSync(tmp, dest);
    // from the internet, as far as Windows is concerned: SmartScreen checks it before it runs (Mark of the Web)
    try { fs.writeFileSync(dest + ':Zone.Identifier', '[ZoneTransfer]\r\nZoneId=3\r\n'); } catch {}
    state.received = [path.basename(dest), ...(state.received || [])].slice(0, 5); state.last = dest;
    d.sent.set(dest, { name: path.basename(dest), size: 0, skip: 'phone' }); // it came from the phone: not sent back to it
    app.emit('twocode-tray-add', [dest]);
    islandSay({ kind: 'received', name: path.basename(dest), phone: d.phone });
  } catch (e) {
    try { if (tmp) fs.unlinkSync(tmp); } catch {}
    islandSay({ kind: 'failed', name });
  } finally {
    delete state.receiving;
    call('DELETE', `/v1/drop/${d.id}/${f.id}`).catch(() => {}); // on the PC now (or broken): not kept online
  }
}

// ---------- the PC's side: everything in the tray goes to the phone, one file at a time ----------
async function pump() {
  if (!drop || pumping) return; pumping = true;
  const d = drop;
  try {
    const tray = trayPaths();
    for (const [p, x] of d.sent) if (!tray.includes(p)) { // taken out of the tray: off the phone too
      d.sent.delete(p); if (x.fid) await call('DELETE', `/v1/drop/${d.id}/${x.fid}`).catch(() => {});
    }
    for (const p of tray) {
      if (drop !== d) return;
      if (d.sent.has(p)) continue;
      await send(d, p);
    }
  } catch (e) {
    if (e.expired) expired();
  } finally { pumping = false; delete state.sending; push(); }
}
async function send(d, p) {
  const size = fs.statSync(p).size, name = path.basename(p);
  if (size > MAX_FILE) { d.sent.set(p, { name, size, skip: 'big' }); return; }
  const fid = crypto.randomBytes(8).toString('base64url'), chunks = Math.max(1, Math.ceil(size / CHUNK));
  const type = TYPES[path.extname(name).slice(1).toLowerCase()] || '';
  const entry = { fid, name, size, done: false }; d.sent.set(p, entry);
  try {
    await call('POST', `/v1/drop/${d.id}/files`, { id: fid, dir: 'pc', meta: seal(d, Buffer.from(JSON.stringify({ name, size, type })), fid + ':meta').toString('base64url'), chunks, size });
    const fd = fs.openSync(p, 'r');
    try {
      for (let n = 0; n < chunks; n++) {
        if (drop !== d) return;
        const len = Math.min(CHUNK, size - n * CHUNK), buf = Buffer.alloc(Math.max(0, len));
        fs.readSync(fd, buf, 0, buf.length, n * CHUNK);
        await call('PUT', `/v1/drop/${d.id}/${fid}/${n}`, seal(d, buf, `${fid}:${n}/${chunks}`), true);
        state.sending = { name, pct: (n + 1) / chunks }; push();
      }
    } finally { fs.closeSync(fd); }
    await call('POST', `/v1/drop/${d.id}/${fid}/done`);
    entry.done = true;
  } catch (e) {
    if (e.expired) throw e;
    d.sent.delete(p); // tried again on the next round
  }
}

// ---------- the island asks ----------
const island = e => /mascot\.html/.test(e.senderFrame?.url || '');
ipcMain.handle('drop:start', e => (island(e) ? start() : null));
ipcMain.handle('drop:stop', e => (island(e) ? stop() : null));
ipcMain.handle('drop:status', e => (island(e) ? view() : null));
ipcMain.on('drop:show', e => { if (island(e) && state.last && fs.existsSync(state.last)) shell.showItemInFolder(state.last); });
app.on('will-quit', () => { if (drop) stop(true); });

module.exports = { start, stop, view, safeName, unique };

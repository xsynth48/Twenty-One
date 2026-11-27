// The music in the island, for everyone: what plays on this PC, read from Windows itself (media-session.ps1), the same
// info as the media controls next to the volume. Spotify without logging in, YouTube in a browser, and other music apps.
// Why: Twenty-One's Spotify login (the Web API) only works for accounts the developer adds by hand (Spotify's Development
// Mode), so for everyone else Spotify answered 403 and the island said "Nothing is playing". The login still works for
// those accounts and then wins (it knows your other devices); when it fails or has nothing, Windows answers.
// One hidden PowerShell, started the first time music is asked for, closed together with Twenty-One.
const { app, shell, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');

let child = null, startedAt = 0, now = { active: false }, at = 0, cover = { key: '', url: '' }, last = 'api';
let apiBlockedUntil = 0; // the Web API refused this account (Development Mode): leave it alone for a while
let onVolume = null;     // extras-main.cjs: the Windows volume, reported by the same helper
let guardWanted = false; // focus-guard-main.cjs: report the window in front (only while the focus guard is on)
let meterWanted = false; // the sound wave (extras-ui.js): how loud this PC plays, 10 times a second while music plays
let noticesWanted = false; // other apps' notifications in the island (notify-ui.js): only while you switched it on

function start() {
  if (child || process.platform !== 'win32' || Date.now() - startedAt < 10000) return; // at most one try per 10 s
  if (process.env.REC_OUT) return; // test recordings: never read or control the music really playing on this PC
  startedAt = Date.now();
  try {
    child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'media-session.ps1')],
      { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
  } catch { child = null; return; }
  if (guardWanted) try { child.stdin.write('guard 1\n'); } catch {} // a restarted helper keeps watching
  if (meterWanted) try { child.stdin.write('meter 1\n'); } catch {}
  if (noticesWanted) try { child.stdin.write('notify 1\n'); } catch {}
  let buf = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', d => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) { take(buf.slice(0, i).trim()); buf = buf.slice(i + 1); }
    if (buf.length > 8e6) buf = '';
  });
  child.stdin.on('error', () => {});
  child.on('error', () => { child = null; });
  child.on('exit', () => { child = null; now = { active: false }; });
}
app.on('will-quit', () => { try { child?.stdin.end(); child?.kill(); } catch {} });

const toIsland = (channel, data) => { for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL())) w.webContents.send(channel, data); };

function take(line) {
  let o; try { o = JSON.parse(line); } catch { return; }
  if ('peak' in o) { for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL())) w.webContents.send('music:peak', Number(o.peak) || 0); return; }
  if (o.winNotify) { toIsland('winnotice:status', String(o.winNotify)); return; } // may Twenty-One read other apps' notifications?
  if (o.winNotice) { toIsland('winnotice:new', o.winNotice); return; } // one new notification from another app; nothing is kept here
  if ('spoke' in o) { const done = speaking.get(String(o.spoke)); if (done) done(o); return; } // Robo's voice (speak below)
  if (o.net) { netNow = { ...o.net, at: Date.now() }; for (const done of netWaiting.splice(0)) done(netNow); return; } // Wi-Fi and Bluetooth (net below)
  if (o.radio) { radioWaiting.shift()?.(o.radio); return; }
  if ('fullscreen' in o) { app.emit('twocode-fullscreen', Boolean(o.fullscreen), String(o.screen || '')); return; } // game mode (game-mode-main.cjs)
  if (o.front) { app.emit('twocode-front', o.front); return; } // the window in front (focus-guard-main.cjs)
  if ('volume' in o) { onVolume?.({ level: Number(o.volume), muted: Boolean(o.muted) }); return; } // the volume bar (extras-main.cjs)
  if (o.seekFailed) { for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL())) w.webContents.send('music:seek-failed'); return; } // (beta 83) the music app said no to a jump
  if (o.art) { // the cover, once per song: PNG or JPEG by its first bytes
    const head = Buffer.from(o.art.slice(0, 8), 'base64');
    const type = head[0] === 0x89 ? 'image/png' : head[0] === 0xff ? 'image/jpeg' : head[0] === 0x47 ? 'image/gif' : 'image/png';
    cover = { key: String(o.key || ''), url: `data:${type};base64,${o.art}` };
  }
  // (beta 107: or a better cover for the same song: the helper looks again 1.5 s and 4.5 s after a song starts)
  const changed = String(o.key || '') !== String(now.key || '') || Boolean(o.playing) !== Boolean(now.playing) || Boolean(o.art);
  delete o.art; now = o; at = Date.now();
  // another song (or play/pause): tell the island now, it otherwise asks every 4 s (the old song's lyrics ran on)
  if (changed) for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL())) w.webContents.send('music:changed');
}

// (beta 83) Apple Music can put the album in the artist field ("Artist — Album"): only the artist goes on, or the lyrics are never found
// (a customer: they did not come by themselves). Only for Apple's app: other artists may really have a dash in their name.
const artistOf = (artist, app) => { const a = String(artist || ''), m = /apple/i.test(String(app || '')) && /^(.+?)\s+[—–]\s+.+$/.exec(a); return m ? m[1] : a; };
const appName = id => /spotify/i.test(id) ? 'Spotify' : /apple/i.test(id) ? 'Apple Music' : /chrome/i.test(id) ? 'Chrome' : /edge/i.test(id) ? 'Edge' : /firefox/i.test(id) ? 'Firefox'
  : /zune|music/i.test(id) ? 'Media Player' : /brave/i.test(id) ? 'Brave' : /opera/i.test(id) ? 'Opera' : 'Deze pc';
const device = () => ({ id: 'this-pc', name: appName(String(now.app || '')), type: 'Computer', active: true, volume: null, here: true });

/** What plays according to Windows, in the same shape as the Spotify answer (the island reads both the same way). */
function local() {
  start();
  if (!now.active || !now.title) return { ok: true, connected: process.platform === 'win32', active: false, source: 'windows' };
  const playing = Boolean(now.playing), duration = Number(now.duration) || 0;
  let progress = Number(now.position) || 0;
  if (playing) progress += Date.now() - at; // the script only writes when something changes
  if (duration) progress = Math.min(progress, duration);
  return {
    ok: true, connected: true, active: true, source: 'windows', is_playing: playing, progress_ms: Math.round(progress), duration_ms: duration,
    track: { id: String(now.key || ''), uri: '', name: String(now.title), artist: artistOf(now.artist || now.album, now.app), image_url: cover.key === now.key ? cover.url : '' },
    device: device()
  };
}

function send(line) { start(); try { child?.stdin.write(line + '\n'); return { ok: Boolean(child) }; } catch { return { ok: false }; } }
ipcMain.on('music:meter', (e, on) => { meterWanted = Boolean(on); send('meter ' + (meterWanted ? 1 : 0)); });
ipcMain.on('winnotice:listen', (e, on) => { noticesWanted = Boolean(on); if (noticesWanted || child) send('notify ' + (noticesWanted ? 1 : 0)); });
ipcMain.on('winnotice:hide', (e, id) => { if (/^\d{1,12}$/.test(String(id))) send('notify-hide ' + id); });
ipcMain.on('winnotice:settings', () => { shell.openExternal('ms-settings:privacy-notifications').catch(() => {}); });
// a click on the message opens the app it came from (only a real app id from Windows; never through a shell)
ipcMain.on('winnotice:open', (e, appId) => { if (/^[\w.!{}\\ ()-]{1,200}$/.test(String(appId))) try { spawn('explorer.exe', ['shell:AppsFolder\\' + appId], { detached: true, stdio: 'ignore' }).unref(); } catch {} });

/**
 * Wraps the Spotify Web API functions of main.js: the API first when you logged in (and it works for your account),
 * otherwise Windows. Returns the functions the IPC handlers call.
 */
function music({ hasLogin, state, control, seek, devices, transfer }) {
  const useApi = () => hasLogin() && Date.now() >= apiBlockedUntil;
  const refused = r => r && r.ok === false && /\b403\b|forbidden|not registered|developer|premium|allowlist/i.test(String(r.error || ''));
  return {
    async state() {
      if (useApi()) {
        const r = await state();
        if (refused(r)) apiBlockedUntil = Date.now() + 10 * 60 * 1000;
        else if (r?.ok !== false && r?.active) { last = 'api'; return r; }
      }
      const w = local(); last = 'windows'; return w;
    },
    async control(action) {
      if (action === 'open') return control('open');
      if (last === 'api' && useApi()) { const r = await control(action); if (r?.ok) return r; }
      if (action === 'play' && !now.active) return control('open'); // nothing to play here yet: open Spotify
      const map = { play: 'play', pause: 'pause', next: 'next', previous: 'previous' };
      return map[action] ? send(map[action]) : { ok: false, error: 'Onbekende actie.' };
    },
    async seek(ms) {
      if (last === 'api' && useApi()) { const r = await seek(ms); if (r?.ok) return r; }
      return send('seek ' + Math.max(0, Math.round(Number(ms) || 0)));
    },
    async devices() { return last === 'api' && useApi() ? devices() : { ok: true, devices: now.active ? [device()] : [] }; },
    async transfer(id) { return last === 'api' && useApi() ? transfer(id) : { ok: true }; },
  };
}

/** The Windows volume through the music helper: reports go to report({ level, muted }); the helper starts right away. */
function volume(report) { onVolume = report; start(); }
const volumeSet = level => send('vol ' + Math.max(0, Math.min(100, Math.round(Number(level) || 0))));

// the focus guard: start or stop reporting the window in front; minimize one (Robo's "Go back")
function guard(on) { guardWanted = Boolean(on); if (guardWanted || child) send('guard ' + (guardWanted ? 1 : 0)); }
function minimize(hwnd) { if (Number.isFinite(Number(hwnd))) send('min ' + Math.trunc(Number(hwnd))); }

// Robo's voice: the helper makes a WAV with a Windows voice of that language; the island plays it (chat-ui.js).
// → { ok, wav (bytes), voice } or { ok: false, error: 'novoice' | ... }
const speaking = new Map(); let speakId = 0;
function speak(text, lang) {
  const id = String(++speakId), b64 = Buffer.from(String(text || ''), 'utf8').toString('base64');
  return new Promise(resolve => {
    const timer = setTimeout(() => { speaking.delete(id); resolve({ ok: false, error: 'slow' }); }, 10000);
    speaking.set(id, o => {
      clearTimeout(timer); speaking.delete(id);
      if (!o.file) return resolve({ ok: false, error: String(o.error || 'failed') });
      const fs = require('node:fs');
      try { const wav = fs.readFileSync(o.file); fs.unlink(o.file, () => {}); resolve({ ok: true, wav, voice: String(o.voice || '') }); }
      catch { resolve({ ok: false, error: 'failed' }); }
    });
    if (!send(`say ${id} ${['nl', 'es', 'pt', 'de', 'fr', 'hi'].includes(lang) ? lang : 'en'} ${b64}`).ok) { clearTimeout(timer); speaking.delete(id); resolve({ ok: false, error: 'failed' }); }
  });
}
// talking to Robo: Windows' voice typing (Win+H) in the chat field that has the keyboard
const listen = () => send('listen');

// Wi-Fi and Bluetooth (net-ui.js, system-main.cjs): what the helper read last, asked again when it is older than 1.5 s.
// → { wifi: { on, ssid, bars } | null, bt: { on, devices } | null, wired } or { none: true } (no answer / no radios)
let netNow = null; const netWaiting = [], radioWaiting = [];
function net() {
  if (netNow && Date.now() - netNow.at < 1500) return Promise.resolve(netNow);
  return new Promise(resolve => {
    const timer = setTimeout(() => { const i = netWaiting.indexOf(done); if (i >= 0) netWaiting.splice(i, 1); resolve(netNow || { none: true }); }, 4000);
    const done = v => { clearTimeout(timer); resolve(v); };
    if (netWaiting.push(done) === 1 && !send('net').ok) { netWaiting.splice(0); clearTimeout(timer); resolve(netNow || { none: true }); }
  });
}
// switch Wi-Fi or Bluetooth on or off, like the iPhone's control center → { ok, why } (why: 'DeniedBySystem', 'none', ...)
function radio(kind, on) {
  if (kind !== 'wifi' && kind !== 'bt') return Promise.resolve({ ok: false, why: 'bad' });
  return new Promise(resolve => {
    const timer = setTimeout(() => { const i = radioWaiting.indexOf(done); if (i >= 0) radioWaiting.splice(i, 1); resolve({ ok: false, why: 'slow' }); }, 9000);
    const done = v => { clearTimeout(timer); netNow = null; resolve({ ok: Boolean(v.ok), why: String(v.why || '') }); };
    radioWaiting.push(done);
    if (!send(`radio ${kind} ${on ? 1 : 0}`).ok) { radioWaiting.splice(radioWaiting.indexOf(done), 1); clearTimeout(timer); resolve({ ok: false, why: 'failed' }); }
  });
}

module.exports = { music, volume, volumeSet, guard, minimize, speak, listen, net, radio, artistOf };

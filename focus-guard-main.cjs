// Focus guard: Robo stops you for a moment when you open an app or site that distracts you (YouTube, TikTok, …), like
// "one sec" on a phone. A calm screen asks you to breathe in and out first; then you choose: go back (the window is
// minimized, Robo is happy) or open it anyway (left alone for a few minutes). Settings → Focus guard.
// What it looks at: only the title and program of the window in front (media-session.ps1, while the guard is on), on
// this PC, compared with what you picked. Nothing is stored or sent, only today's counts (userData/focus-guard.json).
const { app, ipcMain, BrowserWindow, screen } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const media = require('./media-main.cjs');
const license = require('./license-main.cjs'); // the Focus guard is a paid app (Settings → Apps)
const allowedToRun = () => config.on && license.has('guard');

const SITES = {
  youtube: { name: 'YouTube', title: /youtube/i },
  tiktok: { name: 'TikTok', title: /tiktok/i },
  instagram: { name: 'Instagram', title: /instagram/i },
  x: { name: 'X', title: /(\s\/\sx$|twitter)/i },
  reddit: { name: 'Reddit', title: /reddit/i },
  facebook: { name: 'Facebook', title: /facebook/i },
  netflix: { name: 'Netflix', title: /netflix/i, proc: /netflix/i },
  twitch: { name: 'Twitch', title: /twitch/i },
  discord: { name: 'Discord', title: /discord/i, proc: /^discord$/i },
};
const BROWSER = /^(chrome|msedge|firefox|brave|opera|opera_gx|vivaldi|arc|librewolf|waterfox|thorium|floorp|zen|iexplore)$/i;
const BROWSER_NAME = /\s[-–—]\s(google chrome|microsoft.?\s?edge|mozilla firefox|brave|opera|vivaldi|arc|zen browser)\s*$/i;
const OURS = /^(twocode|electron)$/i;

let config = { on: false, sites: [], custom: '', wait: 5, allow: 5, lang: 'en' };
let win = null, asking = null;
const allowed = new Map(), lastAsk = new Map();

const file = () => path.join(app.getPath('userData'), 'focus-guard.json');
const today = () => new Date().toISOString().slice(0, 10);
function stats() {
  try { const s = JSON.parse(fs.readFileSync(file(), 'utf8')); if (s.day === today()) return s; } catch {}
  return { day: today(), asked: 0, back: 0, anyway: 0 };
}
function count(key) { const s = stats(); s[key] = (s[key] || 0) + 1; try { fs.writeFileSync(file(), JSON.stringify(s)); } catch {} return s; }

// which of your picks this window is (a site only counts in a browser, by its tab title; an app by its program)
function match(front) {
  const proc = String(front.proc || ''), raw = String(front.title || ''), browser = BROWSER.test(proc);
  const title = raw.replace(BROWSER_NAME, '');
  for (const id of config.sites) {
    const s = SITES[id]; if (!s) continue;
    if ((browser && s.title.test(title)) || (s.proc && s.proc.test(proc))) return { id, name: s.name };
  }
  for (const word of String(config.custom || '').split(',').map(w => w.trim().toLowerCase()).filter(w => w.length >= 2)) {
    if ((browser && title.toLowerCase().includes(word)) || proc.toLowerCase().includes(word)) return { id: 'custom:' + word, name: word[0].toUpperCase() + word.slice(1) };
  }
  return null;
}

function island() { return BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL())); }
function tellIsland(event) { try { island()?.webContents.send('guard:event', event); } catch {} }

function ask(hit, front) {
  if (win && !win.isDestroyed()) return;
  asking = { ...hit, hwnd: front.hwnd };
  lastAsk.set(hit.id, Date.now()); count('asked');
  const d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  win = new BrowserWindow({
    ...d.bounds, frame: false, transparent: true, resizable: false, movable: false, minimizable: false, maximizable: false,
    skipTaskbar: true, alwaysOnTop: true, show: false, hasShadow: false, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'guard-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile(path.join(__dirname, 'guard.html'), { query: { name: hit.name, wait: String(config.wait), allow: String(config.allow), lang: config.lang } });
  win.once('ready-to-show', () => { if (!win || win.isDestroyed()) return; win.show(); win.focus(); });
  win.on('closed', () => { win = null; asking = null; });
}

function choose(kind) {
  const a = asking; if (!a) return;
  if (kind === 'anyway') { allowed.set(a.id, Date.now() + config.allow * 60000); count('anyway'); tellIsland({ kind: 'anyway', name: a.name }); }
  else { media.minimize(a.hwnd); count('back'); tellIsland({ kind: 'back', name: a.name }); }
  asking = null;
  try { win?.close(); } catch {}
}

app.on('twocode-front', front => {
  if (!allowedToRun() || !front) return;
  if (OURS.test(String(front.proc || ''))) return;              // Twenty-One itself (also this calm screen)
  const hit = match(front);
  if (!hit) return;
  if ((allowed.get(hit.id) || 0) > Date.now()) return;           // you chose "open anyway" a moment ago
  if (Date.now() - (lastAsk.get(hit.id) || 0) < 2500) return;    // just asked (the window flickers while it opens)
  ask(hit, front);
});

const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
const fromGuard = e => /guard\.html/.test(e.senderFrame?.url || '');
ipcMain.on('guard:config', (e, c) => {
  if (!fromIsland(e) || !c) return;
  config = {
    on: Boolean(c.on), sites: Array.isArray(c.sites) ? c.sites.filter(s => SITES[s]) : [], custom: String(c.custom || '').slice(0, 300),
    wait: [3, 5, 10].includes(Number(c.wait)) ? Number(c.wait) : 5, allow: [5, 15, 30].includes(Number(c.allow)) ? Number(c.allow) : 5,
    lang: c.lang === 'nl' ? 'nl' : 'en',
  };
  if (!allowedToRun() && win && !win.isDestroyed()) win.close();
  media.guard(allowedToRun());
});
ipcMain.handle('guard:stats', e => (fromIsland(e) ? stats() : null));
ipcMain.on('guard:choice', (e, kind) => { if (fromGuard(e)) choose(kind === 'anyway' ? 'anyway' : 'back'); });

app.on('twocode-license', () => media.guard(allowedToRun())); // bought or unlocked with a code: it starts right away

module.exports = { SITES, match: f => match(f), _config: c => { config = { ...config, ...c }; } };

// Keyboard shortcuts (Settings → Algemeen → Sneltoetsen): open the island, or jump straight to one of its pages.
// Saved in userData/shortcuts.json ({ action: keys }, '' = off); an action that is not in the file uses its default.
// Up to 1.2.0-beta.12 the pages were fixed on Ctrl+Alt+1–6. On many keyboards (Spanish, French, German…) Windows sends
// Ctrl+Alt for AltGr, so typing @ (AltGr+2 on a Spanish keyboard) opened the music page. The pages now default to
// Ctrl+Alt+Shift+1–6, and everything can be changed or turned off.
const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('node:path'), fs = require('node:fs');

const ACTIONS = [
  { id: 'island', nl: 'Eiland openen', en: 'Open the island', keys: 'CommandOrControl+Alt+T' },
  { id: 'tuck', nl: 'Eiland wegschuiven / terug', en: 'Tuck the island away / back', keys: 'CommandOrControl+Alt+H' },
  { id: 'talk', nl: 'Praat met Robo', en: 'Talk to Robo', keys: 'CommandOrControl+Alt+Space' },
  { id: 'home', nl: 'Home', en: 'Home', keys: 'CommandOrControl+Alt+Shift+1' },
  { id: 'spotify', nl: 'Muziek', en: 'Music', keys: 'CommandOrControl+Alt+Shift+2' },
  { id: 'claude', nl: 'Claude Code', en: 'Claude Code', keys: 'CommandOrControl+Alt+Shift+3' },
  { id: 'focus', nl: 'Focustimer', en: 'Focus timer', keys: 'CommandOrControl+Alt+Shift+4' },
  { id: 'clips', nl: 'Klembord', en: 'Clipboard', keys: 'CommandOrControl+Alt+Shift+5' },
  { id: 'note', nl: 'Notitie', en: 'Note', keys: 'CommandOrControl+Alt+Shift+6' },
  // Robo Plus: select text in any app → Robo rewrites it in place (buddy-main.cjs writeStart). Only taken while Plus is on,
  // so without Plus these keys stay free for other apps. Ctrl+Alt+Shift (not Ctrl+Alt: AltGr+W types | on Hungarian/Czech keys).
  { id: 'write', nl: 'Robo herschrijft je selectie', en: 'Robo rewrites your selection', keys: 'CommandOrControl+Alt+Shift+W', plus: true },
];
const MODS = ['CommandOrControl', 'Alt', 'Shift', 'Super'];
const KEY = /^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Space|Up|Down|Left|Right|num[0-9]|[-=[\]\\;',./`])$/;

const file = () => path.join(app.getPath('userData'), 'shortcuts.json');
let saved = null, paused = false, status = {};
const ours = new Set();

function load() {
  if (saved) return saved;
  try { const j = JSON.parse(fs.readFileSync(file(), 'utf8')); saved = j && typeof j === 'object' && !Array.isArray(j) ? j : {}; } catch { saved = {}; }
  return saved;
}
function store() { try { fs.writeFileSync(file(), JSON.stringify(saved, null, 2)); } catch {} }

/** The keys of an action now (its own choice, else the default; '' = off). */
function keysOf(id) {
  const a = ACTIONS.find(x => x.id === id); if (!a) return '';
  const s = load()[id];
  return typeof s === 'string' && (s === '' || valid(s)) ? s : a.keys;
}

/** An Electron accelerator we accept: one key with at least one of Ctrl/Alt/Shift/Win (an F-key may stand alone). */
function valid(keys) {
  if (keys === '') return true;
  if (typeof keys !== 'string' || keys.length > 60) return false;
  const parts = keys.split('+'), key = parts.pop();
  if (!KEY.test(key) || new Set(parts).size !== parts.length || !parts.every(m => MODS.includes(m))) return false;
  return parts.length > 0 || /^F\d+$/.test(key);
}

function run(id) {
  if (id === 'island') { app.twocodeOpenIsland?.(); return; } // island-window-main.js (it also wakes a stuck window)
  if (id === 'write') { app.twocodeWriteAnywhere?.(); return; } // buddy-main.cjs: it copies your selection first, before anything takes the focus
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL())) { w.webContents.send('extras:shortcut', id); if (id === 'talk') w.focus(); } // talking: the chat takes the keyboard
  }
}

function register() {
  for (const keys of ours) { try { globalShortcut.unregister(keys); } catch {} }
  ours.clear(); status = {};
  if (paused) return;                       // Settings is recording new keys: they must reach that window
  for (const a of ACTIONS) {
    const keys = keysOf(a.id);
    if (!keys) { status[a.id] = 'off'; continue; }
    if (a.plus && !app.twocodePlusOn?.()) { status[a.id] = 'plus'; continue; } // (robo-plus-main.cjs: registered once Plus is on)
    let ok = false;
    try { ok = globalShortcut.register(keys, () => run(a.id)); } catch {}
    status[a.id] = ok ? 'ok' : 'taken';     // false: another app has these keys already
    if (ok) ours.add(keys);
  }
  app.emit('twocode-shortcuts-changed');    // the tray menu shows the island's keys
  if (status.island === 'taken') taken();
}

// Another app already uses the island's keys (Ctrl+Alt+T): pressing them did nothing and Twenty-One never said why (a new
// customer: "I press Ctrl+Alt+T but it's not opening"). Said once for those keys (userData/keys-taken), with what to do.
let toldTaken = false;
function taken() {
  if (toldTaken || process.env.REC_OUT || process.env.REC_INVISIBLE) return; // test instances share the keys with the user's Twenty-One
  toldTaken = true;
  const file = path.join(app.getPath('userData'), 'keys-taken'), keys = keysOf('island').replace('CommandOrControl', 'Ctrl'), nl = /^nl/i.test(app.getLocale());
  try { if (fs.readFileSync(file, 'utf8') === keys) return; } catch {}
  try { fs.writeFileSync(file, keys); } catch {}
  require('./notice-main.cjs').notice('keysTaken', {
    title: nl ? `${keys} is al in gebruik` : `${keys} is already in use`,
    body: nl ? 'Een ander programma gebruikt deze toetsen. Klik op Robo bovenaan je scherm, of kies andere toetsen in Instellingen → Sneltoetsen.'
      : 'Another app uses these keys. Click Robo at the top of your screen, or pick other keys in Settings → Shortcuts.',
  }, () => app.twocodeOpenIsland?.());
}

/** For Settings: every action with its keys, its default and whether it works. */
// (a Plus action is only listed for a PC that has Plus: it is not public yet, beta 127)
function list() {
  return ACTIONS.filter(a => !a.plus || app.twocodePlusOn?.() === true).map(a => ({ id: a.id, nl: a.nl, en: a.en, keys: keysOf(a.id), def: a.keys, state: paused ? 'paused' : status[a.id] || 'off' }));
}
function set(id, keys) {
  if (!ACTIONS.some(a => a.id === id)) throw new Error('unknown');
  if (!valid(keys)) throw new Error('invalid');
  const other = keys && ACTIONS.find(a => a.id !== id && keysOf(a.id) === keys);
  if (other) throw new Error('dup:' + other.id);
  load()[id] = keys; store(); register();
  return list();
}
function reset() { saved = {}; store(); register(); return list(); }
let pauseTimer = null;
// while Settings records new keys; never longer than 30 s (if that window goes away halfway, the shortcuts come back)
function pause(on) {
  clearTimeout(pauseTimer);
  if (on) pauseTimer = setTimeout(() => pause(false), 30000);
  if (paused === !!on) return list();
  paused = !!on; register(); return list();
}

app.whenReady().then(register);
app.on('twocode-plus-changed', () => { if (!paused) register(); }); // Robo Plus switched on or off: its keys come or go
app.on('will-quit', () => { for (const keys of ours) { try { globalShortcut.unregister(keys); } catch {} } });

module.exports = { list, set, reset, pause, keysOf, valid, ACTIONS };

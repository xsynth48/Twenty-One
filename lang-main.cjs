// The new languages for what the main process shows itself: the tray menu and its dialogs. The windows have lang-pack.js. The island
// says which language you chose; it is kept in a file because the tray is built before the island is awake.
const { app, ipcMain } = require('electron');
const path = require('node:path'), fs = require('node:fs');

const CODES = ['es', 'pt', 'de', 'fr', 'hi'], listeners = [];
let code = '', words = null;
const file = () => path.join(app.getPath('userData'), 'ui-lang.txt');
function use(next) {
  code = CODES.includes(next) ? next : ''; words = null;
  if (!code) return;
  try { // lang/<code>.js is window.__twocodeLangData({...});
    const src = fs.readFileSync(path.join(__dirname, 'lang', code + '.js'), 'utf8');
    words = JSON.parse(src.slice(src.indexOf('(') + 1, src.lastIndexOf(')')));
  } catch { words = null; }
}
const changed = () => { for (const fn of listeners) { try { fn(); } catch {} } };
// (not before the app is ready: asking for the userData folder this early can fix it before main.js names the app)
app.whenReady().then(() => { try { use(fs.readFileSync(file(), 'utf8').trim()); if (code) changed(); } catch {} });
ipcMain.on('lang:main', (e, next) => {
  if (!/mascot\.html/.test(e.senderFrame?.url || '')) return;
  const was = code; use(next);
  if (code === was) return;
  try { fs.writeFileSync(file(), code); } catch {}
  changed();
});
module.exports = { t: s => words?.[s] ?? s, onChange: fn => listeners.push(fn), code: () => code };

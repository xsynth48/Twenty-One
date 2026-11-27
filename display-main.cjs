// Which screen the island lives on. A user works on his second screen and could only get the island there by making that
// screen the main one in Windows. Now: tray → Screen, or Settings → Island → Screen. Default: Windows' main screen.
// A chosen screen is remembered (userData/island-display.json); while it is not connected the main screen is used, and
// the island goes back to it when it is there again.
const { app, screen, ipcMain, BrowserWindow } = require('electron');
const { t: T } = require('./lang-main.cjs'); // the tray, dialogs and pages the main process shows itself
const fs = require('node:fs'), path = require('node:path');

let chosen; // undefined: not read yet; null: the main screen; else a display id (as text)
const file = () => path.join(app.getPath('userData'), 'island-display.json');
function read() {
  if (chosen !== undefined) return chosen;
  try { const id = JSON.parse(fs.readFileSync(file(), 'utf8')).id; chosen = id == null ? null : String(id); } catch { chosen = null; }
  return chosen;
}
/** The display the island is on now. */
function display() {
  const id = read();
  return (id != null && screen.getAllDisplays().find(d => String(d.id) === id)) || screen.getPrimaryDisplay();
}
/** Every screen, for the menus: { id ('main' or a display id), label, chosen }. */
function list(nl = false) {
  const primary = screen.getPrimaryDisplay().id, id = read(), all = screen.getAllDisplays();
  const here = all.some(d => String(d.id) === id) ? id : null;
  return [{ id: 'main', label: nl ? 'Hoofdscherm' : T('Main screen'), chosen: here == null },
    ...all.map((d, i) => ({ id: String(d.id), chosen: here === String(d.id),
      label: (nl ? 'Scherm ' : T('Screen') + ' ') + (i + 1) + (d.id === primary ? (nl ? ' (hoofd)' : ' ' + T('(main)')) : '') + ' · ' + Math.round(d.size.width * d.scaleFactor) + '×' + Math.round(d.size.height * d.scaleFactor) }))];
}
function choose(id) {
  chosen = id == null || id === 'main' ? null : String(id);
  try { fs.writeFileSync(file(), JSON.stringify({ id: chosen })); } catch {}
  app.emit('twocode-display-changed');
}

const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
ipcMain.handle('island:displays', (e, nl) => (fromIsland(e) ? list(Boolean(nl)) : []));
ipcMain.handle('island:set-display', (e, id) => {
  if (!fromIsland(e) || (id !== 'main' && !screen.getAllDisplays().some(d => String(d.id) === String(id)))) return false;
  choose(id); return true;
});
app.whenReady().then(() => { // a screen plugged in or out: the menus show the new list
  for (const ev of ['display-added', 'display-removed']) screen.on(ev, () => app.emit('twocode-displays-changed'));
});

module.exports = { display, list, choose, island: () => BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL())) };

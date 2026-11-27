// Twenty-One's own notifications, the main process's half (notify-ui.js is the other half, in the island): messages from here
// go to the island, which knows what you chose per message. Here live the card's own window and Windows' notifications,
// which only appear when you asked for them.
const { BrowserWindow, ipcMain, Notification, screen } = require('electron');
const path = require('node:path');

const island = () => BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
const fromCard = e => /notice\.html/.test(e.senderFrame?.url || '');
const testing = () => Boolean(process.env.REC_OUT || process.env.REC_INVISIBLE); // test instances run next to the user's own Twenty-One: never on their screen

let ready = false, token = 0;
const waiting = [], clicks = new Map(), toasts = new Set();

/** A message from the main process. id: see LIST in notify-ui.js; onClick: when you click on it. */
function notice(id, data = {}, onClick) {
  const msg = { id, token: 0, title: String(data.title || ''), body: String(data.body || ''), right: data.right ? String(data.right) : undefined };
  if (onClick) { msg.token = ++token; clicks.set(msg.token, onClick); if (clicks.size > 40) clicks.delete(clicks.keys().next().value); }
  if (ready && island()) island().webContents.send('notice:show', msg); else waiting.push(msg);
}
ipcMain.on('notice:ready', e => { if (!fromIsland(e)) return; ready = true; for (const m of waiting.splice(0)) e.sender.send('notice:show', m); });
ipcMain.on('notice:click', (e, t) => { if (!fromIsland(e)) return; const run = clicks.get(t); clicks.delete(t); try { run?.(); } catch {} });

// ---------- Windows' own: only for a message you set to Windows ----------
ipcMain.on('notice:windows', (e, d) => {
  if (!fromIsland(e) || testing() || !Notification.isSupported()) return;
  const n = new Notification({ title: String(d?.title || '').slice(0, 120), body: String(d?.body || '').slice(0, 300), silent: true, icon: path.join(__dirname, 'assets', 'icon-256.png') });
  toasts.add(n);
  n.on('close', () => toasts.delete(n)); n.on('failed', () => toasts.delete(n));
  n.on('click', () => { toasts.delete(n); island()?.webContents.send('notice:choice', { key: d?.key, index: -1 }); });
  n.show();
});

// ---------- the card: our own notification, for a message you set to Card (or when the island is out of sight) ----------
const CARD_W = 412; // 364 + room for its shadow (notice.html)
let card = null, data = null;
function place(height) {
  const d = screen.getDisplayMatching(island()?.getBounds() || screen.getPrimaryDisplay().bounds).workArea, x = { left: d.x, mid: Math.round(d.x + (d.width - CARD_W) / 2), right: d.x + d.width - CARD_W };
  const top = d.y + 8, bottom = d.y + d.height - height;
  const at = { top: [x.mid, top + 40], tl: [x.left, top], tr: [x.right, top], bl: [x.left, bottom], br: [x.right, bottom] }[data?.place] || [x.mid, top + 40];
  card.setBounds({ x: at[0], y: at[1], width: CARD_W, height });
}
ipcMain.on('notice:card', (e, d) => {
  if (!fromIsland(e) || testing()) return;
  data = d;
  if (card && !card.isDestroyed()) { card.webContents.send('notice:data', data); return; }
  card = new BrowserWindow({ width: CARD_W, height: 140, show: false, frame: false, transparent: true, resizable: false, movable: false, minimizable: false, maximizable: false,
    skipTaskbar: true, alwaysOnTop: true, focusable: false, hasShadow: false, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'notice-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  card.setAlwaysOnTop(true, 'screen-saver');
  card.loadFile(path.join(__dirname, 'notice.html'));
  card.webContents.once('did-finish-load', () => card?.webContents.send('notice:data', data));
  card.on('closed', () => { card = null; });
});
ipcMain.on('notice:size', (e, height) => {
  if (!fromCard(e) || !card) return;
  place(Math.max(60, Math.min(400, Math.round(Number(height) || 140))));
  card.showInactive(); // it never takes your keyboard away from what you are doing
});
ipcMain.on('notice:choice', (e, index) => {
  if (!fromCard(e)) return;
  try { card?.hide(); } catch {}
  island()?.webContents.send('notice:choice', { key: data?.key, index: Number(index) });
});
ipcMain.on('notice:card-close', e => { if (fromIsland(e)) { try { card?.hide(); } catch {} } });

module.exports = { notice };

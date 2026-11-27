// Game mode: while a game (full screen or borderless) or anything else runs full screen (a video, a presentation), the
// island steps aside completely: its window is hidden, so it draws nothing (0 fps) and Windows can hand the screen to the
// game directly (a see-through window on top of a game can make the game itself slower). It comes back by itself when
// you leave. A user saw Twenty-One on top of Rainbow Six Siege, and their fps counter picked up the island's own frames.
// Windows says when something runs full screen (SHQueryUserNotificationState, the same check as "do not disturb while
// gaming"); media-session.ps1 asks it every second and media-main.cjs passes it on as 'twocode-fullscreen'. The island
// decides (Settings → Algemeen → Game mode, tuck-ui.js) and asks for the window to be hidden or shown.
// Only a full-screen app on the island's own screen counts: media-session.ps1 also says on which screen (real pixels
// "x,y,w,h"). A user with two screens lost the island whenever a certain app ran full screen on the other one.
const { app, BrowserWindow, ipcMain, screen } = require('electron');

// (beta 79) A short "full screen" from Windows no longer hides the island (a customer saw Robo go and come back "randomly, even when
// nothing is happening"): it has to last SETTLE_ON, and a game has to be gone for SETTLE_OFF, before the island reacts.
const SETTLE_ON = 3000, SETTLE_OFF = 1500;
// (beta 97) How high the island stands. Electron puts a 'floating' window just below the taskbar, but during a full-screen game
// Windows drops the taskbar itself below the game, so the island went with it: every few seconds backOnTop pushed it behind
// Roblox (two customers, Game mode off, borderless). 'pop-up-menu' is simply on top, without the taskbar.
const ON_TOP = 'pop-up-menu';
let full = false, raw = { on: false, at: '' }, settling = null;
const island = () => BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
function islandScreen(at) {
  const [x, y, w, h] = String(at || '').split(',').map(Number), win = island();
  if (!(w > 0 && h > 0) || !win) return true; // not known (an older helper): as before
  try {
    const mid = screen.screenToDipPoint({ x: x + w / 2, y: y + h / 2 });
    return screen.getDisplayNearestPoint(mid).id === screen.getDisplayMatching(win.getBounds()).id;
  } catch { return true; }
}
function update() {
  const on = raw.on && islandScreen(raw.at);
  clearTimeout(settling); settling = null;
  if (on === full) return;
  settling = setTimeout(() => { settling = null; full = on; island()?.webContents.send('game-mode:changed', full); }, on ? SETTLE_ON : SETTLE_OFF);
}
app.on('twocode-fullscreen', (on, at) => { raw = { on: Boolean(on), at: String(at || '') }; update(); });
app.on('twocode-display-changed', () => setTimeout(update, 300)); // the island moved to another screen (display-main.cjs)

ipcMain.on('game-mode:hide', (e, hide) => {
  const win = island();
  if (!win || e.sender !== win.webContents) return;
  if (process.env.REC_OUT) { console.log('REC GAME', hide ? 'hide' : 'show'); return; } // recordings: a hidden window draws no frames, the take would wait forever
  if (hide) { if (win.isVisible()) win.hide(); return; }
  if (!win.isVisible()) { win.showInactive(); win.setAlwaysOnTop(true, ON_TOP); }
});
ipcMain.handle('game-mode:get', e => (island()?.webContents === e.sender ? full : false));

// (beta 80) Another always-on-top window (or Chrome going full screen and back) can end up over the island, with nothing to put it
// back: every few seconds it takes its place again, without taking the keyboard. Not while Robo's own layer or the focus guard is
// up: those belong above it. (The same call as at the start of the app; moveTop also passes a position and size.)
// Also during a full-screen game: Game mode hides the window then, so a visible one means Game mode is off or you opened it. A
// customer with Game mode off lost the island behind Roblox after every restart, until switching it on and off put it back on top.
function backOnTop() {
  try {
    const win = island();
    if (!win || !win.isVisible()) return;
    if (BrowserWindow.getAllWindows().some(w => w !== win && !w.isDestroyed() && w.isVisible() && w.isAlwaysOnTop())) return;
    win.setAlwaysOnTop(true, ON_TOP);
  } catch {}
}
setInterval(backOnTop, 5000).unref?.();

module.exports = { fullscreen: () => full, backOnTop, ON_TOP };
